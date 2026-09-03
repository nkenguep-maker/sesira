-- SESIRA Core — C19 value policies + sold-not-scheduled exception.
-- Organization policy is stored in organizations.config so no global CVC threshold
-- is presented as truth. The policy is disabled until an OWNER/ADMIN configures it.

alter table public.opportunities
  add column operational_next_step_at timestamptz,
  add column operational_next_step_kind text,
  add column operational_next_step_source text,
  add column operational_next_step_updated_at timestamptz;

alter table public.opportunities
  add constraint opportunities_operational_next_step_kind_check
    check (operational_next_step_kind is null or length(operational_next_step_kind) between 1 and 80),
  add constraint opportunities_operational_next_step_source_check
    check (operational_next_step_source is null or operational_next_step_source in ('MANUAL', 'INTERVENTION', 'EXTERNAL', 'SYSTEM')),
  add constraint opportunities_operational_next_step_consistency_check
    check (
      (operational_next_step_at is null and operational_next_step_kind is null)
      or
      (operational_next_step_at is not null and operational_next_step_kind is not null)
    );

create index opportunities_won_without_next_step_idx
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

  if opp.id is null then
    return;
  end if;

  policy := private.get_sold_not_scheduled_policy(opp.organization_id);
  if jsonb_typeof(policy -> 'enabled') = 'boolean' then
    enabled := (policy ->> 'enabled')::boolean;
  end if;
  if jsonb_typeof(policy -> 'grace_hours') = 'number' then
    grace_hours := (policy ->> 'grace_hours')::integer;
  end if;
  if jsonb_typeof(policy -> 'high_value_amount') = 'number' then
    high_value_amount := (policy ->> 'high_value_amount')::numeric;
  end if;
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
    raise exception 'set_sold_not_scheduled_policy: OWNER or ADMIN required'
      using errcode = '42501';
  end if;
  if target_enabled and target_grace_hours is null then
    raise exception 'set_sold_not_scheduled_policy: grace_hours is required when enabled'
      using errcode = '22023';
  end if;
  if target_grace_hours is not null and (target_grace_hours < 0 or target_grace_hours > 8760) then
    raise exception 'set_sold_not_scheduled_policy: grace_hours must be between 0 and 8760'
      using errcode = '22023';
  end if;
  if target_high_value_amount is not null and target_high_value_amount < 0 then
    raise exception 'set_sold_not_scheduled_policy: high_value_amount must be >= 0'
      using errcode = '22023';
  end if;
  if target_note is not null and length(target_note) > 500 then
    raise exception 'set_sold_not_scheduled_policy: note too long'
      using errcode = '22023';
  end if;

  select currency into org_currency from public.organizations where id = target_organization_id;
  if org_currency is null then
    return false;
  end if;

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
    raise exception 'set_opportunity_operational_next_step: insufficient role'
      using errcode = '42501';
  end if;

  if target_next_step_at is not null and (target_next_step_kind is null or length(trim(target_next_step_kind)) = 0) then
    raise exception 'set_opportunity_operational_next_step: kind required when date is set'
      using errcode = '22023';
  end if;
  if target_next_step_kind is not null and length(target_next_step_kind) > 80 then
    raise exception 'set_opportunity_operational_next_step: kind too long'
      using errcode = '22023';
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
  if updated_count = 0 then
    return false;
  end if;

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
    raise exception 'get_opportunity_operational_state: caller is not authorized'
      using errcode = '42501';
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
