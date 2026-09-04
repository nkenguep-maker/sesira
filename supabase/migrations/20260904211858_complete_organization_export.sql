create or replace function private.redact_export_json(input_value jsonb)
returns jsonb
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare
  output_value jsonb;
begin
  if input_value is null then
    return null;
  end if;

  if jsonb_typeof(input_value) = 'object' then
    select coalesce(jsonb_object_agg(e.key, private.redact_export_json(e.value)), '{}'::jsonb)
      into output_value
    from jsonb_each(input_value) as e(key, value)
    where lower(e.key) not in (
      'password', 'password_hash', 'secret', 'client_secret', 'webhook_secret',
      'api_key', 'access_token', 'refresh_token', 'authorization',
      'credential', 'credentials', 'private_key', 'service_role_key'
    )
      and lower(e.key) not like '%_secret'
      and lower(e.key) not like '%_access_token'
      and lower(e.key) not like '%_refresh_token'
      and lower(e.key) not like '%_api_key';
    return output_value;
  end if;

  if jsonb_typeof(input_value) = 'array' then
    select coalesce(jsonb_agg(private.redact_export_json(value)), '[]'::jsonb)
      into output_value
    from jsonb_array_elements(input_value) as a(value);
    return output_value;
  end if;

  return input_value;
end;
$$;

revoke all on function private.redact_export_json(jsonb) from public, anon, authenticated;
grant execute on function private.redact_export_json(jsonb) to service_role;

create or replace function public.export_organization_snapshot(target_organization_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  snapshot jsonb;
  datasets jsonb := '{}'::jsonb;
  counts jsonb := '{}'::jsonb;
  rows_json jsonb;
  org_json jsonb;
  table_row record;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'export_organization_snapshot: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;

  perform public.record_audit_log(
    target_organization_id,
    'organization.export_snapshot',
    'organization',
    target_organization_id,
    jsonb_build_object('format', 'OPEN_JSON_CSV', 'complete_org_tables', true)
  );

  select private.redact_export_json(to_jsonb(o))
    into org_json
  from public.organizations o
  where o.id = target_organization_id;

  for table_row in
    select distinct t.table_name
    from information_schema.tables t
    join information_schema.columns c
      on c.table_schema = t.table_schema
     and c.table_name = t.table_name
    where t.table_schema = 'public'
      and t.table_type = 'BASE TABLE'
      and c.column_name = 'organization_id'
    order by t.table_name
  loop
    execute format(
      'select coalesce(jsonb_agg(private.redact_export_json(to_jsonb(src))), ''[]''::jsonb) from public.%I src where src.organization_id = $1',
      table_row.table_name
    )
    into rows_json
    using target_organization_id;

    datasets := datasets || jsonb_build_object(table_row.table_name, rows_json);
    counts := counts || jsonb_build_object(table_row.table_name, jsonb_array_length(rows_json));
  end loop;

  snapshot := jsonb_build_object(
    'schema_version', 'C40_COMPLETE_ORGANIZATION_EXPORT_V2',
    'generated_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'organization_id', target_organization_id,
    'organization', org_json,
    'counts', counts,
    'datasets', datasets
  );

  return snapshot;
end;
$$;

revoke all on function public.export_organization_snapshot(uuid) from public, anon;
grant execute on function public.export_organization_snapshot(uuid) to authenticated;
