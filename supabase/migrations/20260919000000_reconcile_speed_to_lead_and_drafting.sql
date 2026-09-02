-- SESIRA live parity — reconcile current C22/C23 contracts after historical
-- migrations with the same version numbers were already applied to production.
-- Forward-only and idempotent. Historical first_response_at remains intact but is
-- not reused as FIRST_INTERNAL_HANDLING.

-- =========================================================================
-- C22 — Speed to Lead means first internal handling, never customer response.
-- =========================================================================
alter table public.requests
  add column if not exists first_handled_at timestamptz;

create index if not exists requests_speed_to_lead_pending_idx
  on public.requests (organization_id, created_at)
  where status = 'NEW' and first_handled_at is null;
create index if not exists requests_speed_to_lead_observed_idx
  on public.requests (organization_id, first_handled_at)
  where first_handled_at is not null;

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

  if req.id is null then return; end if;

  policy := private.get_speed_to_lead_policy(req.organization_id);
  if jsonb_typeof(policy -> 'enabled') = 'boolean' then enabled := (policy ->> 'enabled')::boolean; end if;
  if jsonb_typeof(policy -> 'target_minutes') = 'number' then target_minutes := (policy ->> 'target_minutes')::integer; end if;
  policy_note := nullif(policy ->> 'note', '');
  attention_key := 'attention:speed_to_lead:' || req.id::text;

  if req.first_handled_at is not null or req.status <> 'NEW' then
    update public.attention_items a
      set status = 'RESOLVED', resolved_at = coalesce(a.resolved_at, now()), updated_at = now()
    where a.organization_id = req.organization_id
      and a.idempotency_key = attention_key
      and a.status in ('OPEN', 'IN_PROGRESS');
    return;
  end if;

  if not enabled or target_minutes is null then
    update public.attention_items a
      set status = 'DISMISSED', resolved_at = coalesce(a.resolved_at, now()), updated_at = now()
    where a.organization_id = req.organization_id
      and a.idempotency_key = attention_key
      and a.status in ('OPEN', 'IN_PROGRESS');
    return;
  end if;

  due_at_value := req.created_at + make_interval(mins => target_minutes);

  perform public.insert_attention_once(
    req.organization_id,
    attention_key,
    'REQUESTS',
    'SPEED_TO_LEAD_OVERDUE',
    'Nouvelle demande encore sans prise en charge',
    'HIGH',
    'request',
    req.id,
    'Cette demande dépassera le délai de prise en charge défini par votre organisation si elle reste en Nouvelle. SESIRA mesure une prise en charge interne, pas l’envoi d’une réponse au client.',
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
      'automation_eligible', false,
      'measurement', 'FIRST_INTERNAL_HANDLING'
    ))
  );

  update public.attention_items a
    set priority = 'HIGH',
        due_at = due_at_value,
        explanation = 'Cette demande dépassera le délai de prise en charge défini par votre organisation si elle reste en Nouvelle. SESIRA mesure une prise en charge interne, pas l’envoi d’une réponse au client.',
        suggested_action = 'Ouvrir la demande et décider de la prochaine action',
        metadata = a.metadata || jsonb_strip_nulls(jsonb_build_object(
          'policy_key', 'speed_to_lead',
          'target_minutes', target_minutes,
          'policy_note', policy_note,
          'human_required', true,
          'automation_eligible', false,
          'measurement', 'FIRST_INTERNAL_HANDLING'
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

drop trigger if exists requests_sync_speed_to_lead_insert on public.requests;
create trigger requests_sync_speed_to_lead_insert
  after insert on public.requests
  for each row execute function private.sync_speed_to_lead_attention_trigger();

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
revoke all on function public.evaluate_speed_to_lead(uuid, integer) from public, anon;
grant execute on function public.evaluate_speed_to_lead(uuid, integer) to authenticated, service_role;

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
revoke all on function public.set_speed_to_lead_policy(uuid, boolean, integer, text) from public, anon;
grant execute on function public.set_speed_to_lead_policy(uuid, boolean, integer, text) to authenticated;

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

  select count(*), max(extract(epoch from (now() - r.created_at)) / 60.0)
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

  select count(*), avg(extract(epoch from (r.first_handled_at - r.created_at)) / 60.0)
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
revoke all on function public.get_speed_to_lead_summary(uuid) from public, anon;
grant execute on function public.get_speed_to_lead_summary(uuid) to authenticated;

comment on column public.requests.first_handled_at is
  'Observed once on the first stored transition out of NEW. Internal handling only; never a claim that a customer response was sent.';

-- =========================================================================
-- C23 — authoritative draft readiness + read-only reactivation.
-- =========================================================================
alter table public.quotes
  add column if not exists draft_gaps jsonb not null default '[]'::jsonb,
  add column if not exists draft_analysis_at timestamptz;

create index if not exists quotes_draft_gaps_pending_idx
  on public.quotes (organization_id, created_at desc)
  where status = 'DRAFT' and (draft_analysis_at is null or jsonb_array_length(draft_gaps) > 0);

create or replace function private.protect_quote_draft_analysis_fields()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_role = 'authenticated'
     and (old.draft_gaps is distinct from new.draft_gaps
          or old.draft_analysis_at is distinct from new.draft_analysis_at) then
    raise exception 'quote draft analysis fields are RPC-managed' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function private.protect_quote_draft_analysis_fields() from public, anon, authenticated, service_role;

drop trigger if exists quotes_protect_draft_analysis_fields on public.quotes;
create trigger quotes_protect_draft_analysis_fields
  before update of draft_gaps, draft_analysis_at on public.quotes
  for each row execute function private.protect_quote_draft_analysis_fields();

create or replace function private.enforce_quote_draft_readiness()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.status = 'DRAFT' and new.status = 'SENT' then
    if new.draft_analysis_at is null then
      raise exception 'quote % cannot be sent before draft analysis', old.id using errcode = '22023';
    end if;
    if jsonb_array_length(new.draft_gaps) > 0 then
      raise exception 'quote % cannot be sent with unresolved draft gaps', old.id using errcode = '22023';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.enforce_quote_draft_readiness() from public, anon, authenticated, service_role;

drop trigger if exists quotes_enforce_draft_readiness on public.quotes;
create trigger quotes_enforce_draft_readiness
  before update of status on public.quotes
  for each row when (old.status is distinct from new.status)
  execute function private.enforce_quote_draft_readiness();

create or replace function public.record_quote_draft_gaps(
  target_organization_id uuid,
  target_quote_id uuid,
  target_draft_gaps jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
  invalid_gap boolean;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'record_quote_draft_gaps: organization membership required' using errcode = '42501';
  end if;
  if target_draft_gaps is null or jsonb_typeof(target_draft_gaps) <> 'array' then
    raise exception 'record_quote_draft_gaps: JSON array required' using errcode = '22023';
  end if;
  if jsonb_array_length(target_draft_gaps) > 50 then
    raise exception 'record_quote_draft_gaps: maximum 50 gaps' using errcode = '22023';
  end if;

  select exists (
    select 1 from jsonb_array_elements(target_draft_gaps) as gap
    where jsonb_typeof(gap) <> 'object'
       or gap ->> 'field' not in ('amount','currency','customer_display_name','recipient_email','customer_confirmation','technical_diagnosis','regulatory_documents','delivery_terms','warranty_terms','other')
       or nullif(trim(gap ->> 'reason'), '') is null
       or length(gap ->> 'reason') > 500
  ) into invalid_gap;
  if invalid_gap then
    raise exception 'record_quote_draft_gaps: invalid gap shape' using errcode = '22023';
  end if;

  update public.quotes
    set draft_gaps = target_draft_gaps,
        draft_analysis_at = now(),
        updated_at = now()
  where id = target_quote_id
    and organization_id = target_organization_id
    and status = 'DRAFT';
  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id,
      'quote.draft_gaps_recorded',
      'quote',
      target_quote_id,
      jsonb_build_object('gap_count', jsonb_array_length(target_draft_gaps), 'human_required', true)
    );
  end if;
  return affected = 1;
end;
$$;
revoke all on function public.record_quote_draft_gaps(uuid, uuid, jsonb) from public, anon;
grant execute on function public.record_quote_draft_gaps(uuid, uuid, jsonb) to authenticated, service_role;

create or replace function public.get_quote_draft_readiness(target_organization_id uuid)
returns table (
  quote_id uuid,
  analyzed_at timestamptz,
  gap_count integer,
  gaps jsonb,
  send_eligible boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'get_quote_draft_readiness: organization membership required' using errcode = '42501';
  end if;
  return query
  select q.id,
         q.draft_analysis_at,
         jsonb_array_length(q.draft_gaps)::integer,
         q.draft_gaps,
         (q.status = 'DRAFT' and q.draft_analysis_at is not null and jsonb_array_length(q.draft_gaps) = 0)
  from public.quotes q
  where q.organization_id = target_organization_id
    and q.status = 'DRAFT'
  order by q.updated_at desc
  limit 500;
end;
$$;
revoke all on function public.get_quote_draft_readiness(uuid) from public, anon;
grant execute on function public.get_quote_draft_readiness(uuid) to authenticated;

create or replace function public.dormant_opportunities(
  target_organization_id uuid,
  target_dormant_since_days integer
)
returns table (
  opportunity_id uuid,
  customer_id uuid,
  commercial_state text,
  estimated_value numeric,
  currency text,
  opened_at timestamptz,
  last_activity_at timestamptz,
  dormant_days integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  cutoff timestamptz;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'dormant_opportunities: organization membership required' using errcode = '42501';
  end if;
  if target_dormant_since_days is null or target_dormant_since_days < 1 or target_dormant_since_days > 365 then
    raise exception 'dormant_opportunities: days must be between 1 and 365' using errcode = '22023';
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
        coalesce((select max(q.updated_at) from public.quotes q where q.organization_id = target_organization_id and q.opportunity_id = o.id), o.opened_at),
        coalesce((select max(m.received_at) from public.messages m join public.quotes q on q.id = m.quote_id and q.organization_id = m.organization_id where m.organization_id = target_organization_id and m.direction = 'INBOUND' and q.opportunity_id = o.id), o.opened_at)
      ) as last_activity,
      exists (
        select 1 from public.quotes q
        where q.organization_id = target_organization_id
          and q.opportunity_id = o.id
          and (q.opted_out_at is not null or q.automation_pause_reason = 'COMPLAINT')
      ) or exists (
        select 1 from public.commercial_objections co
        where co.organization_id = target_organization_id
          and co.opportunity_id = o.id
          and co.status = 'OPEN'
          and co.kind = 'COMPLAINT'
      ) as has_excluded
    from public.opportunities o
    where o.organization_id = target_organization_id
      and o.commercial_state not in ('WON','LOST','CANCELLED')
  )
  select opp_id, customer_id, commercial_state, estimated_value, currency, opened_at,
         last_activity, extract(day from (now() - last_activity))::integer
  from per_opp_activity
  where has_excluded = false and last_activity <= cutoff
  order by last_activity asc
  limit 500;
end;
$$;
revoke all on function public.dormant_opportunities(uuid, integer) from public, anon;
grant execute on function public.dormant_opportunities(uuid, integer) to authenticated, service_role;

comment on function public.dormant_opportunities(uuid, integer) is
  'Read-only reactivation candidate detector. Excludes terminal opportunities, opt-outs and complaints. Never sends or transitions anything.';
