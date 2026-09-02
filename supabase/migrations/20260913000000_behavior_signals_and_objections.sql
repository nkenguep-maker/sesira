-- SESIRA Core Workflow — behavior signals + advanced objections (C20).
--
-- Two pieces:
--
--   1. `staleness_signals` — an explainable per-quote prioritization
--      signal. NOT a "hot lead" score; NOT a "click = interest" one.
--      A pure function of (age since sent, days since last inbound,
--      amount band, quote status, opt-out / complaint state). Every
--      score can render "WHY this is high priority" from the same
--      inputs.
--   2. `reply_objections` — structured objection classification
--      attached to an inbound message. Extends the existing
--      REPLY_INTENTS with an ORTHOGONAL objection class so a reply
--      classified as `PRICE_OBJECTION` can also carry an objection
--      row `{ class: 'PRICE', severity: 'HIGH', extracted_amount }`.
--      Sensitive classes (PRICE, COMPLAINT, LEGAL, FINANCING_DECLINED)
--      auto-emit an Attention item on insert.
--
-- No `open/view tracking` in C20. Per the driver invariant, open =
-- interest is FALSE. If a future integration surfaces reliable
-- open events, they should feed the staleness signal as a WEAK
-- input alongside age/inactivity, never as a primary factor.

-- =========================================================================
-- 1. staleness_signals — deterministic explainable score
-- =========================================================================
-- Implemented as a function that reads live data rather than a
-- materialized column. Rationale: the score depends on time-since-X
-- and would be stale the moment it's persisted. A caller batches
-- the compute for a page render; per-row costs are cheap (indexed
-- reads on quotes / messages).

create or replace function public.compute_staleness_signal(
  target_organization_id uuid,
  target_quote_id        uuid,
  target_now             timestamptz
)
returns table (
  score           integer,
  band            text,
  factors         jsonb,
  explanation     text
)
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  q record;
  last_inbound timestamptz;
  age_days integer;
  inactivity_days integer;
  amount_band text;
  computed_score integer := 0;
  computed_factors jsonb := '{}'::jsonb;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'compute_staleness_signal: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;

  select
    id, status, amount, sent_at, opted_out_at, automation_paused_at,
    automation_pause_reason, opportunity_id
  into q
  from public.quotes
  where id = target_quote_id
    and organization_id = target_organization_id;

  if q is null then
    return;
  end if;

  select max(received_at) into last_inbound
  from public.messages
  where organization_id = target_organization_id
    and quote_id = target_quote_id
    and direction = 'INBOUND';

  -- Age since sent (0 if never sent).
  if q.sent_at is not null then
    age_days := greatest(0, extract(day from target_now - q.sent_at)::integer);
  else
    age_days := 0;
  end if;

  -- Days since last inbound (or sent, if no inbound).
  if last_inbound is not null then
    inactivity_days := greatest(0, extract(day from target_now - last_inbound)::integer);
  else
    inactivity_days := age_days;
  end if;

  -- Amount band (deterministic buckets — not a threshold, just a
  --   coarse bucket for score weighting).
  if q.amount is null then amount_band := 'unknown';
  elsif q.amount < 500 then amount_band := 'low';
  elsif q.amount < 5000 then amount_band := 'medium';
  else amount_band := 'high';
  end if;

  -- Score assembly. Each factor contributes; the total is the score.
  --   * age_days: +1 per day, capped at 60 (older than that is
  --     probably terminal anyway).
  --   * inactivity_days: +1 per day, capped at 30.
  --   * amount_band: high +20, medium +10, low +0, unknown +5.
  --   * status: FOLLOWING_UP +10, REPLIED +5, NEEDS_HUMAN +15,
  --     SENT +2, DRAFT +0, terminal +0.
  --   * opt-out or complaint: neutralize (score := 0).
  computed_score :=
      least(age_days, 60)
    + least(inactivity_days, 30)
    + case amount_band
        when 'high' then 20
        when 'medium' then 10
        when 'unknown' then 5
        else 0
      end
    + case q.status
        when 'NEEDS_HUMAN' then 15
        when 'FOLLOWING_UP' then 10
        when 'REPLIED' then 5
        when 'SENT' then 2
        else 0
      end;

  if q.opted_out_at is not null
     or (q.automation_paused_at is not null and q.automation_pause_reason = 'COMPLAINT')
     or q.status in ('WON', 'LOST', 'EXPIRED') then
    computed_score := 0;
  end if;

  -- Bands are stable: 0 => none, 1..30 => low, 31..60 => medium,
  --   61+ => high. The band NEVER unlocks an autonomous action; it
  --   only orders the operator's inbox.
  if computed_score = 0 then band := 'none';
  elsif computed_score <= 30 then band := 'low';
  elsif computed_score <= 60 then band := 'medium';
  else band := 'high';
  end if;

  computed_factors := jsonb_build_object(
    'age_days', age_days,
    'inactivity_days', inactivity_days,
    'amount_band', amount_band,
    'status', q.status,
    'opted_out', q.opted_out_at is not null,
    'complaint_paused', q.automation_pause_reason = 'COMPLAINT',
    'terminal', q.status in ('WON', 'LOST', 'EXPIRED')
  );

  score := computed_score;
  factors := computed_factors;
  explanation := format(
    'sent %s day(s) ago, silent for %s day(s), amount band %s, status %s',
    age_days, inactivity_days, amount_band, q.status
  );
  return next;
end;
$$;

revoke all on function public.compute_staleness_signal(uuid, uuid, timestamptz) from public, anon;
grant execute on function public.compute_staleness_signal(uuid, uuid, timestamptz) to authenticated, service_role;

comment on function public.compute_staleness_signal(uuid, uuid, timestamptz) is
  'Explainable staleness signal for a quote. Pure function of age/inactivity/amount/status/opt-out. Returns score + band + factors + explanation. NEVER unlocks an autonomous action.';

-- =========================================================================
-- 2. reply_objections table
-- =========================================================================
create table public.reply_objections (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  message_id        uuid not null,
  quote_id          uuid,
  class             text not null
    check (class in ('PRICE', 'TIMING', 'COMPETITOR', 'FINANCING_DECLINED',
                     'TECHNICAL_QUESTION', 'NO_DECISION', 'COMPLAINT',
                     'NOT_INTERESTED', 'LEGAL', 'OTHER')),
  severity          text not null default 'NORMAL'
    check (severity in ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  extracted_amount  numeric(12,2) check (extracted_amount is null or extracted_amount >= 0),
  extracted_currency text check (extracted_currency is null or char_length(extracted_currency) between 3 and 3),
  summary           text check (summary is null or length(summary) <= 500),
  confidence        numeric(4,3) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  metadata          jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at        timestamptz not null default now(),
  -- messages has no (id, organization_id) compound unique in the
  --   initial schema, so a simple FK on id is used. RLS on the
  --   objection row is authoritative; a cross-tenant caller cannot
  --   read the parent message anyway.
  foreign key (message_id) references public.messages(id) on delete cascade,
  foreign key (quote_id, organization_id) references public.quotes(id, organization_id) on delete set null,
  unique (organization_id, message_id, class)
);

comment on table public.reply_objections is
  'Structured objections attached to an inbound message. Multiple classes per message allowed (a price + timing objection coexist). Unique per (message, class) so a replay does not duplicate. Sensitive classes emit an Attention on insert.';

create index reply_objections_org_class_idx on public.reply_objections (organization_id, class);
create index reply_objections_quote_idx on public.reply_objections (organization_id, quote_id) where quote_id is not null;

alter table public.reply_objections enable row level security;

create policy reply_objections_select on public.reply_objections
  for select to authenticated
  using (private.is_organization_member(organization_id));

grant select on public.reply_objections to authenticated;
grant select, insert on public.reply_objections to service_role;

-- =========================================================================
-- 3. record_reply_objection — service_role only + Attention on sensitive
-- =========================================================================
create or replace function public.record_reply_objection(
  target_organization_id uuid,
  target_message_id      uuid,
  target_quote_id        uuid,
  target_class           text,
  target_severity        text,
  target_extracted_amount numeric,
  target_extracted_currency text,
  target_summary         text,
  target_confidence      numeric
)
returns table (id uuid, created boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id      uuid;
  existing_id uuid;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'record_reply_objection: only service_role may record objections'
      using errcode = '42501';
  end if;
  if target_class not in (
    'PRICE', 'TIMING', 'COMPETITOR', 'FINANCING_DECLINED',
    'TECHNICAL_QUESTION', 'NO_DECISION', 'COMPLAINT',
    'NOT_INTERESTED', 'LEGAL', 'OTHER'
  ) then
    raise exception 'record_reply_objection: unknown class %', target_class
      using errcode = '22023';
  end if;

  insert into public.reply_objections (
    organization_id, message_id, quote_id, class, severity,
    extracted_amount, extracted_currency, summary, confidence
  )
  values (
    target_organization_id, target_message_id, target_quote_id, target_class,
    coalesce(target_severity, 'NORMAL'),
    target_extracted_amount, target_extracted_currency,
    target_summary, target_confidence
  )
  on conflict (organization_id, message_id, class) do nothing
  returning reply_objections.id into new_id;

  if new_id is not null then
    -- Sensitive classes escalate. Use insert_attention_once for
    --   dedup on (message, class).
    if target_class in ('PRICE', 'COMPLAINT', 'LEGAL', 'FINANCING_DECLINED') then
      perform public.insert_attention_once(
        target_organization_id,
        'attention:reply_objection:' || target_message_id::text || ':' || target_class,
        'SALES',
        'REPLY_NEEDS_REVIEW',
        format('Objection %s détectée', target_class),
        case when coalesce(target_severity, 'NORMAL') = 'URGENT' then 'URGENT' else 'HIGH' end,
        'message',
        target_message_id,
        target_summary,
        format('Traiter l''objection %s', target_class),
        null, null,
        jsonb_build_object(
          'objection_id', new_id,
          'objection_class', target_class,
          'objection_severity', coalesce(target_severity, 'NORMAL')
        )
      );
    end if;

    id := new_id;
    created := true;
    return next;
    return;
  end if;

  select reply_objections.id into existing_id
  from public.reply_objections
  where organization_id = target_organization_id
    and message_id = target_message_id
    and class = target_class;

  id := existing_id;
  created := false;
  return next;
  return;
end;
$$;

revoke all on function public.record_reply_objection(uuid, uuid, uuid, text, text, numeric, text, text, numeric) from public, anon, authenticated;
grant execute on function public.record_reply_objection(uuid, uuid, uuid, text, text, numeric, text, text, numeric) to service_role;

comment on function public.record_reply_objection(uuid, uuid, uuid, text, text, numeric, text, text, numeric) is
  'Replay-safe objection insert (service_role only). Dedup on (org, message, class); a re-classification with a different severity is allowed to insert a different class but not overwrite an existing one. Sensitive classes (PRICE / COMPLAINT / LEGAL / FINANCING_DECLINED) auto-emit an APPROVAL/REVIEW Attention scoped to (message, class).';
