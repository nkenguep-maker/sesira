-- SESIRA Core Workflow — Shadow Mode execution support.
--
-- Two concerns bundled because Shadow's tenant-safety guarantees rest on
-- the workflow-engine primitives being sound:
--
-- 1. Extend `release_automation_run` with an optional `target_output_summary`
--    argument. Shadow executions must persist their decision (proposed
--    action, stop reason) atomically with the terminal transition — a
--    separate UPDATE would leave a window where a crashed worker could
--    complete a run without recording what it decided.
--
-- 2. Fix the P0 auth-check hole in `public.claim_automation_run`,
--    `public.release_automation_run` and `public.list_due_quote_followup_runs`.
--    They used `pg_has_role(session_user, 'service_role', 'MEMBER')` to allow
--    a service_role bypass, but on Supabase every PostgREST request runs as
--    `session_user = authenticator`, and `authenticator` is granted membership
--    of `service_role`. The predicate evaluates to TRUE for every
--    authenticated tenant caller — silently bypassing the org membership
--    guard on the workflow engine itself.
--
--    The corrective idiom is the same as
--    20260831000000_fix_idempotency_service_role_check.sql:
--    `(select auth.role()) = 'service_role'`. `auth.role()` reads the JWT
--    role claim; the service_role JWT sets it to 'service_role'. Neither
--    `session_user` nor `current_user` can discriminate reliably inside a
--    SECURITY DEFINER function on Supabase.

-- =========================================================================
-- 1. release_automation_run — accept an atomic output_summary payload
-- =========================================================================
-- The private primitive is extended first (SECURITY DEFINER, revoked from
-- ordinary roles). The public wrapper follows and re-applies the org
-- membership check with the corrected idiom.

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

revoke all on function private.release_automation_run(uuid, uuid, text, text, text, timestamptz, jsonb)
  from public, anon, authenticated, service_role;

comment on function private.release_automation_run(uuid, uuid, text, text, text, timestamptz, jsonb) is
  'Terminate a claimed automation_run. When target_output_summary is not null, persist it in the same atomic UPDATE as the terminal transition. Returns TRUE iff the caller still held a valid lease.';

-- The old 6-arg overload is dropped to prevent callers from pinning the
-- signature that could not record an output payload. Callers must pass
-- NULL for `target_output_summary` when they have no decision payload.
drop function if exists public.release_automation_run(uuid, uuid, text, text, text, timestamptz);
drop function if exists private.release_automation_run(uuid, uuid, text, text, text, timestamptz);

-- =========================================================================
-- 2. Public wrappers — corrective auth guard (auth.role())
-- =========================================================================

create or replace function public.claim_automation_run(
  target_run_id           uuid,
  target_organization_id  uuid,
  target_worker_id        text,
  lease_seconds           integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (
    private.is_organization_member(target_organization_id)
    or (select auth.role()) = 'service_role'
  ) then
    raise exception 'claim_automation_run: caller is not authorized for organization %', target_organization_id
      using errcode = '42501';
  end if;
  return private.claim_automation_run(
    target_run_id, target_organization_id, target_worker_id, lease_seconds
  );
end;
$$;

revoke all on function public.claim_automation_run(uuid, uuid, text, integer)
  from public, anon;
grant execute on function public.claim_automation_run(uuid, uuid, text, integer)
  to authenticated, service_role;

comment on function public.claim_automation_run(uuid, uuid, text, integer) is
  'Postgrest-exposed compare-and-set claim. Requires the caller to be an ACTIVE member of target_organization_id (or a service_role JWT). Two concurrent callers see at most one TRUE.';

create or replace function public.release_automation_run(
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
begin
  if not (
    private.is_organization_member(target_organization_id)
    or (select auth.role()) = 'service_role'
  ) then
    raise exception 'release_automation_run: caller is not authorized for organization %', target_organization_id
      using errcode = '42501';
  end if;
  return private.release_automation_run(
    target_run_id, target_organization_id, target_worker_id,
    terminal_status, error_message, next_attempt_at, target_output_summary
  );
end;
$$;

revoke all on function public.release_automation_run(uuid, uuid, text, text, text, timestamptz, jsonb)
  from public, anon;
grant execute on function public.release_automation_run(uuid, uuid, text, text, text, timestamptz, jsonb)
  to authenticated, service_role;

comment on function public.release_automation_run(uuid, uuid, text, text, text, timestamptz, jsonb) is
  'Postgrest-exposed atomic release. Accepts an optional output_summary payload persisted in the same UPDATE as the terminal transition. Requires ACTIVE membership of target_organization_id (or a service_role JWT).';

-- =========================================================================
-- 3. list_due_quote_followup_runs — corrective auth guard + expose level
-- =========================================================================
-- The due query gains `automation_config_level` in its projection so the
-- executor can dispatch to the correct mode (OBSERVATION / SHADOW / APPROVAL
-- / AUTOMATIC) without a second round-trip. Membership guard is corrected
-- inline (moved out of the WHERE into a top-level assertion so the query
-- planner is not asked to short-circuit membership per row).
--
-- `CREATE OR REPLACE FUNCTION` cannot change the OUT/RETURNS TABLE shape;
-- we drop the old definition first. Callers (typescript worker) must be
-- updated in lock-step with this migration.

drop function if exists public.list_due_quote_followup_runs(uuid, timestamptz, integer);

create or replace function public.list_due_quote_followup_runs(
  target_organization_id uuid,
  target_now             timestamptz,
  target_limit           integer
)
returns table (
  id                        uuid,
  organization_id           uuid,
  automation_config_id      uuid,
  automation_config_level   text,
  automation_config_config  jsonb,
  idempotency_key           text,
  scheduled_for             timestamptz,
  next_attempt_at           timestamptz,
  input_summary             jsonb,
  attempt_count             integer,
  quote_id                  uuid,
  step                      integer
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (
    private.is_organization_member(target_organization_id)
    or (select auth.role()) = 'service_role'
  ) then
    raise exception 'list_due_quote_followup_runs: caller is not authorized for organization %', target_organization_id
      using errcode = '42501';
  end if;

  return query
  select
    r.id,
    r.organization_id,
    r.automation_config_id,
    c.level                                         as automation_config_level,
    c.config                                        as automation_config_config,
    r.idempotency_key,
    r.scheduled_for,
    r.next_attempt_at,
    r.input_summary,
    r.attempt_count,
    q.id                                            as quote_id,
    ((r.input_summary ->> 'step')::integer)         as step
  from public.automation_runs r
  join public.automation_configs c
    on c.id = r.automation_config_id
   and c.organization_id = r.organization_id
  join public.quotes q
    on q.organization_id = r.organization_id
   and q.id = ((r.input_summary ->> 'quote_id')::uuid)
  where r.organization_id = target_organization_id
    and r.status = 'PENDING'
    and (r.scheduled_for is null or r.scheduled_for <= target_now)
    and (r.next_attempt_at is null or r.next_attempt_at <= target_now)
    and c.enabled = true
    and c.template_key = 'quote_followup_schedule'
    and q.automation_paused_at is null
    and q.opted_out_at is null
    and q.status in ('SENT', 'FOLLOWING_UP', 'NEEDS_HUMAN')
  order by r.scheduled_for asc nulls first, r.id asc
  limit least(greatest(target_limit, 0), 200);
end;
$$;

revoke all on function public.list_due_quote_followup_runs(uuid, timestamptz, integer)
  from public, anon;
grant execute on function public.list_due_quote_followup_runs(uuid, timestamptz, integer)
  to authenticated, service_role;

comment on function public.list_due_quote_followup_runs(uuid, timestamptz, integer) is
  'Returns PENDING quote-followup runs that have reached their scheduled_for AND whose owning quote is still eligible. Projects the owning config''s level and config so the executor can dispatch by mode. Requires ACTIVE membership of target_organization_id (or a service_role JWT).';
