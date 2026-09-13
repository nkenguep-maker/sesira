-- SESIRA — document link review RPC hardening
--
-- Link confirmation/rejection is initiated by authenticated server actions but
-- executed with the service role.  This keeps SECURITY DEFINER functions out of
-- the directly callable authenticated PostgREST surface while preserving a
-- strict active-membership check for the human actor recorded by SESIRA.

create or replace function public.confirm_document_link(
  target_organization_id uuid,
  target_link_id uuid,
  target_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  link_row public.document_links%rowtype;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'confirm_document_link: only service_role may execute this operation'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
      from public.organization_members om
     where om.organization_id = target_organization_id
       and om.user_id = target_user_id
       and om.status = 'ACTIVE'
  ) then
    raise exception 'confirm_document_link: actor is not an active organization member'
      using errcode = '42501';
  end if;

  select * into link_row
    from public.document_links
   where id = target_link_id
     and organization_id = target_organization_id
     and status <> 'REJECTED'
   for update;

  if not found then return false; end if;

  if link_row.is_primary then
    update public.document_links
       set is_primary = false, updated_at = now()
     where document_id = link_row.document_id
       and id <> link_row.id
       and is_primary = true;
  end if;

  update public.document_links
     set status = 'CONFIRMED',
         confirmed_by_user_id = target_user_id,
         confirmed_at = now(),
         rejected_by_user_id = null,
         rejected_at = null,
         updated_at = now()
   where id = link_row.id;

  if link_row.is_primary then
    update public.documents
       set entity_type = link_row.entity_type,
           entity_id = link_row.entity_id,
           updated_at = now()
     where id = link_row.document_id
       and organization_id = target_organization_id;
  end if;

  perform public.record_audit_log(
    target_organization_id,
    'document.link.confirm',
    'document',
    link_row.document_id,
    jsonb_build_object(
      'actor_user_id', target_user_id,
      'link_id', link_row.id,
      'entity_type', link_row.entity_type,
      'entity_id', link_row.entity_id,
      'confidence', link_row.confidence
    )
  );

  return true;
end;
$$;

revoke all on function public.confirm_document_link(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.confirm_document_link(uuid, uuid, uuid) to service_role;

create or replace function public.reject_document_link(
  target_organization_id uuid,
  target_link_id uuid,
  target_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  link_row public.document_links%rowtype;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'reject_document_link: only service_role may execute this operation'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
      from public.organization_members om
     where om.organization_id = target_organization_id
       and om.user_id = target_user_id
       and om.status = 'ACTIVE'
  ) then
    raise exception 'reject_document_link: actor is not an active organization member'
      using errcode = '42501';
  end if;

  select * into link_row
    from public.document_links
   where id = target_link_id
     and organization_id = target_organization_id
     and status = 'SUGGESTED'
   for update;

  if not found then return false; end if;

  update public.document_links
     set status = 'REJECTED',
         is_primary = false,
         rejected_by_user_id = target_user_id,
         rejected_at = now(),
         updated_at = now()
   where id = link_row.id;

  perform public.record_audit_log(
    target_organization_id,
    'document.link.reject',
    'document',
    link_row.document_id,
    jsonb_build_object(
      'actor_user_id', target_user_id,
      'link_id', link_row.id,
      'entity_type', link_row.entity_type,
      'entity_id', link_row.entity_id
    )
  );

  return true;
end;
$$;

revoke all on function public.reject_document_link(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.reject_document_link(uuid, uuid, uuid) to service_role;
