-- SESIRA Core — C22 Speed to Lead.
-- This measures first internal handling of a Request. It does NOT claim a customer reply was sent.
-- The organization owns its target. No universal sector threshold is hard-coded.

alter table public.requests
  add column first_handled_at timestamptz;

create index requests_speed_to_lead_pending_idx
  on public.requests (organization_id, created_at)
  where status = 'NEW' and first_handled_at is null;

create index requests_speed_to_lead_observed_idx
  on public.requests (organization_id, first_handled_at)
  where first_handled_at is not null;

-- first_handled_at is system-observed from the first real transition out of NEW.
-- It cannot be rewritten later to improve the metric.
create or replace function private.protect_request_first_handled_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.first_handled_at is null and old.status = 'NEW' and new.status is distinct from 'NEW' then
    new.first_handled_at := now();
  else
    new.first_handled_at := old.first_handled_at;
  end if;
  return new;
end;
$$;

revoke all on function private.protect_request_first_handled_at()
  from public, anon, authenticated, service_role;

drop trigger if exists requests_protect_first_handled_at on public.requests;
create trigger requests_protect_first_handled_at
  before update of status, first_handled_at on public.requests
  for each row execute function private.protect_request_first_handled_at();

create or replace function private.get_speed_to_lead_policy(target_organization_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(config #> '{value_policies,speed_to_lead}', '{}'::jsonb)
  from public.organizations
  where id = target_organization_id;
$$;

revoke all on function private.get_speed_to_lead_policy(uuid)
  from public, anon, authenticated, service_role;

create or replace function private.sync_speed_to_lead_attention(target_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  req record;
  policy jsonb;
  enabled boolean := false;
  target_minutes integer;
  policy_note text;
  attention_key text;
  due_at_value timestamptz;
begin
  select r.id, r.organization_id, r.status, r.created_at, r.first_handled_at
    into req
  from public.requests r
  where r.id = target_request_id;

  if req.id is null then
    return;
  end if;

  policy := private.get_speed_to_lead_policy(req.organization_id);
  if jsonb_typeof(policy -> 'enabled') = 'boolean' then
    enabled := (policy ->> 'enabled')::boolean;
  end if;
  if jsonb_typeof(policy -> 'target_minutes') = 'number' then
    target_minutes := (policy ->> 'target_minutes')::integer;
  end if;
  policy_note := nullif(policy ->> 'note', '');
  attention_key := 'attention:speed_to_lead:' || req.id::text;

  if req.first_handled_at is not null or req.status <> 'NEW' then
    update public.attention_items a
      set status = 'RESOLVED',
          resolved_at = coalesce(a.resolved_at, now()),
          updated_at = now()
    where a.organization_id = req.organization_id
      and a.idempotency_key = attention_key
      and a.status in ('OPEN', 'IN_PROGRESS');
    return;
  end if;

  if not enabled or target_minutes is null then
    update public.attention_items a
      set status = 'DISMISSED',
          resolved_at = coalesce(a.resolved_at, now()),
          updated_at = now()
    where a.organization_id = req.organization_id
      and a.idempotency_key = attention_key
      and a.status in ('OPEN', 'IN_PROGRESS');
    return;
  end if;

  due_at_value := req.created_at + make_interval(mins => target_minutes);
  if now() < due_at_value then
    return;
  end if;

  perform public.insert_attention_once(
    req.organization_id,
    attention_key,
    'REQUESTS',
    'SPEED_TO_LEAD_OVERDUE',
    'Nouvelle demande encore sans prise en charge',
    'HIGH',
    'request',
    req.id,
    'Cette demande a dépassé le délai de prise en charge défini par votre organisation. SESIRA mesure une prise en charge interne, pas l’envoi d’une réponse au client.',
    'Ouvrir la demande et décider de la prochaine action',
    null,
    due_at_value,
    jsonb_strip_nulls(jsonb_build_object(
      'schema_version', 1,
      'source_kind', 'speed_to_lead',
      'source_id', req.id,
      'reason', 'SPEED_TO_LEAD_OVERDUE',
      'policy_key', 'speed_to_lead',
      'target_minutes', target_minutes,
      'policy_note', policy_note,
      'created_at', req.created_at,
      'human_required', true,
      'automation_eligible', false
    ))
  );

  update public.attention_items a
    set priority = 'HIGH',
        due_at = due_at_value,
        explanation = 'Cette demande a dépassé le délai de prise en charge défini par votre organisation. SESIRA mesure une prise en charge interne, pas l’envoi d’une réponse au client.',
        suggested_action = 'Ouvrir la demande et décider de la prochaine action',
        metadata = a.metadata || jsonb_strip_nulls(jsonb_build_object(
          'policy_key', 'speed_to_lead',
          'target_minutes', target_minutes,
          'policy_note', policy_note,
          'human_required', true,
          'automation_eligible', false
        )),
        status = case when a.status in ('RESOLVED', 'DISMISSED') then 'OPEN' else a.status end,
        resolved_at = null,
        updated_at = now()
  where a.organization_id = req.organization_id
    and a.idempotency_key = attention_key;
end;
$$;

revoke all on function private.sync_speed_to_lead_attention(uuid)
  from public, anon, authenticated, service_role;

create or replace function private.sync_speed_to_lead_attention_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.sync_speed_to_lead_attention(new.id);
  return new;
end;
$$;

revoke all on function private.sync_speed_to_lead_attention_trigger()
  from public, anon, authenticated, service_role;

drop trigger if exists requests_sync_speed_to_lead_update on public.requests;
create trigger requests_sync_speed_to_lead_update
  after update of status, first_handled_at on public.requests
  for each row execute function private.sync_speed_to_lead_attention_trigger();

-- A bounded evaluator is the time-based worker boundary. It creates no external action.
create or replace function public.evaluate_speed_to_lead(
  target_organization_id uuid,
  target_limit integer default 500
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  policy jsonb;
  enabled boolean := false;
  target_minutes integer;
  req record;
  evaluated integer := 0;
begin
  if not (
    (select auth.role()) = 'service_role'
    or private.has_organization_role(target_organization_id, array['OWNER', 'ADMIN', 'MANAGER'])
  ) then
    raise exception 'evaluate_speed_to_lead: insufficient role' using errcode = '42501';
  end if;
  if target_limit < 1 or target_limit > 2000 then
    raise exception 'evaluate_speed_to_lead: target_limit must be between 1 and 2000' using errcode = '22023';
  end if;

  policy := private.get_speed_to_lead_policy(target_organization_id);
  if jsonb_typeof(policy -> 'enabled') = 'boolean' then enabled := (policy ->> 'enabled')::boolean; end if;
  if jsonb_typeof(policy -> 'target_minutes') = 'number' then target_minutes := (policy ->> 'target_minutes')::integer; end if;
  if not enabled or target_minutes is null then return 0; end if;

  for req in
    select id
    from public.requests
    where organization_id = target_organization_id
      and status = 'NEW'
      and first_handled_at is null
      and created_at + make_interval(mins => target_minutes) <= now()
    order by created_at asc, id asc
    limit target_limit
  loop
    perform private.sync_speed_to_lead_attention(req.id);
    evaluated := evaluated + 1;
  end loop;

  return evaluated;
end;
$$;

revoke all on function public.evaluate_speed_to_lead(uuid, integer)
  from public, anon;
grant execute on function public.evaluate_speed_to_lead(uuid, integer)
  to authenticated, service_role;

create or replace function public.set_speed_to_lead_policy(
  target_organization_id uuid,
  target_enabled boolean,
  target_minutes integer default null,
  target_note text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  policy jsonb;
  req record;
begin
  if not private.has_organization_role(target_organization_id, array['OWNER', 'ADMIN']) then
    raise exception 'set_speed_to_lead_policy: OWNER or ADMIN required' using errcode = '42501';
  end if;
  if target_enabled and target_minutes is null then
    raise exception 'set_speed_to_lead_policy: target_minutes is required when enabled' using errcode = '22023';
  end if;
  if target_minutes is not null and (target_minutes < 1 or target_minutes > 10080) then
    raise exception 'set_speed_to_lead_policy: target_minutes must be between 1 and 10080' using errcode = '22023';
  end if;
  if target_note is not null and length(target_note) > 500 then
    raise exception 'set_speed_to_lead_policy: note too long' using errcode = '22023';
  end if;

  policy := jsonb_strip_nulls(jsonb_build_object(
    'configured', true,
    'enabled', coalesce(target_enabled, false),
    'target_minutes', target_minutes,
    'note', nullif(trim(coalesce(target_note, '')), ''),
    'human_required', true,
    'automation_eligible', false,
    'measurement', 'FIRST_INTERNAL_HANDLING',
    'updated_at', now(),
    'updated_by', (select auth.uid())
  ));

  update public.organizations o
    set config = coalesce(o.config, '{}'::jsonb) || jsonb_build_object(
      'value_policies',
      coalesce(o.config -> 'value_policies', '{}'::jsonb)
        || jsonb_build_object('speed_to_lead', policy)
    ),
    updated_at = now()
  where o.id = target_organization_id;

  if not found then return false; end if;

  for req in select id from public.requests where organization_id = target_organization_id loop
    perform private.sync_speed_to_lead_attention(req.id);
  end loop;

  perform public.record_audit_log(
    target_organization_id,
    'value_policy.speed_to_lead.updated',
    'organization',
    target_organization_id,
    policy
  );
  return true;
end;
$$;

revoke all on function public.set_speed_to_lead_policy(uuid, boolean, integer, text)
  from public, anon;
grant execute on function public.set_speed_to_lead_policy(uuid, boolean, integer, text)
  to authenticated;

create or replace function public.get_speed_to_lead_summary(target_organization_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  policy jsonb;
  enabled boolean := false;
  configured boolean := false;
  target_minutes integer;
  pending_count bigint := 0;
  overdue_count bigint := 0;
  oldest_pending_minutes numeric;
  handled_sample_count bigint := 0;
  average_handling_minutes numeric;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'get_speed_to_lead_summary: organization membership required' using errcode = '42501';
  end if;

  policy := private.get_speed_to_lead_policy(target_organization_id);
  if jsonb_typeof(policy -> 'configured') = 'boolean' then configured := (policy ->> 'configured')::boolean; end if;
  if jsonb_typeof(policy -> 'enabled') = 'boolean' then enabled := (policy ->> 'enabled')::boolean; end if;
  if jsonb_typeof(policy -> 'target_minutes') = 'number' then target_minutes := (policy ->> 'target_minutes')::integer; end if;

  select count(*),
         max(extract(epoch from (now() - r.created_at)) / 60.0)
    into pending_count, oldest_pending_minutes
  from public.requests r
  where r.organization_id = target_organization_id
    and r.status = 'NEW'
    and r.first_handled_at is null;

  if enabled and target_minutes is not null then
    select count(*) into overdue_count
    from public.requests r
    where r.organization_id = target_organization_id
      and r.status = 'NEW'
      and r.first_handled_at is null
      and r.created_at + make_interval(mins => target_minutes) <= now();
  end if;

  select count(*),
         avg(extract(epoch from (r.first_handled_at - r.created_at)) / 60.0)
    into handled_sample_count, average_handling_minutes
  from public.requests r
  where r.organization_id = target_organization_id
    and r.first_handled_at is not null
    and r.first_handled_at >= now() - interval '30 days';

  return jsonb_build_object(
    'configured', configured,
    'enabled', enabled,
    'target_minutes', target_minutes,
    'pending_count', pending_count,
    'overdue_count', overdue_count,
    'oldest_pending_minutes', case when oldest_pending_minutes is null then null else round(oldest_pending_minutes, 1) end,
    'handled_sample_count', handled_sample_count,
    'average_handling_minutes', case when average_handling_minutes is null then null else round(average_handling_minutes, 1) end,
    'measurement', 'FIRST_INTERNAL_HANDLING',
    'window_days', 30
  );
end;
$$;

revoke all on function public.get_speed_to_lead_summary(uuid)
  from public, anon;
grant execute on function public.get_speed_to_lead_summary(uuid)
  to authenticated;

comment on column public.requests.first_handled_at is
  'C22 observed timestamp set once on the first stored transition out of NEW. It represents internal handling, not a customer reply.';
