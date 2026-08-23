create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_organization_id uuid := pg_catalog.gen_random_uuid();
  requested_name text;
begin
  requested_name := nullif(trim(new.raw_user_meta_data ->> 'organization_name'), '');

  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'avatar_url', '')
  )
  on conflict (id) do nothing;

  insert into public.organizations (
    id,
    name,
    slug,
    sector_key,
    status,
    config,
    feature_flags
  )
  values (
    new_organization_id,
    coalesce(requested_name, 'Mon entreprise'),
    'organisation-' || replace(left(new_organization_id::text, 13), '-', ''),
    'general',
    'TRIAL',
    '{"onboarding_required":true}'::jsonb,
    '{"requests_enabled":true,"quotes_enabled":true}'::jsonb
  );

  insert into public.organization_members (organization_id, user_id, role, status)
  values (new_organization_id, new.id, 'OWNER', 'ACTIVE');

  return new;
end;
$$;

revoke all on function private.handle_new_auth_user() from public, anon, authenticated;
