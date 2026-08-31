-- SESIRA Core Workflow — Incident dedup + retry counting (C7).
--
-- Three concerns bundled because they form one boundary — deterministic
-- failure handling for workflow execution:
--
-- 1. `incidents` gains a stable fingerprint + recurrence count, so a
--    retry loop that repeatedly exhausts against the same failure does
--    NOT create one incident per scheduler pass. The partial unique
--    index is scoped to OPEN/INVESTIGATING statuses only — once the
--    incident is RESOLVED or IGNORED, a fresh occurrence with the same
--    fingerprint may open a new incident (the resolution "closed the
--    ticket" and the next failure is a legitimately new event).
--
-- 2. `public.record_incident_once(...)` — insert-or-recur helper.
--    ON CONFLICT bumps recurrence_count and last_seen_at, returns the
--    original id with `created=false`. Same pattern as insert_event_once
--    / insert_attention_once. Membership-checked via auth.role().
--
-- 3. `release_automation_run(..., 'PENDING', ...)` now bumps
--    attempt_count — so voluntary retries scheduled by the runner are
--    counted alongside crash-recovery reclaims. The runner uses the
--    counted attempt to decide "one more try" vs "exhausted".
--
-- Also introduces `public.retry_failed_run(...)` — a manual-retry RPC
-- that transitions FAILED -> PENDING atomically, resets error and sets
-- next_attempt_at = now(). Used by operator UI (server action) when a
-- transient failure was mis-classified as permanent, or when the
-- underlying issue has been fixed by hand.

-- =========================================================================
-- 1. incidents table — add fingerprint + recurrence + metadata columns
-- =========================================================================

alter table public.incidents
  add column if not exists fingerprint text,
  add column if not exists recurrence_count integer not null default 1
    check (recurrence_count >= 1),
  add column if not exists first_seen_at timestamptz not null default now(),
  add column if not exists last_seen_at timestamptz not null default now(),
  add column if not exists metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object');

comment on column public.incidents.fingerprint is
  'Stable identity for de-duplication. Format: {source_kind}:{entity_type}:{entity_id}:{error_class}. NULL for hand-created incidents that carry no automatic identity.';
comment on column public.incidents.recurrence_count is
  'Number of times the same fingerprint has fired against an OPEN/INVESTIGATING incident. Reset to 1 when a fresh incident is opened after resolution.';
comment on column public.incidents.first_seen_at is
  'First time this specific incident row was opened. Older than created_at only when the column is backfilled from another source (never on happy path).';
comment on column public.incidents.last_seen_at is
  'Most recent recurrence timestamp. Bumped by record_incident_once on every dedup hit.';
comment on column public.incidents.metadata is
  'Free-form structured context. Callers embed error_class, error_message, attempt_count, worker_id — anything a human might need to triage without opening the DB.';

-- Partial unique so RESOLVED/IGNORED incidents do not shadow a fresh
-- occurrence of the same fingerprint (a resolution "closed the ticket").
drop index if exists public.incidents_open_fingerprint_idx;
create unique index incidents_open_fingerprint_idx
  on public.incidents (organization_id, fingerprint)
  where fingerprint is not null and status in ('OPEN', 'INVESTIGATING');

comment on index public.incidents_open_fingerprint_idx is
  'Ensures at most one OPEN or INVESTIGATING incident per (organization, fingerprint). RESOLVED/IGNORED rows do NOT participate — a fresh failure after resolution opens a new incident on the same fingerprint.';

-- =========================================================================
-- 2. record_incident_once — insert-or-recur RPC
-- =========================================================================

create or replace function private.record_incident_once(
  target_organization_id uuid,
  target_fingerprint     text,
  target_severity        text,
  target_category        text,
  target_title           text,
  target_description     text,
  target_entity_type     text,
  target_entity_id       uuid,
  target_metadata        jsonb
)
returns table (id uuid, created boolean, recurrence_count integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_row public.incidents%rowtype;
  inserted_id uuid;
begin
  if target_fingerprint is null or length(target_fingerprint) = 0 then
    raise exception 'record_incident_once: fingerprint is required'
      using errcode = '22023';
  end if;
  if target_severity not in ('P1', 'P2', 'P3', 'P4') then
    raise exception 'record_incident_once: invalid severity %', target_severity
      using errcode = '22023';
  end if;

  select * into existing_row
  from public.incidents
  where organization_id = target_organization_id
    and fingerprint = target_fingerprint
    and status in ('OPEN', 'INVESTIGATING')
  limit 1;

  if found then
    update public.incidents as inc
    set
      recurrence_count = existing_row.recurrence_count + 1,
      last_seen_at     = now(),
      updated_at       = now(),
      -- shallow merge: caller-supplied keys override existing ones so
      -- the most recent occurrence's context is preserved. Historical
      -- context lives in audit_logs.
      metadata         = existing_row.metadata || coalesce(target_metadata, '{}'::jsonb)
    where inc.id = existing_row.id;

    record_incident_once.id               := existing_row.id;
    record_incident_once.created          := false;
    record_incident_once.recurrence_count := existing_row.recurrence_count + 1;
    return next;
    return;
  end if;

  insert into public.incidents (
    organization_id, fingerprint, severity, category, title, description,
    entity_type, entity_id, metadata, first_seen_at, last_seen_at
  )
  values (
    target_organization_id, target_fingerprint, target_severity, target_category,
    target_title, target_description, target_entity_type, target_entity_id,
    coalesce(target_metadata, '{}'::jsonb), now(), now()
  )
  returning incidents.id into inserted_id;

  record_incident_once.id               := inserted_id;
  record_incident_once.created          := true;
  record_incident_once.recurrence_count := 1;
  return next;
  return;
end;
$$;

revoke all on function private.record_incident_once(uuid, text, text, text, text, text, text, uuid, jsonb)
  from public, anon, authenticated, service_role;

create or replace function public.record_incident_once(
  target_organization_id uuid,
  target_fingerprint     text,
  target_severity        text,
  target_category        text,
  target_title           text,
  target_description     text default null,
  target_entity_type     text default null,
  target_entity_id       uuid default null,
  target_metadata        jsonb default '{}'::jsonb
)
returns table (id uuid, created boolean, recurrence_count integer)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (
    private.is_organization_member(target_organization_id)
    or (select auth.role()) = 'service_role'
  ) then
    raise exception 'record_incident_once: caller is not authorized for organization %', target_organization_id
      using errcode = '42501';
  end if;

  return query
  select * from private.record_incident_once(
    target_organization_id, target_fingerprint, target_severity, target_category,
    target_title, target_description, target_entity_type, target_entity_id,
    target_metadata
  );
end;
$$;

revoke all on function public.record_incident_once(uuid, text, text, text, text, text, text, uuid, jsonb)
  from public, anon;
grant execute on function public.record_incident_once(uuid, text, text, text, text, text, text, uuid, jsonb)
  to authenticated, service_role;

comment on function public.record_incident_once(uuid, text, text, text, text, text, text, uuid, jsonb) is
  'Replay-safe incident insert. If an OPEN/INVESTIGATING incident with the same (org, fingerprint) exists: bump recurrence_count + last_seen_at, merge metadata, return created=false. Otherwise insert. Membership-checked via auth.role().';

-- =========================================================================
-- 3. release_automation_run — bump attempt_count on voluntary retry
-- =========================================================================
-- The prior signature (C5) did not bump attempt_count when a runner
-- voluntarily released a run as PENDING for a scheduled retry — only
-- crash reclaim in claim_automation_run bumped. That left the runner
-- unable to enforce a bounded attempt budget across voluntary retries.
--
-- Redefine private.release_automation_run to bump attempt_count when
-- terminal_status = 'PENDING'. Public wrapper is unchanged.

create or replace function private.release_automation_run(
  target_run_id          uuid,
  target_organization_id uuid,
  target_worker_id       text,
  terminal_status        text,
  error_message          text default null,
  next_attempt_at        timestamptz default null,
  target_output_summary  jsonb default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  if terminal_status not in ('SUCCEEDED', 'FAILED', 'CANCELLED', 'WAITING_FOR_APPROVAL', 'PENDING') then
    raise exception 'release_automation_run: invalid terminal_status %', terminal_status;
  end if;

  update public.automation_runs
  set
    status          = terminal_status,
    error           = error_message,
    completed_at    = case when terminal_status in ('SUCCEEDED', 'FAILED', 'CANCELLED') then now() else completed_at end,
    next_attempt_at = case when terminal_status = 'PENDING' then release_automation_run.next_attempt_at else automation_runs.next_attempt_at end,
    output_summary  = case when target_output_summary is null then automation_runs.output_summary else target_output_summary end,
    -- Voluntary retry: bump the attempt counter so the runner can enforce
    -- a bounded budget across releases. Crash reclaims bump inside
    -- claim_automation_run — the two paths are additive on purpose.
    attempt_count   = case when terminal_status = 'PENDING' then automation_runs.attempt_count + 1 else automation_runs.attempt_count end,
    locked_at       = null,
    lock_expires_at = null,
    locked_by       = null
  where id = target_run_id
    and organization_id = target_organization_id
    and status = 'RUNNING'
    and locked_by = target_worker_id
    and lock_expires_at > now();

  get diagnostics affected = row_count;
  return affected = 1;
end;
$$;

-- =========================================================================
-- 4. retry_failed_run — manual operator retry of a FAILED run
-- =========================================================================
-- Transitions FAILED -> PENDING atomically, clears error, sets
-- next_attempt_at = now() so the next scheduler pass claims it. The
-- attempt_count is NOT reset: an exhausted run rejoining the queue
-- should still exhaust the same budget on the next cycle unless the
-- caller intends to lift the ceiling (a separate concern).

create or replace function public.retry_failed_run(
  target_run_id          uuid,
  target_organization_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  if not (
    private.is_organization_member(target_organization_id)
    or (select auth.role()) = 'service_role'
  ) then
    raise exception 'retry_failed_run: caller is not authorized for organization %', target_organization_id
      using errcode = '42501';
  end if;

  update public.automation_runs
  set
    status          = 'PENDING',
    error           = null,
    next_attempt_at = now(),
    completed_at    = null
  where id = target_run_id
    and organization_id = target_organization_id
    and status = 'FAILED';

  get diagnostics affected = row_count;
  return affected = 1;
end;
$$;

revoke all on function public.retry_failed_run(uuid, uuid)
  from public, anon;
grant execute on function public.retry_failed_run(uuid, uuid)
  to authenticated, service_role;

comment on function public.retry_failed_run(uuid, uuid) is
  'Manual retry: FAILED -> PENDING atomically. Only succeeds for runs currently in FAILED status; other statuses are no-ops (returns false). attempt_count is preserved so the runner still enforces the original budget.';
