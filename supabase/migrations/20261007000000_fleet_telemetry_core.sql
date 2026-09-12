-- SESIRA Core Workflow — Fleet telemetry core (C42, WAVE post-C40 backend).
--
-- Adds the backend contract for vehicle position telemetry + provider-computed
-- route estimates. Reference: docs/core/CORE_EXTENSIONS_PLAN.md §7 C42.
--
-- Adds:
--   * NEW table fleet_tracking_policies — one row per organization (unique).
--     Governs whether telemetry is enabled at all, what purpose (§ Data Act
--     documented), retention window (days), allowed hours, session-based
--     tracking flag, and freshness_seconds threshold (used by read models
--     to compute `is_fresh`).
--   * NEW table fleet_location_pings — one row per captured position.
--     Idempotent offline sync via
--     unique (org, vehicle_id, offline_client_id) WHERE offline_client_id IS NOT NULL.
--     Two clocks: captured_at (client) + received_at (server).
--   * NEW table fleet_route_estimates — one row per provider computation.
--     Immutable log (append-only). status = READY | UNAVAILABLE | FAILED | STALE.
--     `provider_kind` documents which RoutingProvider produced the number.
--     Reads pick the LATEST calculated_at per dispatch_assignment.
--   * State-machine trigger `private.enforce_route_estimate_immutable` blocks
--     any UPDATE to fleet_route_estimates — the log is append-only.
--   * 6 SECURITY DEFINER RPCs (record_fleet_location_ping, record_fleet_route_estimate,
--     configure_fleet_tracking_policy, latest_vehicle_positions,
--     dispatch_eta_snapshot, purge_expired_fleet_pings)
--     + 1 attention scanner (scan_fleet_telemetry_attentions).
--
-- DOCTRINE INVARIANTS APPLIED:
--
--   Never fabricate ETA/location:
--     * Provider absent → UNAVAILABLE (never READY-with-fake-values).
--     * Provider error → FAILED (never success).
--     * `dispatch_eta_snapshot` returns the LATEST row as-is; if the latest
--       row is UNAVAILABLE, callers must render "indisponible", not zero.
--     * Read models never coerce NULL / UNAVAILABLE into a distance/duration.
--
--   No driver scoring (INV-06, AI Act annexe III):
--     * `fleet_location_pings` schema deliberately has NO
--       behaviour_score / driver_grade / risk_class columns.
--     * We store position + speed (raw fact) — we do NOT compute
--       aggressive-driving heuristics from them.
--     * Grep is expected to remain 0 for `driver_score` / `behaviour_score`
--       / `risk_class` in the codebase; any future PR introducing them
--       must be blocked in review.
--
--   Privacy / Data Act:
--     * `fleet_tracking_policies.enabled = false` by default. Recording a
--       ping without an enabled policy is REJECTED at the RPC layer.
--     * `fleet_tracking_policies.purpose` is a required non-empty text —
--       the org owner must document why they collect positions.
--     * `retention_days` defaults to 30. `purge_expired_fleet_pings`
--       deletes pings whose received_at is older than that, and records
--       an audit row with the purged count — the purge is observable.
--     * `allowed_hours_json` (nullable jsonb) documents the tracking
--       schedule for the org (e.g. {"weekdays": [1,2,3,4,5], "hours": [7,19]}).
--       Enforcement is a UI/legal concern; the server records what it
--       receives and never lies about coverage.
--
--   Technician-only writes:
--     * `record_fleet_location_ping` verifies the caller (`auth.uid()`) is
--       the same as `target_technician_user_id` when the technician is
--       provided; the technician can only submit pings for their own
--       vehicle/assignment. A back-office tool using the RPC via
--       service_role bypasses this (audited path).
--     * Cross-tenant spoofing is impossible: RLS + composite FKs.
--
--   Idempotency + out-of-order:
--     * `offline_client_id` (optional) provides idempotency for retry.
--     * `captured_at` (client clock) is authoritative for ordering; the
--       server records `received_at` separately so we can measure
--       sync delay honestly.
--     * The RPC accepts out-of-order arrivals — it does not enforce a
--       received_at > previous received_at rule. Reads use `captured_at`.
--
--   Attention only when the policy asks for it:
--     * `scan_fleet_telemetry_attentions` emits TELEMETRY_STALE only
--       when the policy has `session_based = true` AND the dispatch is
--       non-terminal AND the latest ping is older than freshness_seconds.
--     * Otherwise no attention at all — SESIRA does not spam "GPS lost"
--       every time a van goes through a tunnel.
--
-- Non-goals (deferred):
--   * `fleet_geofence_events` (phase 2 — will land in a follow-up migration
--     once a real routing provider is wired in and geofence policies are
--     defined by product).
--   * Behavioural scoring — FORBIDDEN by INV-06.
--   * Partitioning fleet_location_pings — will land as an ALTER when
--     production volume proves the need.

-- =========================================================================
-- Section 1 — fleet_tracking_policies
-- =========================================================================
create table public.fleet_tracking_policies (
  id                   uuid primary key default gen_random_uuid(),
  organization_id      uuid not null references public.organizations(id) on delete cascade,
  enabled              boolean not null default false,
  purpose              text not null check (length(purpose) between 1 and 500),
  retention_days       integer not null default 30 check (retention_days between 1 and 3650),
  allowed_hours_json   jsonb check (allowed_hours_json is null or jsonb_typeof(allowed_hours_json) = 'object'),
  session_based        boolean not null default true,
  freshness_seconds    integer not null default 180 check (freshness_seconds between 30 and 3600),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (organization_id)
);

comment on table public.fleet_tracking_policies is
  '1 row per org. Governs whether telemetry is enabled, why (purpose — required for Data Act documentation), retention window, allowed hours, session-based flag (attention only during active dispatch), and freshness_seconds (read-time is_fresh calculation). Default enabled=false — no ping accepted until the org owner explicitly opts in.';

alter table public.fleet_tracking_policies enable row level security;

create policy ftp_select on public.fleet_tracking_policies
  for select to authenticated
  using (private.is_organization_member(organization_id));
create policy ftp_insert on public.fleet_tracking_policies
  for insert to authenticated
  with check (private.is_organization_member(organization_id));
create policy ftp_update on public.fleet_tracking_policies
  for update to authenticated
  using (private.is_organization_member(organization_id))
  with check (private.is_organization_member(organization_id));

grant select, insert, update on public.fleet_tracking_policies to authenticated;
grant select, insert, update on public.fleet_tracking_policies to service_role;

-- =========================================================================
-- Section 2 — fleet_location_pings
-- =========================================================================
create table public.fleet_location_pings (
  id                     uuid primary key default gen_random_uuid(),
  organization_id        uuid not null references public.organizations(id) on delete cascade,
  vehicle_id             uuid not null,
  technician_user_id     uuid,
  dispatch_assignment_id uuid,
  captured_at            timestamptz not null,
  received_at            timestamptz not null default now(),
  latitude               numeric(9, 6) not null check (latitude between -90 and 90),
  longitude              numeric(9, 6) not null check (longitude between -180 and 180),
  accuracy_m             numeric(8, 2) check (accuracy_m is null or accuracy_m >= 0),
  speed_kph              numeric(6, 2) check (speed_kph is null or speed_kph >= 0),
  heading                numeric(5, 2) check (heading is null or (heading >= 0 and heading < 360)),
  source                 text not null default 'MOBILE_APP'
    check (source in ('MOBILE_APP', 'HARDWARE_TRACKER', 'PROVIDER_WEBHOOK', 'MANUAL_IMPORT')),
  provider_ref           text check (provider_ref is null or length(provider_ref) <= 200),
  device_ref             text check (device_ref is null or length(device_ref) <= 200),
  offline_client_id      text check (offline_client_id is null or length(offline_client_id) between 1 and 100),
  created_at             timestamptz not null default now(),
  foreign key (vehicle_id, organization_id) references public.field_vehicles(id, organization_id) on delete cascade,
  foreign key (dispatch_assignment_id, organization_id) references public.intervention_dispatch_assignments(id, organization_id) on delete set null
);

comment on table public.fleet_location_pings is
  'One row per captured vehicle position. captured_at = client clock (device), received_at = server clock. Composite FK to (vehicle, org) and (dispatch_assignment, org) enforce tenant safety. Idempotent offline sync via unique (org, vehicle, offline_client_id). NO behaviour scoring columns — INV-06 forbids driver grading.';

create unique index flp_org_vehicle_offline_uniq on public.fleet_location_pings
  (organization_id, vehicle_id, offline_client_id)
  where offline_client_id is not null;
create index flp_org_vehicle_captured_idx on public.fleet_location_pings
  (organization_id, vehicle_id, captured_at desc);
create index flp_org_dispatch_captured_idx on public.fleet_location_pings
  (organization_id, dispatch_assignment_id, captured_at desc)
  where dispatch_assignment_id is not null;
create index flp_org_received_idx on public.fleet_location_pings
  (organization_id, received_at);

alter table public.fleet_location_pings enable row level security;

create policy flp_select on public.fleet_location_pings
  for select to authenticated
  using (private.is_organization_member(organization_id));
create policy flp_insert on public.fleet_location_pings
  for insert to authenticated
  with check (private.is_organization_member(organization_id));

grant select, insert on public.fleet_location_pings to authenticated;
grant select, insert, delete on public.fleet_location_pings to service_role;

-- =========================================================================
-- Section 3 — fleet_route_estimates (append-only log)
-- =========================================================================
create table public.fleet_route_estimates (
  id                     uuid primary key default gen_random_uuid(),
  organization_id        uuid not null references public.organizations(id) on delete cascade,
  dispatch_assignment_id uuid not null,
  distance_m             numeric(10, 2) check (distance_m is null or distance_m >= 0),
  duration_seconds       integer check (duration_seconds is null or duration_seconds >= 0),
  calculated_at          timestamptz not null default now(),
  provider_kind          text not null
    check (provider_kind in ('TEST', 'PENDING_PRODUCTION', 'GOOGLE', 'HERE', 'MAPBOX', 'OSRM', 'OTHER')),
  provider_ref           text check (provider_ref is null or length(provider_ref) <= 200),
  status                 text not null
    check (status in ('READY', 'UNAVAILABLE', 'FAILED', 'STALE')),
  failure_reason         text check (failure_reason is null or length(failure_reason) <= 500),
  created_at             timestamptz not null default now(),
  foreign key (dispatch_assignment_id, organization_id) references public.intervention_dispatch_assignments(id, organization_id) on delete cascade
);

comment on table public.fleet_route_estimates is
  'Append-only log of provider-computed route estimates. UPDATE blocked by trigger. status=READY only when the provider returned distance+duration. UNAVAILABLE = no provider configured. FAILED = provider error. STALE = manually invalidated. Reads pick the LATEST row per dispatch_assignment (order by calculated_at desc).';

create index fre_org_assignment_calc_idx on public.fleet_route_estimates
  (organization_id, dispatch_assignment_id, calculated_at desc);
create index fre_org_status_idx on public.fleet_route_estimates
  (organization_id, status)
  where status in ('FAILED', 'UNAVAILABLE');

alter table public.fleet_route_estimates enable row level security;

create policy fre_select on public.fleet_route_estimates
  for select to authenticated
  using (private.is_organization_member(organization_id));
create policy fre_insert on public.fleet_route_estimates
  for insert to authenticated
  with check (private.is_organization_member(organization_id));

grant select, insert on public.fleet_route_estimates to authenticated;
grant select, insert on public.fleet_route_estimates to service_role;

create or replace function private.enforce_route_estimate_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'fleet_route_estimates: rows are append-only (id=%)', old.id
    using errcode = '22023';
end;
$$;

create trigger fre_immutable
  before update on public.fleet_route_estimates
  for each row execute function private.enforce_route_estimate_immutable();

-- =========================================================================
-- Section 4 — configure_fleet_tracking_policy RPC
-- =========================================================================
create or replace function public.configure_fleet_tracking_policy(
  target_organization_id uuid,
  target_enabled          boolean,
  target_purpose          text,
  target_retention_days   integer,
  target_allowed_hours    jsonb,
  target_session_based    boolean,
  target_freshness_seconds integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  policy_id uuid;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'configure_fleet_tracking_policy: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if target_purpose is null or length(target_purpose) = 0 or length(target_purpose) > 500 then
    raise exception 'configure_fleet_tracking_policy: purpose is required (1..500 chars)'
      using errcode = '22023';
  end if;
  if target_retention_days is null or target_retention_days < 1 or target_retention_days > 3650 then
    raise exception 'configure_fleet_tracking_policy: retention_days must be 1..3650'
      using errcode = '22023';
  end if;
  if target_freshness_seconds is null or target_freshness_seconds < 30 or target_freshness_seconds > 3600 then
    raise exception 'configure_fleet_tracking_policy: freshness_seconds must be 30..3600'
      using errcode = '22023';
  end if;

  insert into public.fleet_tracking_policies (
    organization_id, enabled, purpose, retention_days,
    allowed_hours_json, session_based, freshness_seconds
  ) values (
    target_organization_id, target_enabled, target_purpose, target_retention_days,
    target_allowed_hours, target_session_based, target_freshness_seconds
  )
  on conflict (organization_id) do update
    set enabled            = excluded.enabled,
        purpose            = excluded.purpose,
        retention_days     = excluded.retention_days,
        allowed_hours_json = excluded.allowed_hours_json,
        session_based      = excluded.session_based,
        freshness_seconds  = excluded.freshness_seconds,
        updated_at         = now()
  returning id into policy_id;

  perform public.record_audit_log(
    target_organization_id, 'fleet.policy_configure',
    'fleet_tracking_policy', policy_id,
    jsonb_build_object(
      'enabled', target_enabled,
      'retention_days', target_retention_days,
      'session_based', target_session_based,
      'freshness_seconds', target_freshness_seconds
    )
  );
  return policy_id;
end;
$$;

revoke all on function public.configure_fleet_tracking_policy(uuid, boolean, text, integer, jsonb, boolean, integer) from public, anon;
grant execute on function public.configure_fleet_tracking_policy(uuid, boolean, text, integer, jsonb, boolean, integer) to authenticated, service_role;

-- =========================================================================
-- Section 5 — record_fleet_location_ping RPC
-- =========================================================================
-- Records a ping IFF the org has an enabled fleet_tracking_policy.
-- Idempotent on (org, vehicle, offline_client_id).
-- If `target_technician_user_id` is provided, the caller MUST be that same
-- user (auth.uid() = target_technician_user_id) — a technician can only
-- submit pings for themselves. If null, no user constraint (service_role
-- imports or hardware tracker webhooks).
create or replace function public.record_fleet_location_ping(
  target_organization_id     uuid,
  target_vehicle_id          uuid,
  target_technician_user_id  uuid,
  target_dispatch_assignment_id uuid,
  target_captured_at         timestamptz,
  target_latitude            numeric,
  target_longitude           numeric,
  target_accuracy_m          numeric,
  target_speed_kph           numeric,
  target_heading             numeric,
  target_source              text,
  target_provider_ref        text,
  target_device_ref          text,
  target_offline_client_id   text
)
returns table (
  ping_id   uuid,
  created   boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_id uuid;
  policy_row  public.fleet_tracking_policies%rowtype;
  vehicle_row public.field_vehicles%rowtype;
  new_id      uuid;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'record_fleet_location_ping: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;

  select * into policy_row
  from public.fleet_tracking_policies
  where organization_id = target_organization_id;
  if policy_row.id is null or not policy_row.enabled then
    raise exception 'record_fleet_location_ping: tracking is not enabled for organization %', target_organization_id
      using errcode = '42501';
  end if;

  if target_captured_at is null then
    raise exception 'record_fleet_location_ping: captured_at is required'
      using errcode = '22023';
  end if;
  if target_latitude is null or target_longitude is null then
    raise exception 'record_fleet_location_ping: latitude and longitude are required'
      using errcode = '22023';
  end if;
  if target_source is null or target_source not in ('MOBILE_APP', 'HARDWARE_TRACKER', 'PROVIDER_WEBHOOK', 'MANUAL_IMPORT') then
    raise exception 'record_fleet_location_ping: invalid source %', target_source
      using errcode = '22023';
  end if;

  -- Vehicle must exist in the same org
  select * into vehicle_row
  from public.field_vehicles
  where id = target_vehicle_id
    and organization_id = target_organization_id;
  if vehicle_row.id is null then
    raise exception 'record_fleet_location_ping: vehicle % not found in organization %', target_vehicle_id, target_organization_id
      using errcode = '22023';
  end if;

  -- Technician spoofing guard: if a tech is named, the caller must BE that tech
  if target_technician_user_id is not null
     and target_technician_user_id <> (select auth.uid())
     and (select auth.role()) <> 'service_role' then
    raise exception 'record_fleet_location_ping: caller cannot submit pings for another user'
      using errcode = '42501';
  end if;

  -- Idempotency lookup
  if target_offline_client_id is not null then
    select id into existing_id
    from public.fleet_location_pings
    where organization_id = target_organization_id
      and vehicle_id = target_vehicle_id
      and offline_client_id = target_offline_client_id;
    if existing_id is not null then
      ping_id := existing_id;
      created := false;
      return next;
      return;
    end if;
  end if;

  insert into public.fleet_location_pings (
    organization_id, vehicle_id, technician_user_id, dispatch_assignment_id,
    captured_at, latitude, longitude, accuracy_m, speed_kph, heading,
    source, provider_ref, device_ref, offline_client_id
  ) values (
    target_organization_id, target_vehicle_id, target_technician_user_id, target_dispatch_assignment_id,
    target_captured_at, target_latitude, target_longitude, target_accuracy_m, target_speed_kph, target_heading,
    target_source, target_provider_ref, target_device_ref, target_offline_client_id
  )
  returning id into new_id;

  ping_id := new_id;
  created := true;
  return next;
end;
$$;

revoke all on function public.record_fleet_location_ping(uuid, uuid, uuid, uuid, timestamptz, numeric, numeric, numeric, numeric, numeric, text, text, text, text) from public, anon;
grant execute on function public.record_fleet_location_ping(uuid, uuid, uuid, uuid, timestamptz, numeric, numeric, numeric, numeric, numeric, text, text, text, text) to authenticated, service_role;

-- =========================================================================
-- Section 6 — record_fleet_route_estimate RPC (append)
-- =========================================================================
-- Records the outcome of a RoutingProvider call. Server-side path only
-- (never trust the browser to declare "READY").
create or replace function public.record_fleet_route_estimate(
  target_organization_id        uuid,
  target_dispatch_assignment_id uuid,
  target_status                 text,
  target_provider_kind          text,
  target_provider_ref           text,
  target_distance_m             numeric,
  target_duration_seconds       integer,
  target_failure_reason         text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  estimate_id uuid;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'record_fleet_route_estimate: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if target_status not in ('READY', 'UNAVAILABLE', 'FAILED', 'STALE') then
    raise exception 'record_fleet_route_estimate: invalid status %', target_status
      using errcode = '22023';
  end if;
  if target_provider_kind not in ('TEST', 'PENDING_PRODUCTION', 'GOOGLE', 'HERE', 'MAPBOX', 'OSRM', 'OTHER') then
    raise exception 'record_fleet_route_estimate: invalid provider_kind %', target_provider_kind
      using errcode = '22023';
  end if;
  -- READY requires actual values; UNAVAILABLE/FAILED must NOT lie
  if target_status = 'READY' and (target_distance_m is null or target_duration_seconds is null) then
    raise exception 'record_fleet_route_estimate: READY requires distance_m and duration_seconds'
      using errcode = '22023';
  end if;
  if target_status in ('UNAVAILABLE', 'FAILED') and (target_distance_m is not null or target_duration_seconds is not null) then
    raise exception 'record_fleet_route_estimate: % must not carry distance/duration', target_status
      using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.intervention_dispatch_assignments
    where id = target_dispatch_assignment_id
      and organization_id = target_organization_id
  ) then
    raise exception 'record_fleet_route_estimate: dispatch_assignment % not found in organization %',
      target_dispatch_assignment_id, target_organization_id
      using errcode = '22023';
  end if;

  insert into public.fleet_route_estimates (
    organization_id, dispatch_assignment_id, distance_m, duration_seconds,
    provider_kind, provider_ref, status, failure_reason
  ) values (
    target_organization_id, target_dispatch_assignment_id, target_distance_m, target_duration_seconds,
    target_provider_kind, target_provider_ref, target_status, target_failure_reason
  )
  returning id into estimate_id;

  perform public.record_audit_log(
    target_organization_id, 'fleet.route_estimate_recorded',
    'fleet_route_estimate', estimate_id,
    jsonb_build_object(
      'dispatch_assignment_id', target_dispatch_assignment_id,
      'status', target_status,
      'provider_kind', target_provider_kind
    )
  );
  return estimate_id;
end;
$$;

revoke all on function public.record_fleet_route_estimate(uuid, uuid, text, text, text, numeric, integer, text) from public, anon;
grant execute on function public.record_fleet_route_estimate(uuid, uuid, text, text, text, numeric, integer, text) to authenticated, service_role;

-- =========================================================================
-- Section 7 — latest_vehicle_positions RPC (read model)
-- =========================================================================
create or replace function public.latest_vehicle_positions(
  target_organization_id uuid
)
returns table (
  vehicle_id         uuid,
  vehicle_label      text,
  latest_ping_id     uuid,
  captured_at        timestamptz,
  received_at        timestamptz,
  latitude           numeric,
  longitude          numeric,
  speed_kph          numeric,
  heading            numeric,
  age_seconds        integer,
  is_fresh           boolean
)
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  policy_row public.fleet_tracking_policies%rowtype;
  freshness  integer;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'latest_vehicle_positions: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;

  select * into policy_row
  from public.fleet_tracking_policies
  where organization_id = target_organization_id;
  freshness := coalesce(policy_row.freshness_seconds, 180);

  return query
  with ranked as (
    select p.*,
           row_number() over (partition by p.vehicle_id order by p.captured_at desc) as rn
    from public.fleet_location_pings p
    where p.organization_id = target_organization_id
  )
  select
    v.id,
    v.label,
    r.id,
    r.captured_at,
    r.received_at,
    r.latitude,
    r.longitude,
    r.speed_kph,
    r.heading,
    case when r.captured_at is null then null::integer
         else extract(epoch from (now() - r.captured_at))::integer
    end,
    case when r.captured_at is null then false
         else (extract(epoch from (now() - r.captured_at))::integer <= freshness)
    end
  from public.field_vehicles v
  left join ranked r on r.vehicle_id = v.id and r.rn = 1
  where v.organization_id = target_organization_id
    and v.status = 'ACTIVE'
  order by v.label asc;
end;
$$;

revoke all on function public.latest_vehicle_positions(uuid) from public, anon;
grant execute on function public.latest_vehicle_positions(uuid) to authenticated, service_role;

-- =========================================================================
-- Section 8 — dispatch_eta_snapshot RPC (read model)
-- =========================================================================
create or replace function public.dispatch_eta_snapshot(
  target_organization_id        uuid,
  target_dispatch_assignment_id uuid
)
returns table (
  estimate_id      uuid,
  status           text,
  provider_kind    text,
  distance_m       numeric,
  duration_seconds integer,
  calculated_at    timestamptz,
  failure_reason   text
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'dispatch_eta_snapshot: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;

  return query
  select e.id, e.status, e.provider_kind, e.distance_m, e.duration_seconds,
         e.calculated_at, e.failure_reason
  from public.fleet_route_estimates e
  where e.organization_id = target_organization_id
    and e.dispatch_assignment_id = target_dispatch_assignment_id
  order by e.calculated_at desc
  limit 1;
end;
$$;

revoke all on function public.dispatch_eta_snapshot(uuid, uuid) from public, anon;
grant execute on function public.dispatch_eta_snapshot(uuid, uuid) to authenticated, service_role;

-- =========================================================================
-- Section 9 — purge_expired_fleet_pings RPC
-- =========================================================================
create or replace function public.purge_expired_fleet_pings(
  target_organization_id uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  policy_row     public.fleet_tracking_policies%rowtype;
  cutoff         timestamptz;
  deleted_count  integer;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'purge_expired_fleet_pings: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;

  select * into policy_row
  from public.fleet_tracking_policies
  where organization_id = target_organization_id;
  if policy_row.id is null then
    -- No policy => nothing to purge (nothing should have been recorded)
    return 0;
  end if;

  cutoff := now() - (policy_row.retention_days::text || ' days')::interval;

  delete from public.fleet_location_pings
  where organization_id = target_organization_id
    and received_at < cutoff;

  get diagnostics deleted_count = row_count;

  perform public.record_audit_log(
    target_organization_id, 'fleet.pings_purged',
    'fleet_tracking_policy', policy_row.id,
    jsonb_build_object(
      'cutoff', to_char(cutoff at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'retention_days', policy_row.retention_days,
      'deleted_count', deleted_count
    )
  );
  return deleted_count;
end;
$$;

revoke all on function public.purge_expired_fleet_pings(uuid) from public, anon;
grant execute on function public.purge_expired_fleet_pings(uuid) to authenticated, service_role;

-- =========================================================================
-- Section 10 — scan_fleet_telemetry_attentions RPC
-- =========================================================================
-- Emits TELEMETRY_STALE only when policy.session_based=true, dispatch is
-- non-terminal, and the latest ping for the vehicle is older than
-- freshness_seconds. Idempotent via stable key per assignment.
create or replace function public.scan_fleet_telemetry_attentions(
  target_organization_id uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  policy_row     public.fleet_tracking_policies%rowtype;
  inserted_total integer := 0;
  emit_res       record;
  stale_row      record;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'scan_fleet_telemetry_attentions: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;

  select * into policy_row
  from public.fleet_tracking_policies
  where organization_id = target_organization_id;
  if policy_row.id is null or not policy_row.enabled or not policy_row.session_based then
    return 0;
  end if;

  for stale_row in
    select a.id as assignment_id,
           a.technician_user_id,
           a.vehicle_id,
           (select p.captured_at
            from public.fleet_location_pings p
            where p.organization_id = a.organization_id
              and p.vehicle_id = a.vehicle_id
            order by p.captured_at desc
            limit 1) as last_captured_at
    from public.intervention_dispatch_assignments a
    where a.organization_id = target_organization_id
      and a.dispatch_status in ('ACKNOWLEDGED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS')
      and a.vehicle_id is not null
  loop
    if stale_row.last_captured_at is null
       or extract(epoch from (now() - stale_row.last_captured_at))::integer > policy_row.freshness_seconds then
      select id, created into emit_res
      from public.insert_attention_once(
        target_organization_id,
        'attention:telemetry_stale:' || stale_row.assignment_id::text,
        'FIELD_DISPATCH',
        'TELEMETRY_STALE',
        'Position véhicule expirée pendant une intervention active',
        'NORMAL',
        'intervention_dispatch_assignment',
        stale_row.assignment_id,
        'Aucune position récente pour ce véhicule sur cette intervention.',
        'Vérifiez la connexion du technicien ou du traceur véhicule.',
        null,
        null,
        jsonb_build_object(
          'vehicle_id', stale_row.vehicle_id,
          'technician_user_id', stale_row.technician_user_id,
          'last_captured_at',
            case when stale_row.last_captured_at is null then null
                 else to_char(stale_row.last_captured_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
            end,
          'freshness_seconds', policy_row.freshness_seconds
        )
      );
      if emit_res.created then
        inserted_total := inserted_total + 1;
      end if;
    end if;
  end loop;

  return inserted_total;
end;
$$;

revoke all on function public.scan_fleet_telemetry_attentions(uuid) from public, anon;
grant execute on function public.scan_fleet_telemetry_attentions(uuid) to authenticated, service_role;

comment on function public.scan_fleet_telemetry_attentions(uuid) is
  'Emits TELEMETRY_STALE attention items only when tracking policy is enabled AND session_based=true AND dispatch is non-terminal AND latest vehicle ping is older than freshness_seconds. Idempotent via stable key attention:telemetry_stale:{assignment_id}.';
