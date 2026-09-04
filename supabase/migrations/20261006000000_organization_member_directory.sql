create or replace function public.organization_member_directory(target_organization_id uuid)
returns table(user_id uuid, email text)
language sql
security definer
set search_path = ''
as $$
  select om.user_id, au.email::text
  from public.organization_members om
  join auth.users au on au.id = om.user_id
  where om.organization_id = target_organization_id
    and exists (
      select 1
      from public.organization_members viewer_membership
      where viewer_membership.organization_id = target_organization_id
        and viewer_membership.user_id = auth.uid()
        and viewer_membership.status = 'ACTIVE'
    )
  order by om.created_at asc;
$$;

revoke all on function public.organization_member_directory(uuid) from public;
grant execute on function public.organization_member_directory(uuid) to authenticated;
