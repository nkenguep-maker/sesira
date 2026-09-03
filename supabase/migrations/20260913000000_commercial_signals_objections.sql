-- SESIRA Core — C20 explainable commercial signals + structured objections.
-- There is deliberately NO lead score and NO email-open-as-interest primitive.

create table public.commercial_objections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  message_id uuid not null references public.messages(id) on delete cascade,
  quote_id uuid references public.quotes(id) on delete set null,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  kind text not null check (kind in ('PRICE','TIMING','COMPETITION','BUDGET','TECHNICAL','COMPLAINT','LEGAL','CONTRACTUAL','FINANCIAL','OTHER','UNCERTAIN')),
  summary text not null check (length(summary) between 1 and 500),
  evidence text check (evidence is null or length(evidence) <= 1000),
  confidence numeric(4,3) not null check (confidence between 0 and 1),
  source text not null check (source in ('AI','HUMAN')),
  sensitive boolean not null default false,
  status text not null default 'OPEN' check (status in ('OPEN','RESOLVED','DISMISSED')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (organization_id, message_id)
);

create index commercial_objections_opportunity_open_idx
  on public.commercial_objections (organization_id, opportunity_id, updated_at desc)
  where status = 'OPEN';

alter table public.commercial_objections enable row level security;
create policy commercial_objections_select on public.commercial_objections
  for select to authenticated
  using (private.is_organization_member(organization_id));

revoke all on public.commercial_objections from public, anon, authenticated;
grant select on public.commercial_objections to authenticated;
grant select, insert, update, delete on public.commercial_objections to service_role;

create or replace function private.is_sensitive_objection(target_kind text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select target_kind in ('PRICE','COMPLAINT','LEGAL','CONTRACTUAL','FINANCIAL');
$$;
revoke all on function private.is_sensitive_objection(text) from public, anon, authenticated, service_role;

create or replace function private.assert_objection_kind(target_kind text)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if target_kind not in ('PRICE','TIMING','COMPETITION','BUDGET','TECHNICAL','COMPLAINT','LEGAL','CONTRACTUAL','FINANCIAL','OTHER','UNCERTAIN') then
    raise exception 'invalid commercial objection kind: %', target_kind using errcode = '22023';
  end if;
end;
$$;
revoke all on function private.assert_objection_kind(text) from public, anon, authenticated, service_role;

-- AI synchronization boundary. A human correction is authoritative and is never overwritten by AI.
create or replace function public.sync_commercial_objection_from_ai(
  target_organization_id uuid,
  target_message_id uuid,
  target_kind text,
  target_summary text,
  target_evidence text,
  target_confidence numeric
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  quote_ref uuid;
  opportunity_ref uuid;
  existing_source text;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'sync_commercial_objection_from_ai: service_role required' using errcode = '42501';
  end if;

  select m.quote_id, q.opportunity_id
    into quote_ref, opportunity_ref
  from public.messages m
  left join public.quotes q
    on q.id = m.quote_id and q.organization_id = m.organization_id
  where m.id = target_message_id
    and m.organization_id = target_organization_id
    and m.direction = 'INBOUND';
  if not found then
    raise exception 'sync_commercial_objection_from_ai: inbound message not found' using errcode = '22023';
  end if;

  select source into existing_source
  from public.commercial_objections
  where organization_id = target_organization_id and message_id = target_message_id;

  if existing_source = 'HUMAN' then
    return false;
  end if;

  if target_kind is null then
    update public.commercial_objections
      set status = 'DISMISSED', resolved_at = now(), updated_at = now()
    where organization_id = target_organization_id
      and message_id = target_message_id
      and source = 'AI';
    return true;
  end if;

  perform private.assert_objection_kind(target_kind);
  if target_summary is null or length(trim(target_summary)) = 0 or length(target_summary) > 500 then
    raise exception 'sync_commercial_objection_from_ai: summary required <= 500 chars' using errcode = '22023';
  end if;
  if target_evidence is not null and length(target_evidence) > 1000 then
    raise exception 'sync_commercial_objection_from_ai: evidence too long' using errcode = '22023';
  end if;
  if target_confidence is null or target_confidence < 0 or target_confidence > 1 then
    raise exception 'sync_commercial_objection_from_ai: confidence must be in [0,1]' using errcode = '22023';
  end if;

  insert into public.commercial_objections (
    organization_id, message_id, quote_id, opportunity_id, kind,
    summary, evidence, confidence, source, sensitive, status,
    created_by, resolved_at
  ) values (
    target_organization_id, target_message_id, quote_ref, opportunity_ref, target_kind,
    trim(target_summary), nullif(trim(coalesce(target_evidence, '')), ''), target_confidence,
    'AI', private.is_sensitive_objection(target_kind), 'OPEN', null, null
  )
  on conflict (organization_id, message_id) do update
    set quote_id = excluded.quote_id,
        opportunity_id = excluded.opportunity_id,
        kind = excluded.kind,
        summary = excluded.summary,
        evidence = excluded.evidence,
        confidence = excluded.confidence,
        source = 'AI',
        sensitive = excluded.sensitive,
        status = 'OPEN',
        resolved_at = null,
        updated_at = now();
  return true;
end;
$$;
revoke all on function public.sync_commercial_objection_from_ai(uuid, uuid, text, text, text, numeric)
  from public, anon, authenticated;
grant execute on function public.sync_commercial_objection_from_ai(uuid, uuid, text, text, text, numeric)
  to service_role;

-- Human correction/confirmation. This may add, change or dismiss an objection.
create or replace function public.correct_commercial_objection(
  target_organization_id uuid,
  target_message_id uuid,
  target_kind text,
  target_summary text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  quote_ref uuid;
  opportunity_ref uuid;
  attention_key text;
  low_confidence_key text;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'correct_commercial_objection: organization membership required' using errcode = '42501';
  end if;

  select m.quote_id, q.opportunity_id
    into quote_ref, opportunity_ref
  from public.messages m
  left join public.quotes q
    on q.id = m.quote_id and q.organization_id = m.organization_id
  where m.id = target_message_id
    and m.organization_id = target_organization_id
    and m.direction = 'INBOUND';
  if not found then
    return false;
  end if;

  attention_key := 'attention:reply_objection:' || target_message_id::text;
  low_confidence_key := 'attention:reply_low_confidence:' || target_message_id::text;

  if target_kind is null then
    update public.commercial_objections
      set status = 'DISMISSED', source = 'HUMAN', confidence = 1,
          created_by = (select auth.uid()), resolved_at = now(), updated_at = now()
    where organization_id = target_organization_id and message_id = target_message_id;
    update public.attention_items
      set status = 'RESOLVED'
    where organization_id = target_organization_id
      and idempotency_key in (attention_key, low_confidence_key)
      and status in ('OPEN','IN_PROGRESS');
    perform public.record_audit_log(target_organization_id, 'commercial_objection.dismissed', 'message', target_message_id, jsonb_build_object('source','HUMAN'));
    return true;
  end if;

  perform private.assert_objection_kind(target_kind);
  if target_summary is null or length(trim(target_summary)) = 0 or length(target_summary) > 500 then
    raise exception 'correct_commercial_objection: summary required <= 500 chars' using errcode = '22023';
  end if;

  insert into public.commercial_objections (
    organization_id, message_id, quote_id, opportunity_id, kind,
    summary, evidence, confidence, source, sensitive, status, created_by, resolved_at
  ) values (
    target_organization_id, target_message_id, quote_ref, opportunity_ref, target_kind,
    trim(target_summary), null, 1, 'HUMAN', private.is_sensitive_objection(target_kind), 'OPEN',
    (select auth.uid()), null
  )
  on conflict (organization_id, message_id) do update
    set quote_id = excluded.quote_id,
        opportunity_id = excluded.opportunity_id,
        kind = excluded.kind,
        summary = excluded.summary,
        evidence = null,
        confidence = 1,
        source = 'HUMAN',
        sensitive = excluded.sensitive,
        status = 'OPEN',
        created_by = excluded.created_by,
        resolved_at = null,
        updated_at = now();

  update public.attention_items
    set status = 'RESOLVED'
  where organization_id = target_organization_id
    and idempotency_key = low_confidence_key
    and status in ('OPEN','IN_PROGRESS');

  if private.is_sensitive_objection(target_kind) then
    perform public.insert_attention_once(
      target_organization_id,
      attention_key,
      'SALES',
      'OBJECTION_NEEDS_REVIEW',
      'Objection sensible à traiter',
      'HIGH',
      'message',
      target_message_id,
      'Un humain a confirmé une objection qui ne doit pas être traitée automatiquement.',
      'Décider de la réponse ou de la prochaine action',
      null,
      null,
      jsonb_build_object('schema_version',1,'message_id',target_message_id,'opportunity_id',opportunity_ref,'objection_kind',target_kind,'human_required',true)
    );
    update public.attention_items
      set status = case when status in ('RESOLVED','DISMISSED') then 'OPEN' else status end,
          priority = 'HIGH',
          reason = 'OBJECTION_NEEDS_REVIEW'
    where organization_id = target_organization_id and idempotency_key = attention_key;
  else
    update public.attention_items
      set status = 'RESOLVED'
    where organization_id = target_organization_id
      and idempotency_key = attention_key
      and status in ('OPEN','IN_PROGRESS');
  end if;

  perform public.record_audit_log(
    target_organization_id,
    'commercial_objection.corrected',
    'message',
    target_message_id,
    jsonb_build_object('kind',target_kind,'summary',trim(target_summary),'source','HUMAN','sensitive',private.is_sensitive_objection(target_kind))
  );
  return true;
end;
$$;
revoke all on function public.correct_commercial_objection(uuid, uuid, text, text) from public, anon;
grant execute on function public.correct_commercial_objection(uuid, uuid, text, text) to authenticated;

-- Explainable, scoreless read model. The explicit email_open_signal_used=false
-- is a contract: opens can be displayed elsewhere as delivery telemetry but never
-- as evidence of buying interest.
create or replace function public.get_opportunity_commercial_snapshot(
  target_organization_id uuid,
  target_opportunity_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  snapshot jsonb;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'get_opportunity_commercial_snapshot: organization membership required' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.opportunities o
    where o.id = target_opportunity_id and o.organization_id = target_organization_id
  ) then
    return null;
  end if;

  select jsonb_build_object(
    'opportunity', jsonb_build_object(
      'id', o.id,
      'opened_at', o.opened_at,
      'updated_at', o.updated_at,
      'commercial_state', o.commercial_state,
      'estimated_value', o.estimated_value,
      'currency', o.currency
    ),
    'latest_quote', (
      select jsonb_build_object(
        'id', q.id,
        'status', q.status,
        'sent_at', q.sent_at,
        'updated_at', q.updated_at,
        'next_action_at', q.next_action_at,
        'automation_paused_at', q.automation_paused_at,
        'automation_pause_reason', q.automation_pause_reason,
        'opted_out_at', q.opted_out_at
      )
      from public.quotes q
      where q.organization_id = target_organization_id
        and q.opportunity_id = o.id
        and q.is_current_revision = true
      order by q.updated_at desc
      limit 1
    ),
    'last_inbound', (
      select jsonb_build_object(
        'message_id', m.id,
        'received_at', m.received_at,
        'intent', m.intent,
        'confidence', m.confidence
      )
      from public.messages m
      join public.quotes q on q.id = m.quote_id and q.organization_id = m.organization_id
      where m.organization_id = target_organization_id
        and q.opportunity_id = o.id
        and m.direction = 'INBOUND'
      order by coalesce(m.received_at, m.created_at) desc
      limit 1
    ),
    'open_objections', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', co.id,
        'message_id', co.message_id,
        'kind', co.kind,
        'summary', co.summary,
        'evidence', co.evidence,
        'confidence', co.confidence,
        'source', co.source,
        'sensitive', co.sensitive,
        'updated_at', co.updated_at
      ) order by co.updated_at desc)
      from public.commercial_objections co
      where co.organization_id = target_organization_id
        and co.opportunity_id = o.id
        and co.status = 'OPEN'
    ), '[]'::jsonb),
    'email_open_signal_used', false
  ) into snapshot
  from public.opportunities o
  where o.id = target_opportunity_id and o.organization_id = target_organization_id;

  return snapshot;
end;
$$;
revoke all on function public.get_opportunity_commercial_snapshot(uuid, uuid) from public, anon;
grant execute on function public.get_opportunity_commercial_snapshot(uuid, uuid) to authenticated;
