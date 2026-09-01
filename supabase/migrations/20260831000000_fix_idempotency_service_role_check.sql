-- Correction to 20260830000000_durable_workflow_idempotency.sql.
--
-- The initial helpers used `pg_has_role(session_user, 'service_role', 'MEMBER')`
-- to allow service_role callers to bypass the membership check. In Supabase,
-- every PostgREST request runs as `session_user = authenticator`, and
-- `authenticator` is granted membership of `service_role` (as well as
-- `authenticated` and `anon`). That predicate therefore evaluates to TRUE
-- for *every* authenticated user, silently bypassing the organization
-- membership guard and allowing cross-tenant writes.
--
-- The correct idiom is `(select auth.role()) = 'service_role'`: this reads
-- the `role` claim from the request JWT (`request.jwt.claims -> 'role'`).
-- PostgREST forwards the JWT of the request; the service_role JWT sets
-- `role = 'service_role'`. Neither `current_user` (which returns the
-- definer inside SECURITY DEFINER) nor `session_user` (which returns the
-- login role, always `authenticator` on Supabase) can reliably discriminate
-- a service_role caller from an authenticated tenant caller here.
--
-- No schema change — only three `create or replace function` statements
-- that redefine the auth guards. Signatures / grants / comments unchanged.

create or replace function public.insert_event_once(
  target_organization_id uuid,
  target_idempotency_key text,
  target_type            text,
  target_source          text,
  target_entity_type     text default null,
  target_entity_id       uuid default null,
  target_payload         jsonb default '{}'::jsonb
)
returns table (id uuid, created boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_id uuid;
  existing_id uuid;
begin
  if target_idempotency_key is null or length(target_idempotency_key) = 0 then
    raise exception 'insert_event_once: idempotency_key is required'
      using errcode = '22023';
  end if;
  if not (
    private.is_organization_member(target_organization_id)
    or (select auth.role()) = 'service_role'
  ) then
    raise exception 'insert_event_once: caller is not authorized for organization %', target_organization_id
      using errcode = '42501';
  end if;

  insert into public.events (
    organization_id, idempotency_key, type, source,
    entity_type, entity_id, payload
  )
  values (
    target_organization_id, target_idempotency_key, target_type, target_source,
    target_entity_type, target_entity_id, coalesce(target_payload, '{}'::jsonb)
  )
  on conflict (organization_id, idempotency_key)
    where idempotency_key is not null
    do nothing
  returning events.id into inserted_id;

  if inserted_id is not null then
    id := inserted_id;
    created := true;
    return next;
    return;
  end if;

  select events.id into existing_id
  from public.events
  where organization_id = target_organization_id
    and idempotency_key = target_idempotency_key;

  id := existing_id;
  created := false;
  return next;
  return;
end;
$$;

create or replace function public.insert_attention_once(
  target_organization_id uuid,
  target_idempotency_key text,
  target_category        text,
  target_reason          text,
  target_title           text,
  target_priority        text default 'NORMAL',
  target_entity_type     text default null,
  target_entity_id       uuid default null,
  target_explanation     text default null,
  target_suggested_action text default null,
  target_assigned_user_id uuid default null,
  target_due_at          timestamptz default null,
  target_metadata        jsonb default '{}'::jsonb
)
returns table (id uuid, created boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_id uuid;
  existing_id uuid;
begin
  if target_idempotency_key is null or length(target_idempotency_key) = 0 then
    raise exception 'insert_attention_once: idempotency_key is required'
      using errcode = '22023';
  end if;
  if not (
    private.is_organization_member(target_organization_id)
    or (select auth.role()) = 'service_role'
  ) then
    raise exception 'insert_attention_once: caller is not authorized for organization %', target_organization_id
      using errcode = '42501';
  end if;

  insert into public.attention_items (
    organization_id, idempotency_key, category, reason, title, priority,
    entity_type, entity_id, explanation, suggested_action,
    assigned_user_id, due_at, metadata
  )
  values (
    target_organization_id, target_idempotency_key, target_category,
    target_reason, target_title, target_priority,
    target_entity_type, target_entity_id, target_explanation,
    target_suggested_action, target_assigned_user_id, target_due_at,
    coalesce(target_metadata, '{}'::jsonb)
  )
  on conflict (organization_id, idempotency_key)
    where idempotency_key is not null
    do nothing
  returning attention_items.id into inserted_id;

  if inserted_id is not null then
    id := inserted_id;
    created := true;
    return next;
    return;
  end if;

  select attention_items.id into existing_id
  from public.attention_items
  where organization_id = target_organization_id
    and idempotency_key = target_idempotency_key;

  id := existing_id;
  created := false;
  return next;
  return;
end;
$$;

create or replace function public.record_provider_delivery(
  target_organization_id     uuid,
  target_provider            text,
  target_provider_event_id   text,
  target_event_type          text,
  target_related_entity_type text default null,
  target_related_entity_id   uuid default null,
  target_payload             jsonb default '{}'::jsonb,
  target_received_at         timestamptz default null
)
returns table (id uuid, created boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_id uuid;
  existing_id uuid;
begin
  if target_provider is null or length(target_provider) = 0 then
    raise exception 'record_provider_delivery: provider is required'
      using errcode = '22023';
  end if;
  if target_provider_event_id is null or length(target_provider_event_id) = 0 then
    raise exception 'record_provider_delivery: provider_event_id is required'
      using errcode = '22023';
  end if;
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'record_provider_delivery: only service_role may record receipts'
      using errcode = '42501';
  end if;

  insert into public.provider_delivery_receipts (
    organization_id, provider, provider_event_id, event_type,
    related_entity_type, related_entity_id, payload, received_at
  )
  values (
    target_organization_id, target_provider, target_provider_event_id,
    target_event_type, target_related_entity_type, target_related_entity_id,
    coalesce(target_payload, '{}'::jsonb),
    coalesce(target_received_at, now())
  )
  on conflict (organization_id, provider, provider_event_id) do nothing
  returning provider_delivery_receipts.id into inserted_id;

  if inserted_id is not null then
    id := inserted_id;
    created := true;
    return next;
    return;
  end if;

  select provider_delivery_receipts.id into existing_id
  from public.provider_delivery_receipts
  where organization_id = target_organization_id
    and provider = target_provider
    and provider_event_id = target_provider_event_id;

  id := existing_id;
  created := false;
  return next;
  return;
end;
$$;
