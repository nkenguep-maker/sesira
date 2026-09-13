-- Keep the import-start RPC aligned with the widened imports.kind constraint.

create or replace function public.record_import_started(
  target_organization_id uuid,
  target_kind text,
  target_source_filename text,
  target_source_size_bytes integer,
  target_initiator_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_import_id uuid;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'record_import_started: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;

  if target_kind not in (
    'customers', 'requests', 'quotes', 'invoices', 'equipment', 'maintenance_contracts'
  ) then
    raise exception 'record_import_started: unsupported import kind %', target_kind
      using errcode = '22023';
  end if;

  insert into public.imports (
    organization_id, kind, source_filename, source_size_bytes,
    status, initiator_user_id
  )
  values (
    target_organization_id, target_kind, target_source_filename, target_source_size_bytes,
    'RUNNING', target_initiator_user_id
  )
  returning id into new_import_id;

  return new_import_id;
end;
$$;
