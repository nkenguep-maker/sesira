-- SESIRA C25-C32 reconciliation hardening.
-- Forward-only migration on top of C32.
--
-- Goals:
-- 1. Authenticated Data API clients may still edit allowed non-state fields,
--    but lifecycle status transitions must pass through audited SECURITY DEFINER RPCs.
-- 2. Field reports cannot be reviewed while deterministic gaps remain.
-- 3. Field report SENT requires a provider-confirmation recording boundary.
-- 4. Growth PUBLISHED requires a provider-confirmation recording boundary.
--
-- This migration does not send anything externally.

create or replace function private.require_rpc_managed_status_transition()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_role = 'authenticated' and old.status is distinct from new.status then
    raise exception '% status transitions are RPC-managed (% -> %)', tg_table_name, old.status, new.status
      using errcode = '42501';
  end if;
  return new;
end;
$$;

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'interventions',
    'field_reports',
    'documents',
    'invoices',
    'maintenance_contracts',
    'growth_campaigns',
    'leads',
    'growth_content_pieces',
    'growth_publications',
    'growth_conversations'
  ] loop
    execute format('drop trigger if exists %I on public.%I', target_table || '_rpc_status_only', target_table);
    execute format(
      'create trigger %I before update on public.%I for each row execute function private.require_rpc_managed_status_transition()',
      target_table || '_rpc_status_only',
      target_table
    );
  end loop;
end;
$$;

-- -------------------------------------------------------------------------
-- C26: field report review and provider-confirmed delivery
-- -------------------------------------------------------------------------

alter table public.field_reports
  add column if not exists delivery_provider text,
  add column if not exists delivery_external_ref text;

create unique index if not exists field_reports_delivery_external_ref_idx
  on public.field_reports (organization_id, delivery_provider, delivery_external_ref)
  where delivery_provider is not null and delivery_external_ref is not null;

create or replace function public.transition_field_report_review(
  target_organization_id uuid,
  target_report_id       uuid,
  target_reviewer_user_id uuid,
  target_new_status      text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
  gap_count integer;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'transition_field_report_review: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.organization_members
    where organization_id = target_organization_id
      and user_id = target_reviewer_user_id
      and status = 'ACTIVE'
  ) then
    raise exception 'transition_field_report_review: reviewer % is not an ACTIVE member of organization %',
      target_reviewer_user_id, target_organization_id
      using errcode = '42501';
  end if;
  if target_new_status not in ('REVIEWED', 'APPROVED') then
    raise exception 'transition_field_report_review: % is not a human review transition', target_new_status
      using errcode = '22023';
  end if;

  if target_new_status = 'REVIEWED' then
    select jsonb_array_length(report_gaps) into gap_count
    from public.field_reports
    where id = target_report_id
      and organization_id = target_organization_id
      and status = 'DRAFT';

    if gap_count is null then
      return false;
    end if;
    if gap_count > 0 then
      raise exception 'transition_field_report_review: unresolved report gaps (%)', gap_count
        using errcode = '22023';
    end if;

    update public.field_reports
      set status = 'REVIEWED',
          reviewed_by_user_id = target_reviewer_user_id,
          reviewed_at = now()
    where id = target_report_id
      and organization_id = target_organization_id
      and status = 'DRAFT';
  else
    update public.field_reports
      set status = 'APPROVED',
          approved_by_user_id = target_reviewer_user_id,
          approved_at = now()
    where id = target_report_id
      and organization_id = target_organization_id
      and status = 'REVIEWED';
  end if;

  get diagnostics affected = row_count;
  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id,
      'field_report.transition_' || lower(target_new_status),
      'field_report',
      target_report_id,
      jsonb_build_object('reviewer_user_id', target_reviewer_user_id)
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.transition_field_report_review(uuid, uuid, uuid, text) from public, anon;
grant execute on function public.transition_field_report_review(uuid, uuid, uuid, text) to authenticated, service_role;

create or replace function public.record_field_report_delivery(
  target_organization_id uuid,
  target_report_id uuid,
  target_provider text,
  target_external_ref text,
  target_delivered_at timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  if coalesce((select auth.jwt() ->> 'role'), '') <> 'service_role' then
    raise exception 'record_field_report_delivery: service_role provider boundary required'
      using errcode = '42501';
  end if;
  if target_provider is null or length(trim(target_provider)) = 0 or length(target_provider) > 100 then
    raise exception 'record_field_report_delivery: provider is required'
      using errcode = '22023';
  end if;
  if target_external_ref is null or length(trim(target_external_ref)) = 0 or length(target_external_ref) > 500 then
    raise exception 'record_field_report_delivery: external_ref is required'
      using errcode = '22023';
  end if;
  if target_delivered_at is null then
    raise exception 'record_field_report_delivery: delivered_at is required'
      using errcode = '22023';
  end if;

  update public.field_reports
    set status = 'SENT',
        sent_at = target_delivered_at,
        delivery_provider = target_provider,
        delivery_external_ref = target_external_ref,
        updated_at = now()
  where id = target_report_id
    and organization_id = target_organization_id
    and status = 'APPROVED';

  get diagnostics affected = row_count;
  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id,
      'field_report.provider_delivery_confirmed',
      'field_report',
      target_report_id,
      jsonb_build_object(
        'provider', target_provider,
        'external_ref', target_external_ref,
        'delivered_at', to_char(target_delivered_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      )
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.record_field_report_delivery(uuid, uuid, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.record_field_report_delivery(uuid, uuid, text, text, timestamptz) to service_role;

comment on function public.record_field_report_delivery(uuid, uuid, text, text, timestamptz) is
  'Provider-confirmation boundary for APPROVED field reports. No external effect happens here. service_role records an already-confirmed provider result and only then may status become SENT.';

-- -------------------------------------------------------------------------
-- C31: provider-confirmed publication only
-- -------------------------------------------------------------------------

create or replace function public.mark_publication_published(
  target_organization_id      uuid,
  target_publication_id       uuid,
  target_published_by_user_id uuid,
  target_external_ref         text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
  pub_row public.growth_publications%rowtype;
begin
  if coalesce((select auth.jwt() ->> 'role'), '') <> 'service_role' then
    raise exception 'mark_publication_published: service_role provider boundary required'
      using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.organization_members
    where organization_id = target_organization_id
      and user_id = target_published_by_user_id
      and status = 'ACTIVE'
  ) then
    raise exception 'mark_publication_published: publisher % is not an ACTIVE member of organization %',
      target_published_by_user_id, target_organization_id
      using errcode = '42501';
  end if;
  if target_external_ref is null or length(trim(target_external_ref)) = 0 or length(target_external_ref) > 500 then
    raise exception 'mark_publication_published: external_ref is required'
      using errcode = '22023';
  end if;

  select * into pub_row
  from public.growth_publications
  where id = target_publication_id
    and organization_id = target_organization_id;

  if pub_row.id is null or pub_row.status <> 'SCHEDULED' then
    return false;
  end if;

  update public.growth_publications
    set status = 'PUBLISHED',
        published_at = now(),
        published_by_user_id = target_published_by_user_id,
        external_ref = target_external_ref,
        updated_at = now()
  where id = target_publication_id
    and organization_id = target_organization_id
    and status = 'SCHEDULED';

  get diagnostics affected = row_count;
  if affected = 1 then
    update public.growth_content_pieces
      set status = case when status = 'APPROVED' then 'PUBLISHED' else status end,
          published_at = coalesce(published_at, now()),
          updated_at = now()
    where id = pub_row.content_piece_id
      and organization_id = target_organization_id;

    perform public.record_audit_log(
      target_organization_id,
      'growth_publication.provider_publish_confirmed',
      'growth_publication',
      target_publication_id,
      jsonb_build_object(
        'published_by_user_id', target_published_by_user_id,
        'external_ref', target_external_ref,
        'content_piece_id', pub_row.content_piece_id
      )
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.mark_publication_published(uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.mark_publication_published(uuid, uuid, uuid, text) to service_role;

comment on function public.mark_publication_published(uuid, uuid, uuid, text) is
  'Records an already-successful external publication. service_role only. external_ref is mandatory. The provider effect must happen before this RPC.';
