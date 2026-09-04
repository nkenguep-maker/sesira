-- SESIRA Core Workflow — technician field core (C36, WAVE 5 backend).
--
-- SESIRA becomes the technician's daily tool. This migration is
-- the BACKEND CONTRACT — data model + RPCs. The mobile UI itself
-- (real phone interface, not responsive desktop) is a separate
-- deliverable on the codex/product-workflows branch (U36).
--
-- Adds:
--   * ALTER interventions: arrived_at, started_at, offline_client_id?
--     (offline sync idempotency for the start/arrive gestures)
--   * NEW table intervention_field_artifacts — photos, parts used,
--     measurements, anomalies, signatures, notes captured on-site.
--     Idempotent offline sync via (org, intervention, offline_client_id).
--   * NEW table intervention_field_conflicts — when an artifact
--     arrives for an intervention that is already COMPLETED /
--     CANCELLED, the artifact is still persisted BUT flagged as a
--     conflict for human triage (never silently dropped).
--
-- DOCTRINE INVARIANTS APPLIED:
--
--   AI never fabricates field facts:
--     * captured_by_user_id is REQUIRED on every artifact — a human
--       user MUST attest each observation.
--     * artifact_kind = 'SIGNATURE' additionally requires
--       payload.signer_role and payload.signer_name (never
--       AI-generated).
--     * artifact_kind = 'MEASUREMENT' requires payload.value +
--       payload.unit; the RPC does NOT accept AI-inferred
--       measurements without explicit human attestation.
--     * The schema HAS a boolean payload.ai_structured hint the
--       app can set for structured NOTE artifacts drafted by AI
--       — but the RAW facts (kg, pressure, part code) never come
--       from AI.
--
--   Offline resilience:
--     * offline_client_id (text) is generated on the mobile client
--       when the tech captures the artifact offline. On sync, the
--       server dedups via unique (org, intervention, offline_client_id).
--     * If the intervention is terminal when the artifact arrives,
--       upload_status = 'CONFLICT' with a conflict_reason. Field
--       manager reviews the conflict; nothing is silently dropped.
--
--   Timestamp discipline:
--     * captured_at (client clock, when the tech pressed the button)
--       and uploaded_at (server clock, when the server persisted it)
--       are separate columns so we can measure sync delay and
--       reconstruct the field timeline honestly.

-- =========================================================================
-- Extend interventions with arrival + start + offline sync fields
-- =========================================================================
alter table public.interventions
  add column arrived_at             timestamptz,
  add column started_at             timestamptz,
  add column offline_start_client_id text
    check (offline_start_client_id is null or length(offline_start_client_id) between 1 and 100);

comment on column public.interventions.arrived_at is
  'Technician on-site arrival timestamp (client clock). Distinct from started_at — arrival may precede the actual start of work (safety check, equipment inspection).';
comment on column public.interventions.started_at is
  'Actual start of work timestamp (client clock). Usually coincides with the CONFIRMED → IN_PROGRESS transition.';
comment on column public.interventions.offline_start_client_id is
  'Idempotency key from the mobile client for the arrive/start gestures. Prevents duplicate arrival stamps when the app retries after a spotty upload.';

create index interventions_org_arrived_idx on public.interventions (organization_id, arrived_at desc)
  where arrived_at is not null;
create unique index interventions_org_offline_start_uniq on public.interventions (organization_id, offline_start_client_id)
  where offline_start_client_id is not null;

-- =========================================================================
-- intervention_field_artifacts — one row per field capture
-- =========================================================================
create table public.intervention_field_artifacts (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations(id) on delete cascade,
  intervention_id       uuid not null,
  artifact_kind         text not null
    check (artifact_kind in ('PHOTO', 'PART_USED', 'MEASUREMENT',
                             'ANOMALY', 'SIGNATURE', 'NOTE')),
  payload               jsonb not null default '{}'::jsonb
    check (jsonb_typeof(payload) = 'object'),
  captured_at           timestamptz not null,
  captured_by_user_id   uuid not null,
  offline_client_id     text not null check (length(offline_client_id) between 1 and 100),
  upload_status         text not null default 'SYNCED'
    check (upload_status in ('SYNCED', 'CONFLICT', 'IGNORED')),
  conflict_reason       text check (conflict_reason is null or length(conflict_reason) <= 500),
  uploaded_at           timestamptz not null default now(),
  provenance            jsonb not null default '{}'::jsonb
    check (jsonb_typeof(provenance) = 'object'),
  metadata              jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at            timestamptz not null default now(),
  foreign key (intervention_id, organization_id) references public.interventions(id, organization_id) on delete cascade,
  unique (organization_id, intervention_id, offline_client_id),
  unique (id, organization_id)
);

comment on table public.intervention_field_artifacts is
  'Field-captured artifact attached to an intervention. Idempotent offline sync via (org, intervention, offline_client_id). captured_at is the client clock (technician pressed the button), uploaded_at is the server clock. AI must NEVER fabricate raw facts (measurement, part quantity, signature) — every artifact requires captured_by_user_id.';

comment on column public.intervention_field_artifacts.payload is
  'Structured payload by artifact_kind:
   PHOTO       {url, thumbnail_url?, exif?, gps?, caption?}
   PART_USED   {part_code, part_label, quantity, unit_price?, currency?}
   MEASUREMENT {measurement_kind, value, unit, notes?}
                — measurement_kind ∈ (PRESSURE, TEMPERATURE, CURRENT,
                  VOLTAGE, LEAK_RATE, VOLUME_ADDED_KG,
                  VOLUME_RECOVERED_KG, OTHER)
   ANOMALY     {severity (LOW|NORMAL|HIGH|URGENT), summary, notes?}
   SIGNATURE   {signer_role (TECH|CUSTOMER), signer_name, signature_hash, signature_method}
   NOTE        {text, ai_structured?: boolean, ai_model?: text}
   Enforced in submit_intervention_field_artifact RPC — the table
   check is jsonb-shape-only.';

create index ifa_org_intervention_idx on public.intervention_field_artifacts (organization_id, intervention_id, captured_at desc);
create index ifa_org_kind_idx on public.intervention_field_artifacts (organization_id, artifact_kind);
create index ifa_org_conflict_idx on public.intervention_field_artifacts (organization_id, uploaded_at desc)
  where upload_status = 'CONFLICT';
create index ifa_org_captured_by_idx on public.intervention_field_artifacts (organization_id, captured_by_user_id);

alter table public.intervention_field_artifacts enable row level security;

create policy ifa_select on public.intervention_field_artifacts
  for select to authenticated
  using (private.is_organization_member(organization_id));
create policy ifa_insert on public.intervention_field_artifacts
  for insert to authenticated
  with check (private.is_organization_member(organization_id));
create policy ifa_update on public.intervention_field_artifacts
  for update to authenticated
  using (private.is_organization_member(organization_id))
  with check (private.is_organization_member(organization_id));

grant select, insert, update on public.intervention_field_artifacts to authenticated;
grant select, insert, update on public.intervention_field_artifacts to service_role;

-- =========================================================================
-- arrive_at_intervention — mark tech on-site (offline-safe idempotent)
-- =========================================================================
create or replace function public.arrive_at_intervention(
  target_organization_id uuid,
  target_intervention_id uuid,
  target_actor_user_id   uuid,
  target_arrived_at      timestamptz,
  target_offline_client_id text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
  int_row  public.interventions%rowtype;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'arrive_at_intervention: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.organization_members
    where organization_id = target_organization_id
      and user_id = target_actor_user_id
      and status = 'ACTIVE'
  ) then
    raise exception 'arrive_at_intervention: actor % is not an ACTIVE member of organization %',
      target_actor_user_id, target_organization_id
      using errcode = '42501';
  end if;
  if target_arrived_at is null then
    raise exception 'arrive_at_intervention: arrived_at is required'
      using errcode = '22023';
  end if;

  select * into int_row
  from public.interventions
  where id = target_intervention_id
    and organization_id = target_organization_id;

  if int_row.id is null then
    raise exception 'arrive_at_intervention: intervention % not found in organization %',
      target_intervention_id, target_organization_id
      using errcode = '22023';
  end if;
  if int_row.status not in ('PLANNED', 'CONFIRMED', 'IN_PROGRESS') then
    raise exception 'arrive_at_intervention: intervention % is not in a workable state (status=%)',
      target_intervention_id, int_row.status
      using errcode = '22023';
  end if;
  if int_row.assigned_user_id is not null and int_row.assigned_user_id <> target_actor_user_id then
    raise exception 'arrive_at_intervention: actor % is not the assignee (%) of intervention %',
      target_actor_user_id, int_row.assigned_user_id, target_intervention_id
      using errcode = '42501';
  end if;

  -- Idempotent by offline_client_id when provided
  if target_offline_client_id is not null
     and int_row.offline_start_client_id = target_offline_client_id then
    return false; -- replay: no change
  end if;

  update public.interventions
    set arrived_at              = coalesce(arrived_at, target_arrived_at),
        offline_start_client_id = coalesce(offline_start_client_id, target_offline_client_id)
  where id = target_intervention_id
    and organization_id = target_organization_id
    and status in ('PLANNED', 'CONFIRMED', 'IN_PROGRESS')
    and arrived_at is null;

  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'intervention.arrive',
      'intervention', target_intervention_id,
      jsonb_build_object(
        'actor_user_id', target_actor_user_id,
        'arrived_at', to_char(target_arrived_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'offline_client_id', target_offline_client_id
      )
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.arrive_at_intervention(uuid, uuid, uuid, timestamptz, text) from public, anon;
grant execute on function public.arrive_at_intervention(uuid, uuid, uuid, timestamptz, text) to authenticated, service_role;

-- =========================================================================
-- start_intervention_work — CONFIRMED/PLANNED → IN_PROGRESS + start ts
-- =========================================================================
create or replace function public.start_intervention_work(
  target_organization_id uuid,
  target_intervention_id uuid,
  target_actor_user_id   uuid,
  target_started_at      timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
  int_row  public.interventions%rowtype;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'start_intervention_work: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.organization_members
    where organization_id = target_organization_id
      and user_id = target_actor_user_id
      and status = 'ACTIVE'
  ) then
    raise exception 'start_intervention_work: actor % is not an ACTIVE member of organization %',
      target_actor_user_id, target_organization_id
      using errcode = '42501';
  end if;
  if target_started_at is null then
    raise exception 'start_intervention_work: started_at is required'
      using errcode = '22023';
  end if;

  select * into int_row
  from public.interventions
  where id = target_intervention_id
    and organization_id = target_organization_id;

  if int_row.id is null then
    raise exception 'start_intervention_work: intervention % not found in organization %',
      target_intervention_id, target_organization_id
      using errcode = '22023';
  end if;
  if int_row.assigned_user_id is not null and int_row.assigned_user_id <> target_actor_user_id then
    raise exception 'start_intervention_work: actor % is not the assignee (%)',
      target_actor_user_id, int_row.assigned_user_id
      using errcode = '42501';
  end if;

  update public.interventions
    set status     = case when status = 'IN_PROGRESS' then 'IN_PROGRESS' else 'IN_PROGRESS' end,
        started_at = coalesce(started_at, target_started_at)
  where id = target_intervention_id
    and organization_id = target_organization_id
    and status in ('PLANNED', 'CONFIRMED', 'IN_PROGRESS')
    and started_at is null;

  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'intervention.start_work',
      'intervention', target_intervention_id,
      jsonb_build_object(
        'actor_user_id', target_actor_user_id,
        'started_at', to_char(target_started_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      )
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.start_intervention_work(uuid, uuid, uuid, timestamptz) from public, anon;
grant execute on function public.start_intervention_work(uuid, uuid, uuid, timestamptz) to authenticated, service_role;

-- =========================================================================
-- submit_intervention_field_artifact — idempotent offline sync
-- =========================================================================
-- Idempotent by (org, intervention, offline_client_id). If the target
-- intervention is terminal (COMPLETED or CANCELLED), the artifact is
-- still persisted BUT flagged upload_status='CONFLICT' with a reason —
-- never silently dropped. A human triages conflicts.
create or replace function public.submit_intervention_field_artifact(
  target_organization_id uuid,
  target_intervention_id uuid,
  target_artifact_kind   text,
  target_payload         jsonb,
  target_captured_at     timestamptz,
  target_captured_by_user_id uuid,
  target_offline_client_id text
)
returns table (
  artifact_id     uuid,
  upload_status   text,
  conflict_reason text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  int_row       public.interventions%rowtype;
  existing_id   uuid;
  new_id        uuid;
  conflict_flag boolean := false;
  reason_text   text;
  the_status    text := 'SYNCED';
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'submit_intervention_field_artifact: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.organization_members
    where organization_id = target_organization_id
      and user_id = target_captured_by_user_id
      and status = 'ACTIVE'
  ) then
    raise exception 'submit_intervention_field_artifact: captured_by % is not an ACTIVE member of organization %',
      target_captured_by_user_id, target_organization_id
      using errcode = '42501';
  end if;
  if target_offline_client_id is null or length(target_offline_client_id) = 0 or length(target_offline_client_id) > 100 then
    raise exception 'submit_intervention_field_artifact: offline_client_id is required (1..100 chars)'
      using errcode = '22023';
  end if;
  if target_captured_at is null then
    raise exception 'submit_intervention_field_artifact: captured_at is required'
      using errcode = '22023';
  end if;
  if target_artifact_kind not in ('PHOTO', 'PART_USED', 'MEASUREMENT', 'ANOMALY', 'SIGNATURE', 'NOTE') then
    raise exception 'submit_intervention_field_artifact: invalid artifact_kind %', target_artifact_kind
      using errcode = '22023';
  end if;

  -- Payload shape validation per kind
  if target_artifact_kind = 'MEASUREMENT' then
    if not (target_payload ? 'measurement_kind' and target_payload ? 'value' and target_payload ? 'unit') then
      raise exception 'submit_intervention_field_artifact: MEASUREMENT payload requires {measurement_kind, value, unit}'
        using errcode = '22023';
    end if;
  elsif target_artifact_kind = 'PART_USED' then
    if not (target_payload ? 'part_code' and target_payload ? 'part_label' and target_payload ? 'quantity') then
      raise exception 'submit_intervention_field_artifact: PART_USED payload requires {part_code, part_label, quantity}'
        using errcode = '22023';
    end if;
  elsif target_artifact_kind = 'SIGNATURE' then
    if not (target_payload ? 'signer_role' and target_payload ? 'signer_name' and target_payload ? 'signature_hash') then
      raise exception 'submit_intervention_field_artifact: SIGNATURE payload requires {signer_role, signer_name, signature_hash}'
        using errcode = '22023';
    end if;
    if target_payload->>'signer_role' not in ('TECH', 'CUSTOMER') then
      raise exception 'submit_intervention_field_artifact: SIGNATURE signer_role must be TECH or CUSTOMER'
        using errcode = '22023';
    end if;
  elsif target_artifact_kind = 'ANOMALY' then
    if not (target_payload ? 'severity' and target_payload ? 'summary') then
      raise exception 'submit_intervention_field_artifact: ANOMALY payload requires {severity, summary}'
        using errcode = '22023';
    end if;
    if target_payload->>'severity' not in ('LOW', 'NORMAL', 'HIGH', 'URGENT') then
      raise exception 'submit_intervention_field_artifact: ANOMALY severity must be LOW|NORMAL|HIGH|URGENT'
        using errcode = '22023';
    end if;
  elsif target_artifact_kind = 'PHOTO' then
    if not (target_payload ? 'url') then
      raise exception 'submit_intervention_field_artifact: PHOTO payload requires {url}'
        using errcode = '22023';
    end if;
  elsif target_artifact_kind = 'NOTE' then
    if not (target_payload ? 'text') then
      raise exception 'submit_intervention_field_artifact: NOTE payload requires {text}'
        using errcode = '22023';
    end if;
  end if;

  -- Idempotency lookup
  select id into existing_id
  from public.intervention_field_artifacts
  where organization_id = target_organization_id
    and intervention_id = target_intervention_id
    and offline_client_id = target_offline_client_id;

  if existing_id is not null then
    -- Replay — return the existing row unchanged (still return its status/reason)
    select f.id, f.upload_status, f.conflict_reason
      into artifact_id, upload_status, conflict_reason
    from public.intervention_field_artifacts f
    where f.id = existing_id;
    return next;
    return;
  end if;

  -- Load the intervention to check its state
  select * into int_row
  from public.interventions
  where id = target_intervention_id
    and organization_id = target_organization_id;

  if int_row.id is null then
    raise exception 'submit_intervention_field_artifact: intervention % not found in organization %',
      target_intervention_id, target_organization_id
      using errcode = '22023';
  end if;

  if int_row.status in ('COMPLETED', 'CANCELLED') then
    conflict_flag := true;
    the_status    := 'CONFLICT';
    reason_text   := format('intervention already %s when artifact arrived — human review required', int_row.status);
  end if;

  insert into public.intervention_field_artifacts (
    organization_id, intervention_id, artifact_kind,
    payload, captured_at, captured_by_user_id,
    offline_client_id, upload_status, conflict_reason
  ) values (
    target_organization_id, target_intervention_id, target_artifact_kind,
    target_payload, target_captured_at, target_captured_by_user_id,
    target_offline_client_id, the_status, reason_text
  ) returning id into new_id;

  perform public.record_audit_log(
    target_organization_id, 'intervention_field_artifact.submit',
    'intervention_field_artifact', new_id,
    jsonb_build_object(
      'intervention_id', target_intervention_id,
      'artifact_kind', target_artifact_kind,
      'captured_by_user_id', target_captured_by_user_id,
      'offline_client_id', target_offline_client_id,
      'upload_status', the_status,
      'conflict', conflict_flag
    )
  );

  artifact_id     := new_id;
  upload_status   := the_status;
  conflict_reason := reason_text;
  return next;
end;
$$;

revoke all on function public.submit_intervention_field_artifact(uuid, uuid, text, jsonb, timestamptz, uuid, text) from public, anon;
grant execute on function public.submit_intervention_field_artifact(uuid, uuid, text, jsonb, timestamptz, uuid, text) to authenticated, service_role;

comment on function public.submit_intervention_field_artifact(uuid, uuid, text, jsonb, timestamptz, uuid, text) is
  'Persist a field artifact with offline-safe idempotency. Returns upload_status = SYNCED normally or CONFLICT if the intervention was already terminal — never silently drops. AI must NEVER call this — captured_by_user_id must be a real ACTIVE org member.';

-- =========================================================================
-- resolve_field_artifact_conflict — human triages the conflict
-- =========================================================================
create or replace function public.resolve_field_artifact_conflict(
  target_organization_id uuid,
  target_artifact_id     uuid,
  target_actor_user_id   uuid,
  target_new_status      text,
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
    raise exception 'resolve_field_artifact_conflict: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.organization_members
    where organization_id = target_organization_id
      and user_id = target_actor_user_id
      and status = 'ACTIVE'
  ) then
    raise exception 'resolve_field_artifact_conflict: actor % is not an ACTIVE member of organization %',
      target_actor_user_id, target_organization_id
      using errcode = '42501';
  end if;
  if target_new_status not in ('SYNCED', 'IGNORED') then
    raise exception 'resolve_field_artifact_conflict: new_status must be SYNCED or IGNORED (got %)', target_new_status
      using errcode = '22023';
  end if;

  update public.intervention_field_artifacts
    set upload_status   = target_new_status,
        conflict_reason = coalesce(conflict_reason, '') || ' | resolution: ' || coalesce(target_note, '(no note)')
  where id = target_artifact_id
    and organization_id = target_organization_id
    and upload_status = 'CONFLICT';

  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'intervention_field_artifact.resolve_conflict',
      'intervention_field_artifact', target_artifact_id,
      jsonb_build_object('resolved_by_user_id', target_actor_user_id, 'new_status', target_new_status)
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.resolve_field_artifact_conflict(uuid, uuid, uuid, text, text) from public, anon;
grant execute on function public.resolve_field_artifact_conflict(uuid, uuid, uuid, text, text) to authenticated, service_role;

-- =========================================================================
-- technician_day — read helper: assigned interventions for a day
-- =========================================================================
-- Returns everything a technician needs on their phone: today's
-- assigned interventions, address, customer minimal info, scheduled
-- times, arrival/start status, equipment references from metadata.
create or replace function public.technician_day(
  target_organization_id uuid,
  target_user_id         uuid,
  target_date            date
)
returns table (
  intervention_id       uuid,
  title                 text,
  status                text,
  customer_id           uuid,
  customer_display_name text,
  customer_phone        text,
  address_line1         text,
  address_line2         text,
  address_postal_code   text,
  address_city          text,
  scheduled_at          timestamptz,
  duration_minutes      integer,
  arrived_at            timestamptz,
  started_at            timestamptz,
  completed_at          timestamptz,
  equipment_id          uuid,
  quote_id              uuid,
  opportunity_id        uuid,
  notes                 text
)
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  day_start timestamptz;
  day_end   timestamptz;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'technician_day: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if target_user_id is null then
    raise exception 'technician_day: user_id is required'
      using errcode = '22023';
  end if;
  if target_date is null then
    raise exception 'technician_day: date is required'
      using errcode = '22023';
  end if;

  day_start := target_date::timestamptz;
  day_end   := (target_date + 1)::timestamptz;

  return query
  select
    i.id, i.title, i.status,
    i.customer_id, c.display_name, c.phone,
    i.address_line1, i.address_line2, i.address_postal_code, i.address_city,
    i.scheduled_at, i.duration_minutes,
    i.arrived_at, i.started_at, i.completed_at,
    (i.metadata->>'equipment_id')::uuid,
    i.quote_id, i.opportunity_id, i.notes
  from public.interventions i
  left join public.customers c
    on c.id = i.customer_id and c.organization_id = i.organization_id
  where i.organization_id = target_organization_id
    and i.assigned_user_id = target_user_id
    and (
      (i.scheduled_at is not null and i.scheduled_at >= day_start and i.scheduled_at < day_end)
      or
      (i.scheduled_at is null and i.status in ('PLANNED', 'CONFIRMED', 'IN_PROGRESS', 'NEEDS_ATTENTION'))
    )
  order by
    i.scheduled_at asc nulls last,
    i.status asc;
end;
$$;

revoke all on function public.technician_day(uuid, uuid, date) from public, anon;
grant execute on function public.technician_day(uuid, uuid, date) to authenticated, service_role;

comment on function public.technician_day(uuid, uuid, date) is
  'Assigned interventions for a technician on a given day. Includes unscheduled workable interventions (NEEDS_ATTENTION) at the end. Feeds the U36 mobile UI.';

-- =========================================================================
-- intervention_field_artifacts_for — full list for an intervention
-- =========================================================================
create or replace function public.intervention_field_artifacts_for(
  target_organization_id uuid,
  target_intervention_id uuid
)
returns table (
  artifact_id           uuid,
  artifact_kind         text,
  payload               jsonb,
  captured_at           timestamptz,
  captured_by_user_id   uuid,
  offline_client_id     text,
  upload_status         text,
  conflict_reason       text,
  uploaded_at           timestamptz
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'intervention_field_artifacts_for: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;

  return query
  select
    f.id, f.artifact_kind, f.payload,
    f.captured_at, f.captured_by_user_id, f.offline_client_id,
    f.upload_status, f.conflict_reason, f.uploaded_at
  from public.intervention_field_artifacts f
  where f.organization_id = target_organization_id
    and f.intervention_id = target_intervention_id
  order by f.captured_at asc;
end;
$$;

revoke all on function public.intervention_field_artifacts_for(uuid, uuid) from public, anon;
grant execute on function public.intervention_field_artifacts_for(uuid, uuid) to authenticated, service_role;

create or replace function public.pending_field_artifact_conflicts(
  target_organization_id uuid
)
returns table (
  artifact_id           uuid,
  intervention_id       uuid,
  artifact_kind         text,
  captured_at           timestamptz,
  captured_by_user_id   uuid,
  conflict_reason       text,
  uploaded_at           timestamptz
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'pending_field_artifact_conflicts: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;

  return query
  select f.id, f.intervention_id, f.artifact_kind, f.captured_at,
         f.captured_by_user_id, f.conflict_reason, f.uploaded_at
  from public.intervention_field_artifacts f
  where f.organization_id = target_organization_id
    and f.upload_status = 'CONFLICT'
  order by f.uploaded_at desc;
end;
$$;

revoke all on function public.pending_field_artifact_conflicts(uuid) from public, anon;
grant execute on function public.pending_field_artifact_conflicts(uuid) to authenticated, service_role;

comment on function public.pending_field_artifact_conflicts(uuid) is
  'List all field artifacts flagged CONFLICT (e.g. arrived after intervention was terminal). Feeds the field-manager triage surface. Nothing silently dropped.';
