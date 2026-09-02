-- SESIRA Core Workflow — quote drafting + seasonal reactivation (C23).
--
-- Two related pieces:
--
--   1. Quote drafting: `quotes.draft_gaps jsonb` — the list of
--      missing operational fields the drafter identified. A quote
--      is send-eligible only when `draft_gaps` is `[]` or NULL AND
--      status has moved past DRAFT. The AI drafter (a future
--      caller) fills `draft_gaps` with the fields it could not
--      infer; the operator resolves them by hand.
--
--      Deterministic gates ONLY. AI never invents pricing,
--      technical claims, discounts, or regulatory content. A gap
--      like `{ "field": "amount", "reason": "no pricing in
--      request" }` is written to `draft_gaps`; the operator sets
--      the amount before status leaves DRAFT.
--
--   2. Seasonal reactivation: `dormant_opportunities` — read
--      function returning opportunities that are non-terminal,
--      inactive for N days, and clear of opt-out / complaint
--      signals. Shadow-first by design — the function does not
--      transition anything; the caller (an ops screen or future
--      scheduler) uses the output to surface candidates for
--      operator review.
--
-- DOCTRINE INVARIANTS:
--
--   * No state machine change on `quotes.status`. `draft_gaps`
--     is a soft signal for the operator; the existing DRAFT →
--     SENT transition still requires the operator's action.
--   * No provider effect from either piece.
--   * Reactivation candidate list EXCLUDES quotes with:
--       - opted_out_at set, OR
--       - automation_pause_reason = 'COMPLAINT', OR
--       - status in (WON, LOST, EXPIRED),
--     so an opt-out or a complaint permanently removes the
--     opportunity from reactivation.

-- =========================================================================
-- 1. quotes.draft_gaps
-- =========================================================================
alter table public.quotes
  add column draft_gaps jsonb not null default '[]'::jsonb
    check (jsonb_typeof(draft_gaps) = 'array');

comment on column public.quotes.draft_gaps is
  'Missing operational fields the drafter identified. Array of { field, reason } objects. Empty when the draft is send-ready. AI must NEVER fill this with an invented value.';

create index quotes_draft_gaps_pending_idx
  on public.quotes (organization_id, created_at desc)
  where status = 'DRAFT' and jsonb_array_length(draft_gaps) > 0;

-- =========================================================================
-- 2. record_quote_draft_gaps — write the AI/analyzer output
-- =========================================================================
create or replace function public.record_quote_draft_gaps(
  target_organization_id uuid,
  target_quote_id        uuid,
  target_draft_gaps      jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'record_quote_draft_gaps: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if target_draft_gaps is null or jsonb_typeof(target_draft_gaps) <> 'array' then
    raise exception 'record_quote_draft_gaps: draft_gaps must be a JSON array (got %)', jsonb_typeof(target_draft_gaps)
      using errcode = '22023';
  end if;

  update public.quotes
    set draft_gaps = target_draft_gaps,
        updated_at = now()
  where id = target_quote_id
    and organization_id = target_organization_id
    and status = 'DRAFT';

  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'quote.draft_gaps_recorded',
      'quote', target_quote_id,
      jsonb_build_object('gap_count', jsonb_array_length(target_draft_gaps))
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.record_quote_draft_gaps(uuid, uuid, jsonb) from public, anon;
grant execute on function public.record_quote_draft_gaps(uuid, uuid, jsonb) to authenticated, service_role;

comment on function public.record_quote_draft_gaps(uuid, uuid, jsonb) is
  'Persist the drafter output (list of missing operational fields). Only mutates DRAFT quotes. Records audit_log on transition. Never touches amount/status.';

-- =========================================================================
-- 3. dormant_opportunities — reactivation candidate detector
-- =========================================================================
create or replace function public.dormant_opportunities(
  target_organization_id uuid,
  target_dormant_since_days integer
)
returns table (
  opportunity_id     uuid,
  customer_id        uuid,
  commercial_state   text,
  estimated_value    numeric,
  currency           text,
  opened_at          timestamptz,
  last_activity_at   timestamptz,
  dormant_days       integer
)
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  cutoff timestamptz;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'dormant_opportunities: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if target_dormant_since_days is null or target_dormant_since_days < 1 then
    raise exception 'dormant_opportunities: dormant_since_days must be >= 1 (got %)', target_dormant_since_days
      using errcode = '22023';
  end if;
  cutoff := now() - make_interval(days => target_dormant_since_days);

  return query
  with per_opp_activity as (
    select
      o.id as opp_id,
      o.customer_id,
      o.commercial_state,
      o.estimated_value,
      o.currency,
      o.opened_at,
      greatest(
        o.opened_at,
        coalesce((
          select max(q.updated_at)
          from public.quotes q
          where q.organization_id = target_organization_id
            and q.opportunity_id = o.id
        ), o.opened_at),
        coalesce((
          select max(m.received_at)
          from public.messages m
          join public.quotes q on q.id = m.quote_id
          where m.organization_id = target_organization_id
            and m.direction = 'INBOUND'
            and q.opportunity_id = o.id
        ), o.opened_at)
      ) as last_activity,
      -- Exclusion signals: any related quote opted-out or COMPLAINT
      --   permanently removes the opportunity from reactivation.
      exists (
        select 1 from public.quotes q
        where q.organization_id = target_organization_id
          and q.opportunity_id = o.id
          and (q.opted_out_at is not null
               or q.automation_pause_reason = 'COMPLAINT')
      ) as has_excluded
    from public.opportunities o
    where o.organization_id = target_organization_id
      and o.commercial_state not in ('WON', 'LOST', 'CANCELLED')
  )
  select
    opp_id,
    customer_id,
    commercial_state,
    estimated_value,
    currency,
    opened_at,
    last_activity as last_activity_at,
    extract(day from (now() - last_activity))::integer as dormant_days
  from per_opp_activity
  where has_excluded = false
    and last_activity <= cutoff
  order by last_activity asc;
end;
$$;

revoke all on function public.dormant_opportunities(uuid, integer) from public, anon;
grant execute on function public.dormant_opportunities(uuid, integer) to authenticated, service_role;

comment on function public.dormant_opportunities(uuid, integer) is
  'Read function returning reactivation candidates: non-terminal opportunities inactive for >= dormant_since_days AND clear of opt-out/complaint signals on any related quote. Shadow-first — never transitions anything.';
