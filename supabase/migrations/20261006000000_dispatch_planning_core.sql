-- SESIRA Core Workflow — Dispatch planning core (C41, WAVE post-C40 backend).
--
-- Adds the backend contract for team dispatch / planning avancé requested by
-- product for the Stitch UX (dispatch board). Reference: docs/core/CORE_EXTENSIONS_PLAN.md §7 C41.
--
-- Adds:
--   * NEW table field_vehicles — org-scoped fleet inventory (label, registration,
--     external_ref, status). RLS org-scoped. Composite unique (id, organization_id)
--     enables downstream FKs (C42 fleet telemetry).
--   * NEW table technician_availability_blocks — leave / sick / training windows.
--     Feeds the DISPATCH_CONFLICT scanner (AVAILABILITY_BLOCKED kind).
--   * NEW table intervention_dispatch_assignments — technician × intervention ×
--     vehicle × window × route order. DISTINCT state machine from interventions.status.
--     version column enables compare-and-set. idempotency_key partial-unique for retry-safe
--     assign_dispatch. Composite FK back to (interventions.id, organization_id) enforces
--     tenant safety.
--   * State machine `dispatch_status` : DRAFT → ASSIGNED → ACKNOWLEDGED → EN_ROUTE →
--     ARRIVED → IN_PROGRESS → COMPLETED, + CANCELLED (terminal), + NEEDS_ATTENTION
--     (parking, back to ASSIGNED/ACKNOWLEDGED/EN_ROUTE/CANCELLED).
--   * 8 SECURITY DEFINER RPCs: assign_dispatch, acknowledge_dispatch, mark_en_route,
--     reorder_route, release_assignment, get_team_dispatch_day, get_dispatch_conflicts,
--     scan_dispatch_attentions.
--
-- DOCTRINE INVARIANTS APPLIED:
--
--   Distinct state machines, explicit compatibility rules:
--     * `interventions.status` remains authoritative for the WORK cycle
--       (PLANNED / CONFIRMED / IN_PROGRESS / COMPLETED / CANCELLED / NEEDS_ATTENTION).
--     * `intervention_dispatch_assignments.dispatch_status` is authoritative for the
--       LOGISTICS cycle. Transitions into dispatch COMPLETED require the intervention
--       to already be COMPLETED or NEEDS_ATTENTION (checked by trigger and RPCs).
--       Transitions into dispatch CANCELLED are ALWAYS allowed regardless of the
--       intervention's current status (a technician can be pulled off a call at any
--       stage of the underlying job).
--     * Two independent state machines with a well-typed compat guard is deliberately
--       simpler than one merged machine — it lets Ops cancel/reassign the dispatch
--       without mutating the work record.
--
--   Compare-and-set (CAS):
--     * `version integer not null default 1` ratchets on every RPC-driven mutation.
--       Callers pass `target_version_expected`; RPCs raise `40001` on mismatch and
--       write an audit row of action `dispatch.assign_conflict` (or the matching
--       transition name) so stale-write attempts are observable, not silent.
--
--   Idempotency:
--     * `idempotency_key` on the assignment table + partial unique
--       (organization_id, idempotency_key) — assign_dispatch called twice with the
--       same key is a no-op returning the existing row (created=false).
--
--   Multi-tenant boundary:
--     * Every RPC checks `private.is_organization_member(target_organization_id)`
--       before any row lookup — tenant B's assignment_id never leaks to tenant A.
--     * Every RLS policy checks the same predicate.
--     * `intervention_dispatch_assignments.technician_user_id` protected by a
--       BEFORE INSERT / BEFORE UPDATE trigger calling
--       `private.assert_tenant_active_assignment(org, user)` — technicians from
--       tenant B can never be assigned by tenant A.
--     * FKs are composite `(id, organization_id)` where possible (interventions,
--       field_vehicles) — postgres enforces tenant safety at the schema level.
--
--   Timezone discipline:
--     * `get_team_dispatch_day(org, day::date, timezone::text)` takes an explicit
--       timezone and computes the day window via `AT TIME ZONE target_timezone`.
--       There is no implicit UTC-boundary rule — the ops board is always tied to
--       the org's local day.
--
--   Attention scanner is CALLED, not scheduled:
--     * `scan_dispatch_attentions(org)` returns the count of newly-inserted rows
--       via `public.insert_attention_once` — idempotent via a stable key. Meant
--       to be invoked from the Today engine cron or a manual /ops/scan endpoint,
--       never from a state-machine trigger (RPCs enforce transitions, not scans).
--
--   Wording strict — SESIRA never fabricates a "conforme" verdict, and this
--   milestone never fabricates an ETA or a driver score. `get_dispatch_conflicts`
--   reports facts (double booking, invalid window, inactive tech, availability
--   overlap) — it does not RANK technicians nor infer intent.
--
-- Non-goals (deliberately deferred to C42+):
--   * GPS telemetry, ETA calculation, geofence events (→ C42).
--   * Signature evidence, offline binaries (→ C43).
--   * SMS notification of the tech about a new assignment (→ C44).

-- =========================================================================
-- Section 1 — field_vehicles
-- =========================================================================
create table public.field_vehicles (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  label             text not null check (length(label) between 1 and 120),
  registration      text check (registration is null or length(registration) between 1 and 32),
  external_ref      text check (external_ref is null or length(external_ref) between 1 and 120),
  status            text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'UNAVAILABLE', 'RETIRED')),
  metadata          jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (id, organization_id)
);

comment on table public.field_vehicles is
  'Org-scoped fleet inventory. Referenced by intervention_dispatch_assignments.vehicle_id via composite FK — tenant safety enforced at schema level. status RETIRED is a soft delete: rows are kept for audit / historical dispatch board reconstruction.';

create unique index field_vehicles_org_external_ref_uniq on public.field_vehicles (organization_id, external_ref)
  where external_ref is not null;
create unique index field_vehicles_org_registration_uniq on public.field_vehicles (organization_id, lower(registration))
  where registration is not null;
create index field_vehicles_org_status_idx on public.field_vehicles (organization_id, status);

alter table public.field_vehicles enable row level security;

create policy field_vehicles_select on public.field_vehicles
  for select to authenticated
  using (private.is_organization_member(organization_id));
create policy field_vehicles_insert on public.field_vehicles
  for insert to authenticated
  with check (private.is_organization_member(organization_id));
create policy field_vehicles_update on public.field_vehicles
  for update to authenticated
  using (private.is_organization_member(organization_id))
  with check (private.is_organization_member(organization_id));

grant select, insert, update on public.field_vehicles to authenticated;
grant select, insert, update on public.field_vehicles to service_role;

-- =========================================================================
-- Section 2 — technician_availability_blocks
-- =========================================================================
create table public.technician_availability_blocks (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  user_id           uuid not null,
  from_at           timestamptz not null,
  to_at             timestamptz not null check (to_at > from_at),
  reason            text not null
    check (reason in ('LEAVE', 'SICK', 'TRAINING', 'OTHER')),
  source            text not null default 'MANUAL'
    check (source in ('MANUAL', 'SYSTEM')),
  note              text check (note is null or length(note) <= 500),
  created_at        timestamptz not null default now()
);

comment on table public.technician_availability_blocks is
  'Windows during which a technician is not available for dispatch (leave, sick, training, other). Feeds the DISPATCH_CONFLICT scanner (AVAILABILITY_BLOCKED kind). No FK on user_id — protected instead by a BEFORE trigger calling private.assert_tenant_active_assignment.';

create index tab_org_user_window_idx on public.technician_availability_blocks
  (organization_id, user_id, from_at, to_at);

alter table public.technician_availability_blocks enable row level security;

create policy tab_select on public.technician_availability_blocks
  for select to authenticated
  using (private.is_organization_member(organization_id));
create policy tab_insert on public.technician_availability_blocks
  for insert to authenticated
  with check (private.is_organization_member(organization_id));
create policy tab_update on public.technician_availability_blocks
  for update to authenticated
  using (private.is_organization_member(organization_id))
  with check (private.is_organization_member(organization_id));

grant select, insert, update on public.technician_availability_blocks to authenticated;
grant select, insert, update on public.technician_availability_blocks to service_role;

create or replace function private.enforce_availability_block_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_tenant_active_assignment(new.organization_id, new.user_id);
  return new;
end;
$$;

create trigger tab_enforce_membership
  before insert on public.technician_availability_blocks
  for each row execute function private.enforce_availability_block_membership();

create trigger tab_enforce_membership_update
  before update of user_id on public.technician_availability_blocks
  for each row execute function private.enforce_availability_block_membership();

-- =========================================================================
-- Section 3 — intervention_dispatch_assignments
-- =========================================================================
create table public.intervention_dispatch_assignments (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations(id) on delete cascade,
  intervention_id       uuid not null,
  technician_user_id    uuid not null,
  vehicle_id            uuid,
  scheduled_start       timestamptz not null,
  scheduled_end         timestamptz not null check (scheduled_end > scheduled_start),
  route_order           integer check (route_order is null or (route_order between 0 and 500)),
  dispatch_status       text not null default 'DRAFT'
    check (dispatch_status in (
      'DRAFT', 'ASSIGNED', 'ACKNOWLEDGED', 'EN_ROUTE', 'ARRIVED',
      'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NEEDS_ATTENTION'
    )),
  version               integer not null default 1 check (version >= 1),
  acknowledged_at       timestamptz,
  en_route_at           timestamptz,
  arrived_at            timestamptz,
  started_at            timestamptz,
  completed_at          timestamptz,
  cancelled_at          timestamptz,
  cancellation_reason   text check (cancellation_reason is null or length(cancellation_reason) <= 500),
  idempotency_key       text check (idempotency_key is null or length(idempotency_key) between 1 and 200),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  foreign key (intervention_id, organization_id) references public.interventions(id, organization_id) on delete cascade,
  foreign key (vehicle_id, organization_id) references public.field_vehicles(id, organization_id) on delete set null,
  unique (id, organization_id)
);

comment on table public.intervention_dispatch_assignments is
  'Dispatch board row: technician × intervention × (optional vehicle) × time window × route order. DISTINCT state machine from interventions.status. version column ratchets on every RPC mutation for compare-and-set. idempotency_key allows retry-safe assign_dispatch.';

comment on column public.intervention_dispatch_assignments.dispatch_status is
  'Distinct from interventions.status. DRAFT→ASSIGNED→ACKNOWLEDGED→EN_ROUTE→ARRIVED→IN_PROGRESS→COMPLETED, plus CANCELLED (terminal) and NEEDS_ATTENTION (parking, back to ASSIGNED/ACKNOWLEDGED/EN_ROUTE/CANCELLED). Transitions enforced by private.enforce_dispatch_state_transition() trigger + RPCs.';

comment on column public.intervention_dispatch_assignments.version is
  'CAS ratchet. RPCs verify target_version_expected matches current version, then increment. Raises 40001 (serialization_failure) on mismatch and records dispatch.*_conflict audit.';

create unique index ida_org_idempotency_uniq on public.intervention_dispatch_assignments
  (organization_id, idempotency_key)
  where idempotency_key is not null;

create index ida_org_tech_time_idx on public.intervention_dispatch_assignments
  (organization_id, technician_user_id, scheduled_start);
create index ida_org_intervention_idx on public.intervention_dispatch_assignments
  (organization_id, intervention_id);
create index ida_org_status_open_idx on public.intervention_dispatch_assignments
  (organization_id, dispatch_status)
  where dispatch_status not in ('COMPLETED', 'CANCELLED');
create index ida_org_vehicle_time_idx on public.intervention_dispatch_assignments
  (organization_id, vehicle_id, scheduled_start)
  where vehicle_id is not null;
create index ida_org_route_idx on public.intervention_dispatch_assignments
  (organization_id, technician_user_id, scheduled_start, route_order)
  where route_order is not null;

alter table public.intervention_dispatch_assignments enable row level security;

create policy ida_select on public.intervention_dispatch_assignments
  for select to authenticated
  using (private.is_organization_member(organization_id));
create policy ida_insert on public.intervention_dispatch_assignments
  for insert to authenticated
  with check (private.is_organization_member(organization_id));
create policy ida_update on public.intervention_dispatch_assignments
  for update to authenticated
  using (private.is_organization_member(organization_id))
  with check (private.is_organization_member(organization_id));

grant select, insert, update on public.intervention_dispatch_assignments to authenticated;
grant select, insert, update on public.intervention_dispatch_assignments to service_role;

-- =========================================================================
-- Section 4 — State machine transition trigger
-- =========================================================================
-- Enforces the dispatch state machine on UPDATE. Terminal states (COMPLETED,
-- CANCELLED) are immutable. Cross-machine compat guard: dispatch → COMPLETED
-- requires interventions.status IN (COMPLETED, NEEDS_ATTENTION). Dispatch →
-- CANCELLED is always allowed (a tech can be pulled at any intervention stage).
-- Auto-stamps the matching *_at column when transitioning into a state.
create or replace function private.enforce_dispatch_state_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  intervention_status text;
begin
  new.updated_at := now();

  if new.dispatch_status = old.dispatch_status then
    return new;
  end if;

  if old.dispatch_status in ('COMPLETED', 'CANCELLED') then
    raise exception 'dispatch: terminal state % is immutable (assignment %)', old.dispatch_status, old.id
      using errcode = '22023';
  end if;

  if not (
    (old.dispatch_status = 'DRAFT'           and new.dispatch_status in ('ASSIGNED', 'CANCELLED', 'NEEDS_ATTENTION'))
    or (old.dispatch_status = 'ASSIGNED'        and new.dispatch_status in ('ACKNOWLEDGED', 'EN_ROUTE', 'CANCELLED', 'NEEDS_ATTENTION'))
    or (old.dispatch_status = 'ACKNOWLEDGED'    and new.dispatch_status in ('EN_ROUTE', 'ARRIVED', 'CANCELLED', 'NEEDS_ATTENTION'))
    or (old.dispatch_status = 'EN_ROUTE'        and new.dispatch_status in ('ARRIVED', 'CANCELLED', 'NEEDS_ATTENTION'))
    or (old.dispatch_status = 'ARRIVED'         and new.dispatch_status in ('IN_PROGRESS', 'CANCELLED', 'NEEDS_ATTENTION'))
    or (old.dispatch_status = 'IN_PROGRESS'     and new.dispatch_status in ('COMPLETED', 'CANCELLED', 'NEEDS_ATTENTION'))
    or (old.dispatch_status = 'NEEDS_ATTENTION' and new.dispatch_status in ('ASSIGNED', 'ACKNOWLEDGED', 'EN_ROUTE', 'CANCELLED'))
  ) then
    raise exception 'dispatch: illegal transition % → % (assignment %)', old.dispatch_status, new.dispatch_status, old.id
      using errcode = '22023';
  end if;

  if new.dispatch_status = 'COMPLETED' then
    select status into intervention_status
    from public.interventions
    where id = new.intervention_id
      and organization_id = new.organization_id;
    if intervention_status is null or intervention_status not in ('COMPLETED', 'NEEDS_ATTENTION') then
      raise exception 'dispatch: cannot complete assignment % — intervention.status must be COMPLETED or NEEDS_ATTENTION (got %)',
        old.id, coalesce(intervention_status, '(missing)')
        using errcode = '22023';
    end if;
  end if;

  if new.dispatch_status = 'ACKNOWLEDGED' and new.acknowledged_at is null then
    new.acknowledged_at := now();
  end if;
  if new.dispatch_status = 'EN_ROUTE' and new.en_route_at is null then
    new.en_route_at := now();
  end if;
  if new.dispatch_status = 'ARRIVED' and new.arrived_at is null then
    new.arrived_at := now();
  end if;
  if new.dispatch_status = 'IN_PROGRESS' and new.started_at is null then
    new.started_at := now();
  end if;
  if new.dispatch_status = 'COMPLETED' and new.completed_at is null then
    new.completed_at := now();
  end if;
  if new.dispatch_status = 'CANCELLED' and new.cancelled_at is null then
    new.cancelled_at := now();
  end if;

  return new;
end;
$$;

create trigger ida_enforce_state_transition
  before update on public.intervention_dispatch_assignments
  for each row execute function private.enforce_dispatch_state_transition();

-- =========================================================================
-- Section 5 — Assignment membership integrity trigger
-- =========================================================================
create or replace function private.enforce_dispatch_assignment_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_tenant_active_assignment(new.organization_id, new.technician_user_id);
  return new;
end;
$$;

create trigger ida_enforce_membership_insert
  before insert on public.intervention_dispatch_assignments
  for each row execute function private.enforce_dispatch_assignment_membership();

create trigger ida_enforce_membership_update
  before update of technician_user_id on public.intervention_dispatch_assignments
  for each row execute function private.enforce_dispatch_assignment_membership();

-- =========================================================================
-- Section 6a — assign_dispatch RPC
-- =========================================================================
-- Creates or updates an assignment (compare-and-set on version). If
-- idempotency_key is supplied AND already exists on (org, key), returns the
-- existing row as (assignment_id, version, created=false) — no mutation.
--
-- Otherwise :
--   * If no row exists for (org, intervention_id, technician_user_id) that is
--     non-terminal → INSERT with version=1, dispatch_status='ASSIGNED'.
--     Returns (id, 1, created=true).
--   * If such a row exists → CAS: verify version=target_version_expected.
--     On mismatch: record dispatch.assign_conflict audit + raise 40001.
--     On match: UPDATE window/vehicle, bump version, dispatch_status stays or
--     moves DRAFT→ASSIGNED. Returns (id, new_version, created=false).
create or replace function public.assign_dispatch(
  target_organization_id     uuid,
  target_intervention_id     uuid,
  target_technician_user_id  uuid,
  target_vehicle_id          uuid,
  target_scheduled_start     timestamptz,
  target_scheduled_end       timestamptz,
  target_idempotency_key     text,
  target_version_expected    integer
)
returns table (
  assignment_id uuid,
  version       integer,
  created       boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_row      public.intervention_dispatch_assignments%rowtype;
  intervention_row  public.interventions%rowtype;
  vehicle_row       public.field_vehicles%rowtype;
  new_row_id        uuid;
  new_version       integer;
  new_status        text;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'assign_dispatch: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if target_intervention_id is null or target_technician_user_id is null then
    raise exception 'assign_dispatch: intervention_id and technician_user_id are required'
      using errcode = '22023';
  end if;
  if target_scheduled_start is null or target_scheduled_end is null then
    raise exception 'assign_dispatch: scheduled_start and scheduled_end are required'
      using errcode = '22023';
  end if;
  if target_scheduled_end <= target_scheduled_start then
    raise exception 'assign_dispatch: scheduled_end must be after scheduled_start'
      using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.organization_members
    where organization_id = target_organization_id
      and user_id = target_technician_user_id
      and status = 'ACTIVE'
  ) then
    raise exception 'assign_dispatch: technician % is not an ACTIVE member of organization %',
      target_technician_user_id, target_organization_id
      using errcode = '42501';
  end if;

  select * into intervention_row
  from public.interventions
  where id = target_intervention_id
    and organization_id = target_organization_id;
  if intervention_row.id is null then
    raise exception 'assign_dispatch: intervention % not found in organization %',
      target_intervention_id, target_organization_id
      using errcode = '22023';
  end if;
  if intervention_row.status not in ('PLANNED', 'CONFIRMED', 'IN_PROGRESS', 'NEEDS_ATTENTION') then
    raise exception 'assign_dispatch: intervention % is not in a dispatchable state (status=%)',
      target_intervention_id, intervention_row.status
      using errcode = '22023';
  end if;

  if target_vehicle_id is not null then
    select * into vehicle_row
    from public.field_vehicles
    where id = target_vehicle_id
      and organization_id = target_organization_id;
    if vehicle_row.id is null then
      raise exception 'assign_dispatch: vehicle % not found in organization %',
        target_vehicle_id, target_organization_id
        using errcode = '22023';
    end if;
    if vehicle_row.status <> 'ACTIVE' then
      raise exception 'assign_dispatch: vehicle % is not ACTIVE (status=%)',
        target_vehicle_id, vehicle_row.status
        using errcode = '22023';
    end if;
  end if;

  -- Idempotency: replay if same key already used
  if target_idempotency_key is not null then
    select * into existing_row
    from public.intervention_dispatch_assignments
    where organization_id = target_organization_id
      and idempotency_key = target_idempotency_key;
    if existing_row.id is not null then
      assignment_id := existing_row.id;
      version       := existing_row.version;
      created       := false;
      return next;
      return;
    end if;
  end if;

  -- Look for an existing non-terminal assignment for (intervention, tech)
  select * into existing_row
  from public.intervention_dispatch_assignments
  where organization_id = target_organization_id
    and intervention_id = target_intervention_id
    and technician_user_id = target_technician_user_id
    and dispatch_status not in ('COMPLETED', 'CANCELLED')
  order by created_at desc
  limit 1;

  if existing_row.id is null then
    -- INSERT path
    insert into public.intervention_dispatch_assignments (
      organization_id, intervention_id, technician_user_id, vehicle_id,
      scheduled_start, scheduled_end, dispatch_status, version, idempotency_key
    ) values (
      target_organization_id, target_intervention_id, target_technician_user_id, target_vehicle_id,
      target_scheduled_start, target_scheduled_end, 'ASSIGNED', 1, target_idempotency_key
    )
    returning id into new_row_id;

    perform public.insert_event_once(
      target_organization_id,
      'dispatch:assigned:' || new_row_id::text || ':v1',
      'dispatch.assigned',
      'dispatch_planning',
      'intervention_dispatch_assignment',
      new_row_id,
      jsonb_build_object(
        'intervention_id', target_intervention_id,
        'technician_user_id', target_technician_user_id,
        'vehicle_id', target_vehicle_id,
        'scheduled_start', to_char(target_scheduled_start at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'scheduled_end', to_char(target_scheduled_end at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'version_new', 1
      )
    );
    perform public.record_audit_log(
      target_organization_id, 'dispatch.assign',
      'intervention_dispatch_assignment', new_row_id,
      jsonb_build_object(
        'intervention_id', target_intervention_id,
        'technician_user_id', target_technician_user_id,
        'vehicle_id', target_vehicle_id,
        'version_expected', target_version_expected,
        'version_new', 1,
        'created', true
      )
    );

    assignment_id := new_row_id;
    version       := 1;
    created       := true;
    return next;
    return;
  end if;

  -- UPDATE path: compare-and-set
  if target_version_expected is null or existing_row.version <> target_version_expected then
    perform public.record_audit_log(
      target_organization_id, 'dispatch.assign_conflict',
      'intervention_dispatch_assignment', existing_row.id,
      jsonb_build_object(
        'version_expected', target_version_expected,
        'version_actual', existing_row.version,
        'intervention_id', target_intervention_id,
        'technician_user_id', target_technician_user_id
      )
    );
    raise exception 'assign_dispatch: version conflict on assignment % (expected=%, actual=%)',
      existing_row.id, target_version_expected, existing_row.version
      using errcode = '40001';
  end if;

  new_version := existing_row.version + 1;
  new_status  := case when existing_row.dispatch_status = 'DRAFT' then 'ASSIGNED' else existing_row.dispatch_status end;

  update public.intervention_dispatch_assignments
    set scheduled_start = target_scheduled_start,
        scheduled_end   = target_scheduled_end,
        vehicle_id      = target_vehicle_id,
        dispatch_status = new_status,
        version         = new_version,
        idempotency_key = coalesce(idempotency_key, target_idempotency_key)
  where id = existing_row.id
    and organization_id = target_organization_id
    and version = existing_row.version;

  perform public.insert_event_once(
    target_organization_id,
    'dispatch:assigned:' || existing_row.id::text || ':v' || new_version::text,
    'dispatch.assigned',
    'dispatch_planning',
    'intervention_dispatch_assignment',
    existing_row.id,
    jsonb_build_object(
      'intervention_id', target_intervention_id,
      'technician_user_id', target_technician_user_id,
      'vehicle_id', target_vehicle_id,
      'scheduled_start', to_char(target_scheduled_start at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'scheduled_end', to_char(target_scheduled_end at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'version_new', new_version
    )
  );
  perform public.record_audit_log(
    target_organization_id, 'dispatch.assign',
    'intervention_dispatch_assignment', existing_row.id,
    jsonb_build_object(
      'intervention_id', target_intervention_id,
      'technician_user_id', target_technician_user_id,
      'vehicle_id', target_vehicle_id,
      'version_expected', target_version_expected,
      'version_new', new_version,
      'created', false
    )
  );

  assignment_id := existing_row.id;
  version       := new_version;
  created       := false;
  return next;
end;
$$;

revoke all on function public.assign_dispatch(uuid, uuid, uuid, uuid, timestamptz, timestamptz, text, integer) from public, anon;
grant execute on function public.assign_dispatch(uuid, uuid, uuid, uuid, timestamptz, timestamptz, text, integer) to authenticated, service_role;

-- =========================================================================
-- Section 6b — acknowledge_dispatch RPC
-- =========================================================================
create or replace function public.acknowledge_dispatch(
  target_organization_id       uuid,
  target_assignment_id         uuid,
  target_acknowledged_by_user_id uuid,
  target_version_expected      integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_before public.intervention_dispatch_assignments%rowtype;
  affected   integer;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'acknowledge_dispatch: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;

  select * into row_before
  from public.intervention_dispatch_assignments
  where id = target_assignment_id
    and organization_id = target_organization_id;

  if row_before.id is null then
    raise exception 'acknowledge_dispatch: assignment % not found in organization %',
      target_assignment_id, target_organization_id
      using errcode = '22023';
  end if;

  if row_before.dispatch_status = 'ACKNOWLEDGED' then
    return false;
  end if;

  if row_before.technician_user_id <> target_acknowledged_by_user_id then
    raise exception 'acknowledge_dispatch: only the assigned technician (%) can acknowledge (got %)',
      row_before.technician_user_id, target_acknowledged_by_user_id
      using errcode = '42501';
  end if;

  if target_version_expected is null or row_before.version <> target_version_expected then
    perform public.record_audit_log(
      target_organization_id, 'dispatch.acknowledge_conflict',
      'intervention_dispatch_assignment', row_before.id,
      jsonb_build_object(
        'version_expected', target_version_expected,
        'version_actual', row_before.version
      )
    );
    raise exception 'acknowledge_dispatch: version conflict on assignment % (expected=%, actual=%)',
      row_before.id, target_version_expected, row_before.version
      using errcode = '40001';
  end if;

  update public.intervention_dispatch_assignments
    set dispatch_status = 'ACKNOWLEDGED',
        version         = row_before.version + 1
  where id = target_assignment_id
    and organization_id = target_organization_id
    and version = row_before.version;

  get diagnostics affected = row_count;
  if affected <> 1 then
    return false;
  end if;

  perform public.insert_event_once(
    target_organization_id,
    'dispatch:acknowledged:' || row_before.id::text || ':v' || (row_before.version + 1)::text,
    'dispatch.acknowledged',
    'dispatch_planning',
    'intervention_dispatch_assignment',
    row_before.id,
    jsonb_build_object(
      'technician_user_id', row_before.technician_user_id,
      'version_new', row_before.version + 1
    )
  );
  perform public.record_audit_log(
    target_organization_id, 'dispatch.acknowledge',
    'intervention_dispatch_assignment', row_before.id,
    jsonb_build_object(
      'acknowledged_by_user_id', target_acknowledged_by_user_id,
      'version_new', row_before.version + 1
    )
  );

  return true;
end;
$$;

revoke all on function public.acknowledge_dispatch(uuid, uuid, uuid, integer) from public, anon;
grant execute on function public.acknowledge_dispatch(uuid, uuid, uuid, integer) to authenticated, service_role;

-- =========================================================================
-- Section 6c — mark_en_route RPC
-- =========================================================================
create or replace function public.mark_en_route(
  target_organization_id  uuid,
  target_assignment_id    uuid,
  target_at               timestamptz,
  target_version_expected integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_before public.intervention_dispatch_assignments%rowtype;
  affected   integer;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'mark_en_route: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if target_at is null then
    raise exception 'mark_en_route: at is required'
      using errcode = '22023';
  end if;

  select * into row_before
  from public.intervention_dispatch_assignments
  where id = target_assignment_id
    and organization_id = target_organization_id;

  if row_before.id is null then
    raise exception 'mark_en_route: assignment % not found in organization %',
      target_assignment_id, target_organization_id
      using errcode = '22023';
  end if;

  if row_before.dispatch_status = 'EN_ROUTE' then
    return false;
  end if;

  if row_before.dispatch_status not in ('ASSIGNED', 'ACKNOWLEDGED') then
    raise exception 'mark_en_route: assignment % is in state % (cannot transition to EN_ROUTE)',
      row_before.id, row_before.dispatch_status
      using errcode = '22023';
  end if;

  if target_version_expected is null or row_before.version <> target_version_expected then
    perform public.record_audit_log(
      target_organization_id, 'dispatch.en_route_conflict',
      'intervention_dispatch_assignment', row_before.id,
      jsonb_build_object(
        'version_expected', target_version_expected,
        'version_actual', row_before.version
      )
    );
    raise exception 'mark_en_route: version conflict on assignment % (expected=%, actual=%)',
      row_before.id, target_version_expected, row_before.version
      using errcode = '40001';
  end if;

  update public.intervention_dispatch_assignments
    set dispatch_status = 'EN_ROUTE',
        en_route_at     = target_at,
        version         = row_before.version + 1
  where id = target_assignment_id
    and organization_id = target_organization_id
    and version = row_before.version;

  get diagnostics affected = row_count;
  if affected <> 1 then
    return false;
  end if;

  perform public.insert_event_once(
    target_organization_id,
    'dispatch:en_route:' || row_before.id::text || ':v' || (row_before.version + 1)::text,
    'dispatch.en_route',
    'dispatch_planning',
    'intervention_dispatch_assignment',
    row_before.id,
    jsonb_build_object(
      'technician_user_id', row_before.technician_user_id,
      'at', to_char(target_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'version_new', row_before.version + 1
    )
  );
  perform public.record_audit_log(
    target_organization_id, 'dispatch.en_route',
    'intervention_dispatch_assignment', row_before.id,
    jsonb_build_object(
      'at', to_char(target_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'version_new', row_before.version + 1
    )
  );

  return true;
end;
$$;

revoke all on function public.mark_en_route(uuid, uuid, timestamptz, integer) from public, anon;
grant execute on function public.mark_en_route(uuid, uuid, timestamptz, integer) to authenticated, service_role;

-- =========================================================================
-- Section 6d — reorder_route RPC
-- =========================================================================
-- Atomic reorder. Verifies EVERY id in target_ordered_assignment_ids belongs
-- to (org, technician, day-in-timezone) and is non-terminal, then updates
-- route_order = ordinality in a single statement. Bumps version on all rows.
create or replace function public.reorder_route(
  target_organization_id       uuid,
  target_technician_user_id    uuid,
  target_day                   date,
  target_timezone              text,
  target_ordered_assignment_ids uuid[]
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  day_start_utc timestamptz;
  day_end_utc   timestamptz;
  eligible_ids  uuid[];
  updated_count integer;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'reorder_route: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if target_ordered_assignment_ids is null or array_length(target_ordered_assignment_ids, 1) is null then
    raise exception 'reorder_route: ordered_assignment_ids must be non-empty'
      using errcode = '22023';
  end if;
  if target_timezone is null or length(target_timezone) = 0 then
    raise exception 'reorder_route: timezone is required'
      using errcode = '22023';
  end if;

  day_start_utc := (target_day::timestamp at time zone target_timezone);
  day_end_utc   := ((target_day + 1)::timestamp at time zone target_timezone);

  select array_agg(id) into eligible_ids
  from public.intervention_dispatch_assignments
  where organization_id = target_organization_id
    and technician_user_id = target_technician_user_id
    and dispatch_status not in ('COMPLETED', 'CANCELLED')
    and scheduled_start >= day_start_utc
    and scheduled_start <  day_end_utc
    and id = any(target_ordered_assignment_ids);

  if eligible_ids is null or array_length(eligible_ids, 1) <> array_length(target_ordered_assignment_ids, 1) then
    raise exception 'reorder_route: one or more ids not eligible (wrong org/tech/day/terminal)'
      using errcode = '22023';
  end if;

  with new_order as (
    select id, ordinality::integer as position
    from unnest(target_ordered_assignment_ids) with ordinality as t(id)
  )
  update public.intervention_dispatch_assignments a
    set route_order = new_order.position - 1,
        version     = a.version + 1
  from new_order
  where a.id = new_order.id
    and a.organization_id = target_organization_id;

  get diagnostics updated_count = row_count;

  perform public.insert_event_once(
    target_organization_id,
    'dispatch:route_reordered:' || target_technician_user_id::text || ':' || target_day::text,
    'dispatch.route_reordered',
    'dispatch_planning',
    'organization',
    target_organization_id,
    jsonb_build_object(
      'technician_user_id', target_technician_user_id,
      'day', target_day::text,
      'timezone', target_timezone,
      'ordered_assignment_ids', to_jsonb(target_ordered_assignment_ids),
      'updated_count', updated_count
    )
  );
  perform public.record_audit_log(
    target_organization_id, 'dispatch.route_reorder',
    'organization', target_organization_id,
    jsonb_build_object(
      'technician_user_id', target_technician_user_id,
      'day', target_day::text,
      'timezone', target_timezone,
      'ordered_assignment_ids', to_jsonb(target_ordered_assignment_ids),
      'updated_count', updated_count
    )
  );

  return updated_count;
end;
$$;

revoke all on function public.reorder_route(uuid, uuid, date, text, uuid[]) from public, anon;
grant execute on function public.reorder_route(uuid, uuid, date, text, uuid[]) to authenticated, service_role;

-- =========================================================================
-- Section 6e — release_assignment RPC
-- =========================================================================
create or replace function public.release_assignment(
  target_organization_id  uuid,
  target_assignment_id    uuid,
  target_reason           text,
  target_version_expected integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_before public.intervention_dispatch_assignments%rowtype;
  affected   integer;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'release_assignment: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if target_reason is null or length(target_reason) = 0 or length(target_reason) > 500 then
    raise exception 'release_assignment: reason must be 1..500 chars'
      using errcode = '22023';
  end if;

  select * into row_before
  from public.intervention_dispatch_assignments
  where id = target_assignment_id
    and organization_id = target_organization_id;

  if row_before.id is null then
    raise exception 'release_assignment: assignment % not found in organization %',
      target_assignment_id, target_organization_id
      using errcode = '22023';
  end if;

  if row_before.dispatch_status = 'CANCELLED' then
    return false;
  end if;
  if row_before.dispatch_status = 'COMPLETED' then
    raise exception 'release_assignment: assignment % is COMPLETED and immutable', row_before.id
      using errcode = '22023';
  end if;

  if target_version_expected is null or row_before.version <> target_version_expected then
    perform public.record_audit_log(
      target_organization_id, 'dispatch.release_conflict',
      'intervention_dispatch_assignment', row_before.id,
      jsonb_build_object(
        'version_expected', target_version_expected,
        'version_actual', row_before.version
      )
    );
    raise exception 'release_assignment: version conflict on assignment % (expected=%, actual=%)',
      row_before.id, target_version_expected, row_before.version
      using errcode = '40001';
  end if;

  update public.intervention_dispatch_assignments
    set dispatch_status     = 'CANCELLED',
        cancellation_reason = target_reason,
        version             = row_before.version + 1
  where id = target_assignment_id
    and organization_id = target_organization_id
    and version = row_before.version;

  get diagnostics affected = row_count;
  if affected <> 1 then
    return false;
  end if;

  perform public.insert_event_once(
    target_organization_id,
    'dispatch:cancelled:' || row_before.id::text || ':v' || (row_before.version + 1)::text,
    'dispatch.cancelled',
    'dispatch_planning',
    'intervention_dispatch_assignment',
    row_before.id,
    jsonb_build_object(
      'technician_user_id', row_before.technician_user_id,
      'reason', target_reason,
      'version_new', row_before.version + 1
    )
  );
  perform public.record_audit_log(
    target_organization_id, 'dispatch.release',
    'intervention_dispatch_assignment', row_before.id,
    jsonb_build_object(
      'reason', target_reason,
      'previous_status', row_before.dispatch_status,
      'version_new', row_before.version + 1
    )
  );

  return true;
end;
$$;

revoke all on function public.release_assignment(uuid, uuid, text, integer) from public, anon;
grant execute on function public.release_assignment(uuid, uuid, text, integer) to authenticated, service_role;

-- =========================================================================
-- Section 6f — get_team_dispatch_day RPC (read model)
-- =========================================================================
create or replace function public.get_team_dispatch_day(
  target_organization_id uuid,
  target_day             date,
  target_timezone        text
)
returns table (
  technician_user_id     uuid,
  assignment_id          uuid,
  intervention_id        uuid,
  vehicle_id             uuid,
  dispatch_status        text,
  scheduled_start        timestamptz,
  scheduled_end          timestamptz,
  route_order            integer,
  version                integer,
  intervention_title     text,
  intervention_status    text,
  customer_id            uuid,
  customer_display_name  text,
  address_line1          text,
  address_city           text
)
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  day_start_utc timestamptz;
  day_end_utc   timestamptz;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'get_team_dispatch_day: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if target_timezone is null or length(target_timezone) = 0 then
    raise exception 'get_team_dispatch_day: timezone is required'
      using errcode = '22023';
  end if;

  day_start_utc := (target_day::timestamp at time zone target_timezone);
  day_end_utc   := ((target_day + 1)::timestamp at time zone target_timezone);

  return query
  select
    a.technician_user_id,
    a.id,
    a.intervention_id,
    a.vehicle_id,
    a.dispatch_status,
    a.scheduled_start,
    a.scheduled_end,
    a.route_order,
    a.version,
    i.title,
    i.status,
    i.customer_id,
    c.display_name,
    i.address_line1,
    i.address_city
  from public.intervention_dispatch_assignments a
  join public.interventions i
    on i.id = a.intervention_id and i.organization_id = a.organization_id
  left join public.customers c
    on c.id = i.customer_id and c.organization_id = i.organization_id
  where a.organization_id = target_organization_id
    and a.scheduled_start >= day_start_utc
    and a.scheduled_start <  day_end_utc
  order by
    a.technician_user_id asc,
    a.route_order asc nulls last,
    a.scheduled_start asc;
end;
$$;

revoke all on function public.get_team_dispatch_day(uuid, date, text) from public, anon;
grant execute on function public.get_team_dispatch_day(uuid, date, text) to authenticated, service_role;

-- =========================================================================
-- Section 6g — get_dispatch_conflicts RPC (read model)
-- =========================================================================
create or replace function public.get_dispatch_conflicts(
  target_organization_id uuid,
  target_horizon_days    integer
)
returns table (
  conflict_kind       text,
  technician_user_id  uuid,
  vehicle_id          uuid,
  assignment_id_a     uuid,
  assignment_id_b     uuid,
  detail              text
)
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  window_start timestamptz;
  window_end   timestamptz;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'get_dispatch_conflicts: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if target_horizon_days is null or target_horizon_days <= 0 or target_horizon_days > 365 then
    raise exception 'get_dispatch_conflicts: horizon_days must be between 1 and 365'
      using errcode = '22023';
  end if;

  window_start := now() - interval '1 day';
  window_end   := now() + (target_horizon_days::text || ' days')::interval;

  return query
  -- TECH_DOUBLE_BOOKING
  select
    'TECH_DOUBLE_BOOKING'::text,
    a.technician_user_id,
    null::uuid,
    a.id,
    b.id,
    format('overlap %s..%s vs %s..%s',
      to_char(a.scheduled_start at time zone 'utc', 'YYYY-MM-DD HH24:MI'),
      to_char(a.scheduled_end   at time zone 'utc', 'YYYY-MM-DD HH24:MI'),
      to_char(b.scheduled_start at time zone 'utc', 'YYYY-MM-DD HH24:MI'),
      to_char(b.scheduled_end   at time zone 'utc', 'YYYY-MM-DD HH24:MI')
    )
  from public.intervention_dispatch_assignments a
  join public.intervention_dispatch_assignments b
    on b.organization_id = a.organization_id
   and b.technician_user_id = a.technician_user_id
   and b.id > a.id
   and b.dispatch_status not in ('COMPLETED', 'CANCELLED')
   and a.scheduled_start < b.scheduled_end
   and b.scheduled_start < a.scheduled_end
  where a.organization_id = target_organization_id
    and a.dispatch_status not in ('COMPLETED', 'CANCELLED')
    and a.scheduled_start >= window_start
    and a.scheduled_start <  window_end

  union all
  -- VEHICLE_DOUBLE_BOOKING
  select
    'VEHICLE_DOUBLE_BOOKING'::text,
    null::uuid,
    a.vehicle_id,
    a.id,
    b.id,
    format('overlap %s..%s vs %s..%s',
      to_char(a.scheduled_start at time zone 'utc', 'YYYY-MM-DD HH24:MI'),
      to_char(a.scheduled_end   at time zone 'utc', 'YYYY-MM-DD HH24:MI'),
      to_char(b.scheduled_start at time zone 'utc', 'YYYY-MM-DD HH24:MI'),
      to_char(b.scheduled_end   at time zone 'utc', 'YYYY-MM-DD HH24:MI')
    )
  from public.intervention_dispatch_assignments a
  join public.intervention_dispatch_assignments b
    on b.organization_id = a.organization_id
   and b.vehicle_id      = a.vehicle_id
   and b.id > a.id
   and b.dispatch_status not in ('COMPLETED', 'CANCELLED')
   and a.scheduled_start < b.scheduled_end
   and b.scheduled_start < a.scheduled_end
  where a.organization_id = target_organization_id
    and a.dispatch_status not in ('COMPLETED', 'CANCELLED')
    and a.vehicle_id is not null
    and a.scheduled_start >= window_start
    and a.scheduled_start <  window_end

  union all
  -- INACTIVE_TECHNICIAN
  select
    'INACTIVE_TECHNICIAN'::text,
    a.technician_user_id,
    null::uuid,
    a.id,
    null::uuid,
    'technician is not an ACTIVE member'::text
  from public.intervention_dispatch_assignments a
  where a.organization_id = target_organization_id
    and a.dispatch_status not in ('COMPLETED', 'CANCELLED')
    and a.scheduled_start >= window_start
    and a.scheduled_start <  window_end
    and not exists (
      select 1 from public.organization_members m
      where m.organization_id = a.organization_id
        and m.user_id         = a.technician_user_id
        and m.status          = 'ACTIVE'
    )

  union all
  -- AVAILABILITY_BLOCKED
  select
    'AVAILABILITY_BLOCKED'::text,
    a.technician_user_id,
    null::uuid,
    a.id,
    null::uuid,
    format('overlaps availability block (%s)', b.reason)
  from public.intervention_dispatch_assignments a
  join public.technician_availability_blocks b
    on b.organization_id = a.organization_id
   and b.user_id         = a.technician_user_id
   and a.scheduled_start < b.to_at
   and b.from_at         < a.scheduled_end
  where a.organization_id = target_organization_id
    and a.dispatch_status not in ('COMPLETED', 'CANCELLED')
    and a.scheduled_start >= window_start
    and a.scheduled_start <  window_end

  order by 1, 4;
end;
$$;

revoke all on function public.get_dispatch_conflicts(uuid, integer) from public, anon;
grant execute on function public.get_dispatch_conflicts(uuid, integer) to authenticated, service_role;

-- =========================================================================
-- Section 6h — scan_dispatch_attentions RPC (idempotent emitter)
-- =========================================================================
-- Called from the Today engine cron / /ops/scan endpoint. Emits three
-- categories of attention items via public.insert_attention_once — stable
-- idempotency keys ensure no dup rows on re-runs. Returns count inserted.
create or replace function public.scan_dispatch_attentions(
  target_organization_id uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_total integer := 0;
  emit_res       record;
  conflict_row   record;
  ack_row        record;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'scan_dispatch_attentions: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;

  -- 1) DISPATCH_CONFLICT — one attention per conflict row (dedup by (a,b) pair)
  for conflict_row in
    select conflict_kind, assignment_id_a, assignment_id_b, technician_user_id, vehicle_id, detail
    from public.get_dispatch_conflicts(target_organization_id, 30)
  loop
    select id, created into emit_res
    from public.insert_attention_once(
      target_organization_id,
      'attention:dispatch_conflict:' || conflict_row.assignment_id_a::text || ':' || coalesce(conflict_row.assignment_id_b::text, 'none'),
      'FIELD_DISPATCH',
      'DISPATCH_CONFLICT',
      'Conflit de planning ' || conflict_row.conflict_kind,
      'HIGH',
      'intervention_dispatch_assignment',
      conflict_row.assignment_id_a,
      conflict_row.detail,
      'Reprogrammez l''une des affectations ou libérez le technicien concerné.',
      null,
      null,
      jsonb_build_object(
        'kind', conflict_row.conflict_kind,
        'assignment_id_b', conflict_row.assignment_id_b,
        'technician_user_id', conflict_row.technician_user_id,
        'vehicle_id', conflict_row.vehicle_id
      )
    );
    if emit_res.created then
      inserted_total := inserted_total + 1;
    end if;
  end loop;

  -- 2) DISPATCH_NOT_ACKNOWLEDGED — ASSIGNED older than 45 min
  for ack_row in
    select id, technician_user_id, intervention_id, updated_at, scheduled_start
    from public.intervention_dispatch_assignments
    where organization_id = target_organization_id
      and dispatch_status = 'ASSIGNED'
      and updated_at < now() - interval '45 minutes'
  loop
    select id, created into emit_res
    from public.insert_attention_once(
      target_organization_id,
      'attention:dispatch_not_acknowledged:' || ack_row.id::text,
      'FIELD_DISPATCH',
      'DISPATCH_NOT_ACKNOWLEDGED',
      'Affectation non confirmée par le technicien',
      'NORMAL',
      'intervention_dispatch_assignment',
      ack_row.id,
      'Le technicien n''a pas encore accusé réception de son affectation.',
      'Contactez le technicien ou reprogrammez l''intervention.',
      null,
      null,
      jsonb_build_object(
        'technician_user_id', ack_row.technician_user_id,
        'intervention_id', ack_row.intervention_id,
        'assigned_at', to_char(ack_row.updated_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      )
    );
    if emit_res.created then
      inserted_total := inserted_total + 1;
    end if;
  end loop;

  -- 3) SOLD_NOT_DISPATCHED — interventions PLANNED/CONFIRMED sur 14j sans assignment non-terminal
  for ack_row in
    select i.id as intervention_id, i.title, i.scheduled_at, i.customer_id
    from public.interventions i
    where i.organization_id = target_organization_id
      and i.status in ('PLANNED', 'CONFIRMED')
      and i.scheduled_at is not null
      and i.scheduled_at >= now()
      and i.scheduled_at <  now() + interval '14 days'
      and not exists (
        select 1 from public.intervention_dispatch_assignments a
        where a.organization_id = i.organization_id
          and a.intervention_id = i.id
          and a.dispatch_status not in ('CANCELLED')
      )
  loop
    select id, created into emit_res
    from public.insert_attention_once(
      target_organization_id,
      'attention:sold_not_dispatched:' || ack_row.intervention_id::text,
      'FIELD_DISPATCH',
      'SOLD_NOT_DISPATCHED',
      'Intervention planifiée sans technicien',
      'NORMAL',
      'intervention',
      ack_row.intervention_id,
      'Cette intervention est planifiée mais aucun technicien n''y est affecté.',
      'Ouvrez le tableau de dispatch et affectez un technicien.',
      null,
      null,
      jsonb_build_object(
        'intervention_id', ack_row.intervention_id,
        'scheduled_at', to_char(ack_row.scheduled_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'customer_id', ack_row.customer_id
      )
    );
    if emit_res.created then
      inserted_total := inserted_total + 1;
    end if;
  end loop;

  return inserted_total;
end;
$$;

revoke all on function public.scan_dispatch_attentions(uuid) from public, anon;
grant execute on function public.scan_dispatch_attentions(uuid) to authenticated, service_role;

comment on function public.scan_dispatch_attentions(uuid) is
  'Emits DISPATCH_CONFLICT / DISPATCH_NOT_ACKNOWLEDGED / SOLD_NOT_DISPATCHED attention items via insert_attention_once. Idempotent — re-runs insert 0 new rows unless the underlying conflict/ack/sold-not-dispatched fact appeared. Meant to be called from Today engine cron; never from a state-machine trigger.';
