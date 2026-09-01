-- SESIRA Core Workflow — deterministic Quote Follow-up scheduling
-- Reuses public.automation_configs, public.automation_runs,
-- public.quotes.next_action_at and public.events. No parallel workflow
-- system.
--
-- What this migration adds:
--   1. Four columns on public.automation_runs to represent the lifecycle
--      of a scheduled follow-up decision:
--        scheduled_for      — deterministic execution time
--        next_attempt_at    — retry timestamp (nullable, distinct from
--                             scheduled_for so back-off is auditable
--                             separately from the original due time)
--        locked_at          — moment the current lease was taken
--        lock_expires_at    — lease deadline; a run stuck in RUNNING
--                             past this is considered crashed and can
--                             be reclaimed by another worker
--        locked_by          — worker identity (short text)
--   2. A CHECK constraint pairing (locked_at, lock_expires_at,
--      locked_by) — either all three are NULL or all three are set.
--   3. Two indexes: one for the "due" query, one for the crash-recovery
--      reclaim query.
--   4. `private.claim_automation_run` / `private.release_automation_run`
--      — atomic compare-and-set primitives. SECURITY DEFINER so they
--      bypass the tenant_update RLS policy while enforcing org scoping
--      via arguments. Never called directly by tenant callers.
--   5. `public.claim_automation_run` / `public.release_automation_run`
--      — thin Postgrest-exposed wrappers that add a caller membership
--      check on top of the private primitives so an authenticated
--      tenant cannot fabricate a claim for a foreign org even if it
--      knows a foreign run id.
--   6. `public.list_due_quote_followup_runs(org, now, limit)` — the
--      canonical "due" query. Joins automation_runs to the referenced
--      quote and automation_config so stop guards (paused, opted-out,
--      terminal, replied, disabled config) are enforced in the DB and
--      the worker cannot pick up an ineligible run.
--
-- Not encoded here (documented for callers):
--   - The idempotency key format for a quote follow-up step lives in
--     src/lib/followups/schedule.ts (`quote_followup:{id}:step:{n}`).
--   - The J+3 / J+7 / J+14 default schedule and the org-configuration
--     override live in the same TypeScript module. The database only
--     stores `scheduled_for` as an opaque timestamp so different
--     schedules can coexist per org and per template_version.

alter table public.automation_runs
  add column scheduled_for   timestamptz,
  add column next_attempt_at timestamptz,
  add column locked_at       timestamptz,
  add column lock_expires_at timestamptz,
  add column locked_by       text;

alter table public.automation_runs
  add constraint automation_runs_lock_triple_paired
  check (
    (locked_at is null and lock_expires_at is null and locked_by is null)
    or (locked_at is not null and lock_expires_at is not null and locked_by is not null)
  );

alter table public.automation_runs
  add constraint automation_runs_lock_expires_after_locked
  check (lock_expires_at is null or lock_expires_at > locked_at);

-- Partial index for the "due" scan. Matches PENDING runs whose
-- scheduled_for or next_attempt_at has arrived.
create index automation_runs_due_idx
  on public.automation_runs (organization_id, scheduled_for)
  where status = 'PENDING';

-- Partial index for the crash-recovery scan. Matches RUNNING runs
-- whose lease has expired.
create index automation_runs_expired_lease_idx
  on public.automation_runs (lock_expires_at)
  where status = 'RUNNING';

-- Claim a run atomically. Returns TRUE iff the caller is now the lease
-- holder. Semantics:
--   * PENDING with scheduled_for/next_attempt_at reached → claim.
--   * RUNNING with expired lease → reclaim (attempt_count is bumped).
--   * Otherwise (RUNNING with valid lease, terminal statuses, or not
--     yet due) → false, no state change.
--
-- SECURITY DEFINER so it can bypass the tenant_update policy on
-- automation_runs; the function still enforces organization scoping
-- via its own filter on organization_id (passed as an argument).
create or replace function private.claim_automation_run(
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
declare
  affected integer;
begin
  if target_worker_id is null or length(target_worker_id) = 0 then
    raise exception 'claim_automation_run: worker_id is required';
  end if;
  if lease_seconds is null or lease_seconds <= 0 then
    raise exception 'claim_automation_run: lease_seconds must be positive';
  end if;

  update public.automation_runs
  set
    status          = 'RUNNING',
    locked_at       = now(),
    lock_expires_at = now() + make_interval(secs => lease_seconds),
    locked_by       = target_worker_id,
    started_at      = coalesce(started_at, now()),
    attempt_count   = attempt_count + case when status = 'RUNNING' then 1 else 0 end
  where id = target_run_id
    and organization_id = target_organization_id
    and (
      (status = 'PENDING'
       and (scheduled_for is null or scheduled_for <= now())
       and (next_attempt_at is null or next_attempt_at <= now()))
      or
      (status = 'RUNNING' and lock_expires_at < now())
    );

  get diagnostics affected = row_count;
  return affected = 1;
end;
$$;

revoke all on function private.claim_automation_run(uuid, uuid, text, integer)
  from public, anon, authenticated, service_role;

comment on function private.claim_automation_run(uuid, uuid, text, integer) is
  'Compare-and-set claim of an automation_runs row. Returns TRUE iff this call is the current lease holder. Two concurrent callers see at most one TRUE for the same run. Reclaims RUNNING runs whose lease has expired (attempt_count is bumped in that case).';

-- Release a run — succeeds only when the caller still holds the lease.
-- terminal_status must be one of SUCCEEDED, FAILED, CANCELLED. A stale
-- worker cannot mark a run SUCCEEDED after its lease has expired and
-- another worker has taken over.
create or replace function private.release_automation_run(
  target_run_id          uuid,
  target_organization_id uuid,
  target_worker_id       text,
  terminal_status        text,
  error_message          text default null,
  next_attempt_at        timestamptz default null
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

revoke all on function private.release_automation_run(uuid, uuid, text, text, text, timestamptz)
  from public, anon, authenticated, service_role;

comment on function private.release_automation_run(uuid, uuid, text, text, text, timestamptz) is
  'Terminate a claimed automation_run. Returns TRUE iff the caller still held a valid lease. Prevents stale workers from overwriting a reclaimed run.';

comment on column public.automation_runs.scheduled_for is
  'Deterministic execution time. For quote follow-ups: sent_at + template offset (default J+3/J+7/J+14).';
comment on column public.automation_runs.next_attempt_at is
  'Retry timestamp after a transient failure. Distinct from scheduled_for so back-off is auditable separately from the original due time.';
comment on column public.automation_runs.locked_at is
  'When the current lease was taken. Paired with lock_expires_at and locked_by.';
comment on column public.automation_runs.lock_expires_at is
  'Lease deadline. A RUNNING run whose lock_expires_at is in the past is considered crashed and can be reclaimed by another worker.';
comment on column public.automation_runs.locked_by is
  'Worker identity for observability. Reclaims overwrite this field.';

-- =========================================================================
-- Public wrappers exposed via Postgrest
-- =========================================================================
-- The private primitives above enforce org-id scoping in their WHERE clause
-- but do NOT verify that the calling identity is a member of the target
-- organization. Any caller with EXECUTE could otherwise fabricate a claim
-- for a foreign org's run if it guessed both the run id and the org id.
--
-- The public wrappers add that membership check as defense in depth. They
-- are SECURITY DEFINER so they can invoke the private primitives (whose
-- EXECUTE is revoked from every ordinary role).

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
    or pg_has_role(session_user, 'service_role', 'MEMBER')
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
  'Postgrest-exposed compare-and-set claim. Requires the caller to be an ACTIVE member of target_organization_id (or service_role). Two concurrent callers see at most one TRUE.';

create or replace function public.release_automation_run(
  target_run_id          uuid,
  target_organization_id uuid,
  target_worker_id       text,
  terminal_status        text,
  error_message          text default null,
  next_attempt_at        timestamptz default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (
    private.is_organization_member(target_organization_id)
    or pg_has_role(session_user, 'service_role', 'MEMBER')
  ) then
    raise exception 'release_automation_run: caller is not authorized for organization %', target_organization_id
      using errcode = '42501';
  end if;
  return private.release_automation_run(
    target_run_id, target_organization_id, target_worker_id,
    terminal_status, error_message, next_attempt_at
  );
end;
$$;

revoke all on function public.release_automation_run(uuid, uuid, text, text, text, timestamptz)
  from public, anon;
grant execute on function public.release_automation_run(uuid, uuid, text, text, text, timestamptz)
  to authenticated, service_role;

comment on function public.release_automation_run(uuid, uuid, text, text, text, timestamptz) is
  'Postgrest-exposed release. Requires membership + lease ownership. A stale worker cannot mark a reclaimed run terminal.';

-- =========================================================================
-- Due query — canonical join with stop guards
-- =========================================================================
-- Reads automation_runs → automation_configs → quotes and applies every
-- stop guard the follow-up worker must honour:
--   * status = 'PENDING'                         (nothing already claimed)
--   * scheduled_for reached / next_attempt_at reached
--   * automation_configs.enabled = true          (automation disabled)
--   * automation_configs.template_key = 'quote_followup_schedule'
--   * quotes.automation_paused_at IS NULL        (manual / complaint pause)
--   * quotes.opted_out_at IS NULL                (customer opted out)
--   * quotes.status ∈ (SENT, FOLLOWING_UP, NEEDS_HUMAN)
--       — excludes REPLIED (customer replied → human review),
--         WON / LOST / EXPIRED (terminal),
--         DRAFT (not yet sent).
-- The quote id is stored inside input_summary because a run row is
-- template-neutral; the join extracts (input_summary ->> 'quote_id').
create or replace function public.list_due_quote_followup_runs(
  target_organization_id uuid,
  target_now             timestamptz,
  target_limit           integer
)
returns table (
  id                   uuid,
  organization_id      uuid,
  automation_config_id uuid,
  idempotency_key      text,
  scheduled_for        timestamptz,
  next_attempt_at      timestamptz,
  input_summary        jsonb,
  attempt_count        integer,
  quote_id             uuid,
  step                 integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    r.id,
    r.organization_id,
    r.automation_config_id,
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
    and (
      private.is_organization_member(target_organization_id)
      or pg_has_role(session_user, 'service_role', 'MEMBER')
    )
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
$$;

revoke all on function public.list_due_quote_followup_runs(uuid, timestamptz, integer)
  from public, anon;
grant execute on function public.list_due_quote_followup_runs(uuid, timestamptz, integer)
  to authenticated, service_role;

comment on function public.list_due_quote_followup_runs(uuid, timestamptz, integer) is
  'Returns PENDING quote-followup runs that have reached their scheduled_for / next_attempt_at AND whose owning quote is still eligible (not paused, not opted-out, not replied/won/lost/expired, config enabled). Ordered by scheduled_for. Limited to 200.';
