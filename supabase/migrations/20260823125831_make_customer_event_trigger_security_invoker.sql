create or replace function private.emit_customer_created_event()
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
    'customer.created',
    'customer',
    new.id,
    'APP',
    jsonb_strip_nulls(
      jsonb_build_object(
        'actor_id', actor_id,
        'customer_type', new.type,
        'display_name', new.display_name
      )
    )
  );

  return new;
end;
$$;

revoke all on function private.emit_customer_created_event() from public, anon, authenticated, service_role;
