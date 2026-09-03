-- SESIRA Core Workflow — field reports (C26).
--
-- Report lifecycle attached to an intervention:
--   DRAFT → REVIEWED → APPROVED → SENT (terminal)
--   any → ARCHIVED (terminal)
--
-- AI may summarize/structure at DRAFT. AI must NEVER invent
-- diagnosis or compliance. `record_field_report_gaps` (same
-- pattern as C23 draft gaps) surfaces missing operational data
-- an operator must fill before REVIEWED.

create table public.field_reports (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations(id) on delete cascade,
  intervention_id       uuid not null,
  technician_user_id    uuid,
  status                text not null default 'DRAFT'
    check (status in ('DRAFT', 'REVIEWED', 'APPROVED', 'SENT', 'ARCHIVED')),
  summary               text check (summary is null or length(summary) <= 8000),
  observations          jsonb not null default '[]'::jsonb check (jsonb_typeof(observations) = 'array'),
  customer_facing_summary text check (customer_facing_summary is null or length(customer_facing_summary) <= 4000),
  report_gaps           jsonb not null default '[]'::jsonb check (jsonb_typeof(report_gaps) = 'array'),
  attachments           jsonb not null default '[]'::jsonb check (jsonb_typeof(attachments) = 'array'),
  reviewed_by_user_id   uuid,
  reviewed_at           timestamptz,
  approved_by_user_id   uuid,
  approved_at           timestamptz,
  sent_at               timestamptz,
  provenance            jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  foreign key (intervention_id, organization_id) references public.interventions(id, organization_id) on delete cascade,
  unique (intervention_id)
);

comment on table public.field_reports is
  'One report per intervention. Lifecycle DRAFT → REVIEWED → APPROVED → SENT/ARCHIVED. AI may summarize; NEVER invent diagnosis/compliance. report_gaps surfaces missing operational data.';

create index field_reports_org_status_idx on public.field_reports (organization_id, status);
create index field_reports_org_intervention_idx on public.field_reports (organization_id, intervention_id);

alter table public.field_reports enable row level security;

create policy field_reports_select on public.field_reports
  for select to authenticated
  using (private.is_organization_member(organization_id));
create policy field_reports_insert on public.field_reports
  for insert to authenticated
  with check (private.is_organization_member(organization_id));
create policy field_reports_update on public.field_reports
  for update to authenticated
  using (private.is_organization_member(organization_id))
  with check (private.is_organization_member(organization_id));

grant select, insert, update on public.field_reports to authenticated;
grant select, insert, update on public.field_reports to service_role;

create or replace function private.enforce_field_report_transition()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_role <> 'authenticated' then
    return new;
  end if;

  if old.status in ('SENT', 'ARCHIVED') then
    raise exception 'field_report % is terminal (status=%) and cannot transition to %',
      old.id, old.status, new.status
      using errcode = '22023';
  end if;

  if not (
    (old.status = 'DRAFT'     and new.status in ('REVIEWED', 'ARCHIVED')) or
    (old.status = 'REVIEWED'  and new.status in ('APPROVED', 'DRAFT', 'ARCHIVED')) or
    (old.status = 'APPROVED'  and new.status in ('SENT', 'ARCHIVED')) or
    (old.status = new.status)
  ) then
    raise exception 'field_report % cannot transition from % to %',
      old.id, old.status, new.status
      using errcode = '22023';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger field_reports_state_transition
  before update on public.field_reports
  for each row execute function private.enforce_field_report_transition();

-- =========================================================================
-- transition_field_report_review — DRAFT → REVIEWED (operator + note)
-- =========================================================================
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
  if target_new_status not in ('REVIEWED', 'APPROVED', 'SENT') then
    raise exception 'transition_field_report_review: invalid target status %', target_new_status
      using errcode = '22023';
  end if;

  if target_new_status = 'REVIEWED' then
    update public.field_reports
      set status = 'REVIEWED',
          reviewed_by_user_id = target_reviewer_user_id,
          reviewed_at = now()
    where id = target_report_id
      and organization_id = target_organization_id
      and status = 'DRAFT';
  elsif target_new_status = 'APPROVED' then
    update public.field_reports
      set status = 'APPROVED',
          approved_by_user_id = target_reviewer_user_id,
          approved_at = now()
    where id = target_report_id
      and organization_id = target_organization_id
      and status = 'REVIEWED';
  else -- SENT
    update public.field_reports
      set status = 'SENT',
          sent_at = now()
    where id = target_report_id
      and organization_id = target_organization_id
      and status = 'APPROVED';
  end if;

  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id,
      'field_report.transition_' || lower(target_new_status),
      'field_report', target_report_id,
      jsonb_build_object('reviewer_user_id', target_reviewer_user_id)
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.transition_field_report_review(uuid, uuid, uuid, text) from public, anon;
grant execute on function public.transition_field_report_review(uuid, uuid, uuid, text) to authenticated, service_role;

comment on function public.transition_field_report_review(uuid, uuid, uuid, text) is
  'Transition a field_report to REVIEWED / APPROVED / SENT. Reviewer must be ACTIVE member. Audit log on each transition. NO SEND EFFECT — a caller wiring the customer send does so through the C9 email boundary AFTER the report is APPROVED.';

-- =========================================================================
-- record_field_report_gaps — write drafter/AI gap output (DRAFT only)
-- =========================================================================
-- Same pattern as C23 record_quote_draft_gaps. AI/analyzer may propose
-- missing operational fields (e.g. "refrigerant_quantity_missing",
-- "leak_test_result_missing") that an operator must fill before the
-- report can transition to REVIEWED. AI must NEVER fabricate an
-- observation to close a gap — it can only surface the gap.
create or replace function public.record_field_report_gaps(
  target_organization_id uuid,
  target_report_id       uuid,
  target_report_gaps     jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'record_field_report_gaps: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if target_report_gaps is null or jsonb_typeof(target_report_gaps) <> 'array' then
    raise exception 'record_field_report_gaps: report_gaps must be a JSON array (got %)', jsonb_typeof(target_report_gaps)
      using errcode = '22023';
  end if;

  update public.field_reports
    set report_gaps = target_report_gaps,
        updated_at  = now()
  where id = target_report_id
    and organization_id = target_organization_id
    and status = 'DRAFT';

  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'field_report.report_gaps_recorded',
      'field_report', target_report_id,
      jsonb_build_object('gap_count', jsonb_array_length(target_report_gaps))
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.record_field_report_gaps(uuid, uuid, jsonb) from public, anon;
grant execute on function public.record_field_report_gaps(uuid, uuid, jsonb) to authenticated, service_role;

comment on function public.record_field_report_gaps(uuid, uuid, jsonb) is
  'Persist the drafter/AI output (list of missing operational fields). Only mutates DRAFT reports. Records audit_log. Never touches summary/status. AI must NEVER invent an observation to close a gap.';

-- Fast lookup for "DRAFT reports still waiting on operator input"
create index field_reports_pending_gaps_idx
  on public.field_reports (organization_id, created_at desc)
  where status = 'DRAFT' and jsonb_array_length(report_gaps) > 0;
