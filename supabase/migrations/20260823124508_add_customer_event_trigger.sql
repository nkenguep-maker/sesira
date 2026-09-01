create or replace function private.emit_customer_created_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
begin
  if actor_id is null or not private.is_organization_member(new.organization_id) then
    raise exception 'Not authorized to create a customer for this organization'
      using errcode = '42501';
  end if;

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

create trigger customer_created_event
  after insert on public.customers
  for each row execute function private.emit_customer_created_event();
