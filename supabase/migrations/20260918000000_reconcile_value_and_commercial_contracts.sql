-- SESIRA live parity — reconcile current C19/C20 contracts after historical
-- migrations with the same version numbers were already applied to production.
-- Forward-only and idempotent: safe on both the historical live schema and a
-- fresh schema that already contains the current C19/C20 objects.

-- =========================================================================
-- C19 — organization-owned sold-not-scheduled policy
-- =========================================================================
alter table public.opportunities
  add column if not exists operational_next_step_at timestamptz,
  add column if not exists operational_next_step_kind text,
  add column if not exists operational_next_step_source text,
  add column if not exists operational_next_step_updated_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'opportunities_operational_next_step_kind_check') then
    alter table public.opportunities
      add constraint opportunities_operational_next_step_kind_check
      check (operational_next_step_kind is null or length(operational_next_step_kind) between 1 and 80);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'opportunities_operational_next_step_source_check') then
    alter table public.opportunities
      add constraint opportunities_operational_next_step_source_check
      check (operational_next_step_source is null or operational_next_step_source in ('MANUAL', 'INTERVENTION', 'EXTERNAL', 'SYSTEM'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'opportunities_operational_next_step_consistency_check') then
    alter table public.opportunities
      add constraint opportunities_operational_next_step_consistency_check
      check (
        (operational_next_step_at is null and operational_next_step_kind is null)
        or
        (operational_next_step_at is not null and operational_next_step_kind is not null)
      );
  end if;
end;
$$;

create index if not exists opportunities_won_without_next_step_idx
  on public.opportunities (organization_id, closed_at)
  where commercial_state = 'WON' and operational_next_step_at is null;

create or replace function private.get_sold_not_scheduled_policy(target_organization_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(config #> '{value_policies,sold_not_scheduled}', '{}'::jsonb)
  from public.organizations
  where id = target_organization_id;
$$;
revoke all on function private.get_sold_not_scheduled_policy(uuid)
  from public, anon, authenticated, service_role;

create or replace function private.sync_sold_not_scheduled_attention(target_opportunity_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  opp record;
  policy jsonb;
  enabled boolean := false;
  grace_hours integer;
  high_value_amount numeric;
  policy_currency text;
  policy_note text;
  is_high_value boolean := false;
  attention_key text;
  due_at_value timestamptz;
begin
  select o.id, o.organization_id, o.commercial_state, o.estimated_value, o.currency,
         o.closed_at, o.operational_next_step_at
    into opp
  from public.opportunities o
  where o.id = target_opportunity_id;

  if opp.id is null then return; end if;

  policy := private.get_sold_not_scheduled_policy(opp.organization_id);
  if jsonb_typeof(policy -> 'enabled') = 'boolean' then enabled := (policy ->> 'enabled')::boolean; end if;
  if jsonb_typeof(policy -> 'grace_hours') = 'number' then grace_hours := (policy ->> 'grace_hours')::integer; end if;
  if jsonb_typeof(policy -> 'high_value_amount') = 'number' then high_value_amount := (policy ->> 'high_value_amount')::numeric; end if;
  policy_currency := nullif(policy ->> 'currency', '');
  policy_note := nullif(policy ->> 'note', '');
  attention_key := 'attention:sold_not_scheduled:' || opp.id::text;

  if enabled and grace_hours is not null and opp.commercial_state = 'WON' and opp.operational_next_step_at is null then
    due_at_value := coalesce(opp.closed_at, now()) + make_interval(hours => grace_hours);
    is_high_value := high_value_amount is not null
      and policy_currency = opp.currency
      and opp.estimated_value is not null
      and opp.estimated_value >= high_value_amount;

    perform public.insert_attention_once(
      opp.organization_id,
      attention_key,
      'OPERATIONS',
      'SOLD_NOT_SCHEDULED',
      'Vente gagnée sans prochain pas opérationnel',
      case when is_high_value then 'HIGH' else 'NORMAL' end,
      'opportunity',
      opp.id,
      'Cette opportunité est gagnée mais aucun prochain pas opérationnel n’est enregistré. La règle vient des paramètres de votre organisation.',
      'Enregistrer le prochain pas opérationnel',
      null,
      due_at_value,
      jsonb_strip_nulls(jsonb_build_object(
        'schema_version', 1,
        'source_kind', 'sold_not_scheduled',
        'source_id', opp.id,
        'reason', 'SOLD_NOT_SCHEDULED',
        'policy_key', 'sold_not_scheduled',
        'grace_hours', grace_hours,
        'high_value_amount', high_value_amount,
        'policy_currency', policy_currency,
        'policy_note', policy_note,
        'human_required', true,
        'automation_eligible', false,
        'opportunity_id', opp.id,
        'closed_at', opp.closed_at
      ))
    );

    update public.attention_items a
      set priority = case when is_high_value then 'HIGH' else 'NORMAL' end,
          due_at = due_at_value,
          explanation = 'Cette opportunité est gagnée mais aucun prochain pas opérationnel n’est enregistré. La règle vient des paramètres de votre organisation.',
          suggested_action = 'Enregistrer le prochain pas opérationnel',
          metadata = a.metadata || jsonb_strip_nulls(jsonb_build_object(
            'policy_key', 'sold_not_scheduled',
            'grace_hours', grace_hours,
            'high_value_amount', high_value_amount,
            'policy_currency', policy_currency,
            'policy_note', policy_note,
            'human_required', true,
            'automation_eligible', false
          )),
          status = case when a.status in ('RESOLVED', 'DISMISSED') then 'OPEN' else a.status end
    where a.organization_id = opp.organization_id
      and a.idempotency_key = attention_key;
    return;
  end if;

  if opp.operational_next_step_at is not null then
    update public.attention_items a
      set status = 'RESOLVED'
    where a.organization_id = opp.organization_id
      and a.idempotency_key = attention_key
      and a.status in ('OPEN', 'IN_PROGRESS');
  elsif not enabled then
    update public.attention_items a
      set status = 'DISMISSED'
    where a.organization_id = opp.organization_id
      and a.idempotency_key = attention_key
      and a.status in ('OPEN', 'IN_PROGRESS');
  end if;
end;
$$;
revoke all on function private.sync_sold_not_scheduled_attention(uuid)
  from public, anon, authenticated, service_role;

create or replace function private.sync_sold_not_scheduled_attention_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.sync_sold_not_scheduled_attention(new.id);
  return new;
end;
$$;
revoke all on function private.sync_sold_not_scheduled_attention_trigger()
  from public, anon, authenticated, service_role;

drop trigger if exists opportunities_sync_sold_not_scheduled_insert on public.opportunities;
create trigger opportunities_sync_sold_not_scheduled_insert
  after insert on public.opportunities
  for each row execute function private.sync_sold_not_scheduled_attention_trigger();

drop trigger if exists opportunities_sync_sold_not_scheduled_update on public.opportunities;
create trigger opportunities_sync_sold_not_scheduled_update
  after update of commercial_state, closed_at, estimated_value, currency, operational_next_step_at, operational_next_step_kind
  on public.opportunities
  for each row execute function private.sync_sold_not_scheduled_attention_trigger();

create or replace function public.set_sold_not_scheduled_policy(
  target_organization_id uuid,
  target_enabled boolean,
  target_grace_hours integer default null,
  target_high_value_amount numeric default null,
  target_note text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  org_currency text;
  policy jsonb;
  opportunity_row record;
begin
  if not private.has_organization_role(target_organization_id, array['OWNER', 'ADMIN']) then
    raise exception 'set_sold_not_scheduled_policy: OWNER or ADMIN required' using errcode = '42501';
  end if;
  if target_enabled and target_grace_hours is null then
    raise exception 'set_sold_not_scheduled_policy: grace_hours is required when enabled' using errcode = '22023';
  end if;
  if target_grace_hours is not null and (target_grace_hours < 0 or target_grace_hours > 8760) then
    raise exception 'set_sold_not_scheduled_policy: grace_hours must be between 0 and 8760' using errcode = '22023';
  end if;
  if target_high_value_amount is not null and target_high_value_amount < 0 then
    raise exception 'set_sold_not_scheduled_policy: high_value_amount must be >= 0' using errcode = '22023';
  end if;
  if target_note is not null and length(target_note) > 500 then
    raise exception 'set_sold_not_scheduled_policy: note too long' using errcode = '22023';
  end if;

  select currency into org_currency from public.organizations where id = target_organization_id;
  if org_currency is null then return false; end if;

  policy := jsonb_strip_nulls(jsonb_build_object(
    'configured', true,
    'enabled', coalesce(target_enabled, false),
    'grace_hours', target_grace_hours,
    'high_value_amount', target_high_value_amount,
    'currency', org_currency,
    'note', nullif(target_note, ''),
    'human_required', true,
    'automation_eligible', false,
    'updated_at', now(),
    'updated_by', (select auth.uid())
  ));

  update public.organizations o
    set config = coalesce(o.config, '{}'::jsonb) || jsonb_build_object(
      'value_policies',
      coalesce(o.config -> 'value_policies', '{}'::jsonb)
        || jsonb_build_object('sold_not_scheduled', policy)
    ),
    updated_at = now()
  where o.id = target_organization_id;

  if not found then return false; end if;

  for opportunity_row in
    select id from public.opportunities where organization_id = target_organization_id
  loop
    perform private.sync_sold_not_scheduled_attention(opportunity_row.id);
  end loop;

  perform public.record_audit_log(
    target_organization_id,
    'value_policy.sold_not_scheduled.updated',
    'organization',
    target_organization_id,
    policy
  );
  return true;
end;
$$;
revoke all on function public.set_sold_not_scheduled_policy(uuid, boolean, integer, numeric, text)
  from public, anon;
grant execute on function public.set_sold_not_scheduled_policy(uuid, boolean, integer, numeric, text)
  to authenticated;

create or replace function public.set_opportunity_operational_next_step(
  target_organization_id uuid,
  target_opportunity_id uuid,
  target_next_step_at timestamptz,
  target_next_step_kind text default null,
  target_source text default 'MANUAL'
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  effective_source text;
  updated_count integer;
begin
  if not (
    (select auth.role()) = 'service_role'
    or private.has_organization_role(target_organization_id, array['OWNER', 'ADMIN', 'MANAGER'])
  ) then
    raise exception 'set_opportunity_operational_next_step: insufficient role' using errcode = '42501';
  end if;

  if target_next_step_at is not null and (target_next_step_kind is null or length(trim(target_next_step_kind)) = 0) then
    raise exception 'set_opportunity_operational_next_step: kind required when date is set' using errcode = '22023';
  end if;
  if target_next_step_kind is not null and length(target_next_step_kind) > 80 then
    raise exception 'set_opportunity_operational_next_step: kind too long' using errcode = '22023';
  end if;

  effective_source := case
    when (select auth.role()) = 'service_role' and target_source in ('INTERVENTION', 'EXTERNAL', 'SYSTEM') then target_source
    else 'MANUAL'
  end;

  update public.opportunities
    set operational_next_step_at = target_next_step_at,
        operational_next_step_kind = case when target_next_step_at is null then null else trim(target_next_step_kind) end,
        operational_next_step_source = case when target_next_step_at is null then null else effective_source end,
        operational_next_step_updated_at = now(),
        updated_at = now()
  where id = target_opportunity_id
    and organization_id = target_organization_id
    and commercial_state = 'WON';

  get diagnostics updated_count = row_count;
  if updated_count = 0 then return false; end if;

  perform public.record_audit_log(
    target_organization_id,
    case when target_next_step_at is null then 'opportunity.operational_next_step.cleared' else 'opportunity.operational_next_step.set' end,
    'opportunity',
    target_opportunity_id,
    jsonb_strip_nulls(jsonb_build_object(
      'next_step_at', target_next_step_at,
      'next_step_kind', target_next_step_kind,
      'source', effective_source
    ))
  );
  return true;
end;
$$;
revoke all on function public.set_opportunity_operational_next_step(uuid, uuid, timestamptz, text, text)
  from public, anon;
grant execute on function public.set_opportunity_operational_next_step(uuid, uuid, timestamptz, text, text)
  to authenticated, service_role;

create or replace function public.get_opportunity_operational_state(
  target_organization_id uuid,
  target_opportunity_id uuid
)
returns table (
  opportunity_id uuid,
  next_step_at timestamptz,
  next_step_kind text,
  next_step_source text,
  next_step_updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'get_opportunity_operational_state: caller is not authorized' using errcode = '42501';
  end if;

  return query
  select o.id, o.operational_next_step_at, o.operational_next_step_kind,
         o.operational_next_step_source, o.operational_next_step_updated_at
  from public.opportunities o
  where o.id = target_opportunity_id
    and o.organization_id = target_organization_id;
end;
$$;
revoke all on function public.get_opportunity_operational_state(uuid, uuid)
  from public, anon;
grant execute on function public.get_opportunity_operational_state(uuid, uuid)
  to authenticated;

-- =========================================================================
-- C20 — scoreless commercial signals + structured objections
-- =========================================================================
create table if not exists public.commercial_objections (
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

create index if not exists commercial_objections_opportunity_open_idx
  on public.commercial_objections (organization_id, opportunity_id, updated_at desc)
  where status = 'OPEN';

alter table public.commercial_objections enable row level security;
drop policy if exists commercial_objections_select on public.commercial_objections;
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

-- Preserve legacy objection rows when migrating a historical database.
do $$
begin
  if to_regclass('public.reply_objections') is not null then
    insert into public.commercial_objections (
      organization_id, message_id, quote_id, opportunity_id, kind,
      summary, evidence, confidence, source, sensitive, status, created_at, updated_at
    )
    select distinct on (ro.organization_id, ro.message_id)
      ro.organization_id,
      ro.message_id,
      ro.quote_id,
      q.opportunity_id,
      case ro.class
        when 'PRICE' then 'PRICE'
        when 'TIMING' then 'TIMING'
        when 'COMPETITOR' then 'COMPETITION'
        when 'FINANCING_DECLINED' then 'FINANCIAL'
        when 'TECHNICAL_QUESTION' then 'TECHNICAL'
        when 'COMPLAINT' then 'COMPLAINT'
        when 'LEGAL' then 'LEGAL'
        when 'NO_DECISION' then 'UNCERTAIN'
        else 'OTHER'
      end,
      coalesce(nullif(trim(ro.summary), ''), 'Objection historique importée'),
      null,
      coalesce(ro.confidence, 0.5),
      'AI',
      ro.class in ('PRICE','FINANCING_DECLINED','COMPLAINT','LEGAL'),
      'OPEN',
      ro.created_at,
      ro.created_at
    from public.reply_objections ro
    left join public.quotes q on q.id = ro.quote_id and q.organization_id = ro.organization_id
    order by ro.organization_id, ro.message_id, ro.created_at desc
    on conflict (organization_id, message_id) do nothing;
  end if;
end;
$$;

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
  left join public.quotes q on q.id = m.quote_id and q.organization_id = m.organization_id
  where m.id = target_message_id
    and m.organization_id = target_organization_id
    and m.direction = 'INBOUND';
  if not found then
    raise exception 'sync_commercial_objection_from_ai: inbound message not found' using errcode = '22023';
  end if;

  select source into existing_source
  from public.commercial_objections
  where organization_id = target_organization_id and message_id = target_message_id;
  if existing_source = 'HUMAN' then return false; end if;

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
  left join public.quotes q on q.id = m.quote_id and q.organization_id = m.organization_id
  where m.id = target_message_id
    and m.organization_id = target_organization_id
    and m.direction = 'INBOUND';
  if not found then return false; end if;

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
