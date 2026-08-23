create or replace function private.emit_request_created_event()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
begin
  insert into public.events (
    organization_id,
    type,
    entity_type,
    entity_id,
    source,
    payload
  )
  values (
    new.organization_id,
    'request.created',
    'request',
    new.id,
    'APP',
    jsonb_strip_nulls(
      jsonb_build_object(
        'actor_id', actor_id,
        'customer_id', new.customer_id,
        'service_catalog_item_id', new.service_catalog_item_id,
        'source', new.source,
        'status', new.status
      )
    )
  );

  return new;
end;
$$;

revoke all on function private.emit_request_created_event() from public, anon, authenticated, service_role;

create trigger request_created_event
  after insert on public.requests
  for each row execute function private.emit_request_created_event();

create or replace function private.emit_request_status_changed_event()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
begin
  insert into public.events (
    organization_id,
    type,
    entity_type,
    entity_id,
    source,
    payload
  )
  values (
    new.organization_id,
    'request.status_changed',
    'request',
    new.id,
    'APP',
    jsonb_build_object(
      'actor_id', actor_id,
      'previous_status', old.status,
      'status', new.status
    )
  );

  return new;
end;
$$;

revoke all on function private.emit_request_status_changed_event() from public, anon, authenticated, service_role;

create trigger request_status_changed_event
  after update of status on public.requests
  for each row
  when (old.status is distinct from new.status)
  execute function private.emit_request_status_changed_event();
