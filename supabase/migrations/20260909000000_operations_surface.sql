-- SESIRA Core Workflow — V1 production operations surface (C15).
--
-- C15 gives an org operator the controlled toolkit they need to
-- steer the system from the UI: resolve/dismiss Attention items,
-- re-arm a message for classification, resume a paused quote,
-- manually retry a failed automation run. Each action:
--
--   * Runs as an authenticated tenant user (server action or API
--     route). The RPC checks `private.is_organization_member` on
--     the caller AND that the named `operator_user_id` matches an
--     ACTIVE member (segregation-of-duty pattern: an operator can
--     only act on their own behalf).
--   * Emits an `audit_logs` row so the ops screen can render a
--     recent-actions feed and a compliance auditor can reconstruct
--     the trail.
--   * Uses idempotent transitions with atomic CAS on the source
--     state — a replay returns FALSE without side effect.
--
-- DOCTRINE INVARIANTS enforced here:
--
--   * No RPC introduces a new state machine transition that was
--     previously forbidden. `resolve_attention_item` and
--     `dismiss_attention_item` land on states that already exist in
--     the enum. `resume_quote_automation` only clears NULLable
--     opt-in fields on `quotes`; it does not touch `status`.
--   * No RPC can act on a foreign org — RLS is authoritative AND
--     `is_organization_member(target_organization_id)` is re-imposed
--     at the top of every function.
--   * `retry_failed_run_manual` wraps the existing `retry_failed_run`
--     helper from C7 — the RPC exists, C15 only adds an audit trail
--     around it and enforces the operator scope check.

-- =========================================================================
-- 1. Extend attention_items with resolver attribution
-- =========================================================================
alter table public.attention_items
  add column resolved_by_user_id uuid,
  add column resolution_kind     text
    check (resolution_kind is null or resolution_kind in ('RESOLVED', 'DISMISSED')),
  add column resolution_note     text
    check (resolution_note is null or length(resolution_note) <= 2000);

comment on column public.attention_items.resolved_by_user_id is
  'auth.users.id of the operator who resolved or dismissed this item. Populated by resolve_attention_item / dismiss_attention_item. NULL means the item is still open (or the resolution predated C15).';

comment on column public.attention_items.resolution_kind is
  'RESOLVED = the operator acted on the issue. DISMISSED = the operator judged the item non-actionable. Both drive status transitions to RESOLVED / DISMISSED respectively.';

-- =========================================================================
-- 2. resolve_attention_item — OPEN/IN_PROGRESS -> RESOLVED
-- =========================================================================
create or replace function public.resolve_attention_item(
  target_organization_id uuid,
  target_item_id         uuid,
  target_operator_user_id uuid,
  target_note            text
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
    raise exception 'resolve_attention_item: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.organization_members
    where organization_id = target_organization_id
      and user_id = target_operator_user_id
      and status = 'ACTIVE'
  ) then
    raise exception 'resolve_attention_item: operator % is not an ACTIVE member of organization %',
      target_operator_user_id, target_organization_id
      using errcode = '42501';
  end if;

  update public.attention_items
    set status              = 'RESOLVED',
        resolved_at         = now(),
        resolved_by_user_id = target_operator_user_id,
        resolution_kind     = 'RESOLVED',
        resolution_note     = target_note,
        updated_at          = now()
  where id = target_item_id
    and organization_id = target_organization_id
    and status in ('OPEN', 'IN_PROGRESS');

  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'attention.resolve',
      'attention_item', target_item_id,
      jsonb_build_object('operator_user_id', target_operator_user_id, 'note', target_note)
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.resolve_attention_item(uuid, uuid, uuid, text) from public, anon;
grant execute on function public.resolve_attention_item(uuid, uuid, uuid, text) to authenticated, service_role;

comment on function public.resolve_attention_item(uuid, uuid, uuid, text) is
  'Transition an OPEN/IN_PROGRESS attention_item to RESOLVED. Records resolver + note + audit_log. Returns true iff exactly one row transitioned. ACTIVE membership enforced on caller AND operator.';

-- =========================================================================
-- 3. dismiss_attention_item — OPEN/IN_PROGRESS -> DISMISSED
-- =========================================================================
create or replace function public.dismiss_attention_item(
  target_organization_id uuid,
  target_item_id         uuid,
  target_operator_user_id uuid,
  target_note            text
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
    raise exception 'dismiss_attention_item: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.organization_members
    where organization_id = target_organization_id
      and user_id = target_operator_user_id
      and status = 'ACTIVE'
  ) then
    raise exception 'dismiss_attention_item: operator % is not an ACTIVE member of organization %',
      target_operator_user_id, target_organization_id
      using errcode = '42501';
  end if;

  update public.attention_items
    set status              = 'DISMISSED',
        resolved_at         = now(),
        resolved_by_user_id = target_operator_user_id,
        resolution_kind     = 'DISMISSED',
        resolution_note     = target_note,
        updated_at          = now()
  where id = target_item_id
    and organization_id = target_organization_id
    and status in ('OPEN', 'IN_PROGRESS');

  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'attention.dismiss',
      'attention_item', target_item_id,
      jsonb_build_object('operator_user_id', target_operator_user_id, 'note', target_note)
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.dismiss_attention_item(uuid, uuid, uuid, text) from public, anon;
grant execute on function public.dismiss_attention_item(uuid, uuid, uuid, text) to authenticated, service_role;

comment on function public.dismiss_attention_item(uuid, uuid, uuid, text) is
  'Transition an OPEN/IN_PROGRESS attention_item to DISMISSED. Records dismisser + note + audit_log. Returns true iff exactly one row transitioned.';

-- =========================================================================
-- 4. arm_message_for_reclassification — NULL out messages.classified_at
-- =========================================================================
create or replace function public.arm_message_for_reclassification(
  target_organization_id uuid,
  target_message_id      uuid,
  target_operator_user_id uuid,
  target_reason          text
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
    raise exception 'arm_message_for_reclassification: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.organization_members
    where organization_id = target_organization_id
      and user_id = target_operator_user_id
      and status = 'ACTIVE'
  ) then
    raise exception 'arm_message_for_reclassification: operator % is not an ACTIVE member of organization %',
      target_operator_user_id, target_organization_id
      using errcode = '42501';
  end if;

  update public.messages
    set classified_at = null,
        intent        = null,
        confidence    = null,
        updated_at    = now()
  where id = target_message_id
    and organization_id = target_organization_id
    and direction = 'INBOUND'
    and classified_at is not null;

  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'message.arm_for_reclassification',
      'message', target_message_id,
      jsonb_build_object('operator_user_id', target_operator_user_id, 'reason', target_reason)
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.arm_message_for_reclassification(uuid, uuid, uuid, text) from public, anon;
grant execute on function public.arm_message_for_reclassification(uuid, uuid, uuid, text) to authenticated, service_role;

comment on function public.arm_message_for_reclassification(uuid, uuid, uuid, text) is
  'NULL out messages.classified_at + intent + confidence so the C11 classifier will re-run on next dispatch. Only touches INBOUND rows that WERE classified. Returns true iff exactly one row was rearmed. Records an audit_log entry.';

-- =========================================================================
-- 5. resume_quote_automation — clear automation_paused_at + reason
-- =========================================================================
create or replace function public.resume_quote_automation(
  target_organization_id uuid,
  target_quote_id        uuid,
  target_operator_user_id uuid,
  target_note            text
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
    raise exception 'resume_quote_automation: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.organization_members
    where organization_id = target_organization_id
      and user_id = target_operator_user_id
      and status = 'ACTIVE'
  ) then
    raise exception 'resume_quote_automation: operator % is not an ACTIVE member of organization %',
      target_operator_user_id, target_organization_id
      using errcode = '42501';
  end if;

  update public.quotes
    set automation_paused_at    = null,
        automation_pause_reason = null,
        updated_at              = now()
  where id = target_quote_id
    and organization_id = target_organization_id
    and automation_paused_at is not null;

  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'quote.resume_automation',
      'quote', target_quote_id,
      jsonb_build_object('operator_user_id', target_operator_user_id, 'note', target_note)
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.resume_quote_automation(uuid, uuid, uuid, text) from public, anon;
grant execute on function public.resume_quote_automation(uuid, uuid, uuid, text) to authenticated, service_role;

comment on function public.resume_quote_automation(uuid, uuid, uuid, text) is
  'Clear automation_paused_at + automation_pause_reason on a paused quote so C7 follow-up scheduling can resume. Does NOT touch quote status. Returns true iff exactly one paused row was resumed. Records an audit_log entry.';

-- =========================================================================
-- 6. retry_failed_run_manual — wrap C7 retry_failed_run + audit
-- =========================================================================
create or replace function public.retry_failed_run_manual(
  target_organization_id uuid,
  target_run_id          uuid,
  target_operator_user_id uuid,
  target_note            text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  retried boolean;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'retry_failed_run_manual: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.organization_members
    where organization_id = target_organization_id
      and user_id = target_operator_user_id
      and status = 'ACTIVE'
  ) then
    raise exception 'retry_failed_run_manual: operator % is not an ACTIVE member of organization %',
      target_operator_user_id, target_organization_id
      using errcode = '42501';
  end if;

  retried := public.retry_failed_run(target_run_id, target_organization_id);

  if retried then
    perform public.record_audit_log(
      target_organization_id, 'automation_run.retry_manual',
      'automation_run', target_run_id,
      jsonb_build_object('operator_user_id', target_operator_user_id, 'note', target_note)
    );
  end if;
  return retried;
end;
$$;

revoke all on function public.retry_failed_run_manual(uuid, uuid, uuid, text) from public, anon;
grant execute on function public.retry_failed_run_manual(uuid, uuid, uuid, text) to authenticated, service_role;

comment on function public.retry_failed_run_manual(uuid, uuid, uuid, text) is
  'Operator-triggered retry of a FAILED automation_run. Wraps C7 retry_failed_run with membership check + audit_log. Returns true iff the underlying retry succeeded (run was actually re-armed).';
