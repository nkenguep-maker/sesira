-- SESIRA Core Workflow — approval-based controlled sending (C12).
--
-- C12 formalizes the APPROVAL step of the trust progression
-- OBSERVATION -> SHADOW -> APPROVAL -> CONTROLLED AUTOMATIC.
--
-- Under APPROVAL, a workflow executor decides a follow-up is due,
-- proposes a concrete action, and stages the automation_run in
-- WAITING_FOR_APPROVAL via public.release_automation_run
-- (terminal_status='WAITING_FOR_APPROVAL', output_summary=<proposal>).
-- The Attention operator sees the proposal, approves or rejects it,
-- and — if approved — an authenticated server action calls
-- `approve_automation_run_pending_approval` which:
--
--   * records the approver's decision + comment + timestamp,
--   * re-acquires a fresh lease on the run,
--   * transitions status back to RUNNING so a dispatcher can pick it
--     up and call sendGuardedEmail (C9) → release SUCCEEDED / FAILED.
--
-- If rejected, `reject_automation_run_pending_approval` transitions
-- the run to CANCELLED and records the decision. No provider call.
--
-- DOCTRINE INVARIANTS enforced here:
--
--   * AI confidence is NEVER an authorization. The approval decision
--     is a HUMAN act, recorded with the approver's user id — the
--     decided_by column is required and validated against
--     `private.is_organization_member`.
--
--   * The state-machine trigger for authenticated writes already
--     rejects invalid transitions on authenticated updates; these
--     SECURITY DEFINER RPCs re-enforce the WAITING_FOR_APPROVAL
--     precondition inline so a service_role caller cannot bypass
--     the intent.
--
--   * The decided_by user must be an ACTIVE member of the run's
--     organization. A revoked / suspended member cannot approve.
--
-- Deferred by design:
--   * "Approver ≠ Stager" segregation of duty — a policy toggle for
--     high-value flows; C15 will surface it.
--   * Approval quorum (2-of-N) — same.

-- =========================================================================
-- 1. approval columns on public.automation_runs
-- =========================================================================
alter table public.automation_runs
  add column approval_decision           text
    check (approval_decision is null or approval_decision in ('APPROVED', 'REJECTED')),
  add column approval_decided_at         timestamptz,
  add column approval_decided_by_user_id uuid,
  add column approval_comment            text
    check (approval_comment is null or length(approval_comment) <= 2000);

comment on column public.automation_runs.approval_decision is
  'Approver decision recorded by approve/reject RPCs. NULL until a human resolves the WAITING_FOR_APPROVAL state. Never overwritten silently — a fresh approval cycle requires a new run.';

comment on column public.automation_runs.approval_decided_by_user_id is
  'auth.users.id of the human who resolved the approval. Required to be an ACTIVE member of the run''s organization at decision time.';

create index automation_runs_awaiting_approval_idx
  on public.automation_runs (organization_id, created_at desc)
  where status = 'WAITING_FOR_APPROVAL';

-- =========================================================================
-- 2. approve_automation_run_pending_approval — WAITING_FOR_APPROVAL -> RUNNING
-- =========================================================================
create or replace function public.approve_automation_run_pending_approval(
  target_run_id             uuid,
  target_organization_id    uuid,
  target_approver_user_id   uuid,
  target_comment            text,
  target_dispatcher_worker  text,
  target_lease_seconds      integer default 300
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  if target_dispatcher_worker is null or length(target_dispatcher_worker) = 0 then
    raise exception 'approve_automation_run_pending_approval: dispatcher_worker is required'
      using errcode = '22023';
  end if;
  if target_lease_seconds is null or target_lease_seconds <= 0 then
    raise exception 'approve_automation_run_pending_approval: lease_seconds must be positive'
      using errcode = '22023';
  end if;
  if not private.is_organization_member(target_organization_id) then
    raise exception 'approve_automation_run_pending_approval: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.organization_members
    where organization_id = target_organization_id
      and user_id = target_approver_user_id
      and status = 'ACTIVE'
  ) then
    raise exception 'approve_automation_run_pending_approval: approver % is not an ACTIVE member of organization %',
      target_approver_user_id, target_organization_id
      using errcode = '42501';
  end if;

  update public.automation_runs
    set status                      = 'RUNNING',
        approval_decision           = 'APPROVED',
        approval_decided_at         = now(),
        approval_decided_by_user_id = target_approver_user_id,
        approval_comment            = target_comment,
        locked_at                   = now(),
        lock_expires_at             = now() + make_interval(secs => target_lease_seconds),
        locked_by                   = target_dispatcher_worker,
        attempt_count               = attempt_count + 1
  where id = target_run_id
    and organization_id = target_organization_id
    and status = 'WAITING_FOR_APPROVAL'
    and approval_decision is null;

  get diagnostics affected = row_count;
  return affected = 1;
end;
$$;

revoke all on function public.approve_automation_run_pending_approval(uuid, uuid, uuid, text, text, integer)
  from public, anon;
grant execute on function public.approve_automation_run_pending_approval(uuid, uuid, uuid, text, text, integer)
  to authenticated, service_role;

comment on function public.approve_automation_run_pending_approval(uuid, uuid, uuid, text, text, integer) is
  'Approve a WAITING_FOR_APPROVAL run. Transitions to RUNNING with a fresh lease for the dispatcher. Records the approver''s user id, timestamp, and comment. Returns true iff exactly one row transitioned. Enforces ACTIVE membership on both caller and approver.';

-- =========================================================================
-- 3. reject_automation_run_pending_approval — WAITING_FOR_APPROVAL -> CANCELLED
-- =========================================================================
create or replace function public.reject_automation_run_pending_approval(
  target_run_id           uuid,
  target_organization_id  uuid,
  target_approver_user_id uuid,
  target_comment          text
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
    raise exception 'reject_automation_run_pending_approval: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.organization_members
    where organization_id = target_organization_id
      and user_id = target_approver_user_id
      and status = 'ACTIVE'
  ) then
    raise exception 'reject_automation_run_pending_approval: approver % is not an ACTIVE member of organization %',
      target_approver_user_id, target_organization_id
      using errcode = '42501';
  end if;

  update public.automation_runs
    set status                      = 'CANCELLED',
        approval_decision           = 'REJECTED',
        approval_decided_at         = now(),
        approval_decided_by_user_id = target_approver_user_id,
        approval_comment            = target_comment,
        completed_at                = now(),
        locked_at                   = null,
        lock_expires_at             = null,
        locked_by                   = null
  where id = target_run_id
    and organization_id = target_organization_id
    and status = 'WAITING_FOR_APPROVAL'
    and approval_decision is null;

  get diagnostics affected = row_count;
  return affected = 1;
end;
$$;

revoke all on function public.reject_automation_run_pending_approval(uuid, uuid, uuid, text)
  from public, anon;
grant execute on function public.reject_automation_run_pending_approval(uuid, uuid, uuid, text)
  to authenticated, service_role;

comment on function public.reject_automation_run_pending_approval(uuid, uuid, uuid, text) is
  'Reject a WAITING_FOR_APPROVAL run. Transitions to CANCELLED, records the rejecter''s user id + comment. Returns true iff exactly one row transitioned. Enforces ACTIVE membership on both caller and approver. No provider effect.';
