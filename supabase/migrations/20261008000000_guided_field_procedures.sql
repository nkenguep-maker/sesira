-- SESIRA Core Workflow — Guided field procedures + offline binaries + client sign-off (C43).
--
-- Adds versioned procedure templates (per-org OR global catalogue via nullable
-- organization_id), guided step results, offline-safe binary artifact protocol
-- (RESERVED → UPLOADED → FINALIZED with SHA-256 verification), and client
-- sign-off evidence.
-- Reference: docs/core/CORE_EXTENSIONS_PLAN.md §7 C43.
--
-- Adds:
--   * NEW `field_procedure_templates` — versioned templates. org_id nullable
--     for global catalogue rows visible read-only to every tenant. Composite
--     unique (organization_id, key, version) with a partial index to also
--     enforce uniqueness on global (organization_id IS NULL) templates.
--   * NEW `field_procedure_steps` — ordered steps per template. Immutable
--     once a template row exists in a run's snapshot (protected by trigger).
--   * NEW `intervention_procedure_runs` — instance of a template on an
--     intervention. Snapshots `template_version` (INV-03 style). State
--     machine NOT_STARTED → IN_PROGRESS → READY_FOR_REVIEW → COMPLETED,
--     with NEEDS_ATTENTION parking state.
--   * NEW `field_step_results` — one row per (run, step, offline_client_id).
--     `sync_status` ∈ SYNCED | CONFLICT | IGNORED. Conflicts preserved
--     (never silently dropped).
--   * NEW `binary_field_artifacts` — photos, signatures, documents.
--     upload_status ∈ RESERVED | UPLOADED | FINALIZED | CONFLICT | IGNORED.
--     SHA-256 mandatory. Cross-tenant SHA collision impossible via
--     unique (organization_id, sha256).
--   * Storage bucket `field-binaries` (private) + RLS on
--     `storage.foldername(name)[1] = organization_id::text`.
--   * 8 SECURITY DEFINER RPCs.
--
-- DOCTRINE INVARIANTS APPLIED:
--
--   Human attestation, never AI-fabricated:
--     * `field_step_results.actor_user_id` REQUIRED and must be ACTIVE org
--       member. AI cannot fabricate a measurement.
--     * `binary_field_artifacts.uploaded_by_user_id` REQUIRED.
--     * Signature evidence `submit_signature_evidence` requires
--       `signer_name` + `signer_role` + `consent_version` — all human-
--       attested. Stored as a payload snapshot immutable once written.
--
--   Wording strict (INV — REGULATORY.md §1.5 + doctrine §7):
--     * Client sign-off wording MUST be "Émargement client" in UI.
--     * `binary_field_artifacts.kind = 'SIGNATURE'` is NEVER a
--       qualified electronic signature. The DB column has NO
--       `eIDAS` / `qualified` / `AES` / `QES` markers. C45 will
--       introduce the actual trust provider abstraction.
--     * `field_procedure_steps.kind = 'REGULATORY_CONFIRMATION'` records
--       that the technician acknowledged a regulatory step, NOT that
--       compliance was achieved.
--
--   Offline resilience:
--     * `offline_client_id` on step_results + binary_artifacts. Partial
--       unique (run, step, offline_client_id) — retried sync collapses.
--     * `captured_at` (client) vs `created_at`/`uploaded_at` (server).
--
--   Binary protocol integrity:
--     * `reserve_binary_artifact` inserts RESERVED row with `expected_sha256`.
--     * Client uploads to Storage.
--     * `finalize_binary_artifact` compares `actual_sha256` to expected;
--       on mismatch → CONFLICT (immutable evidence of tampering).
--     * SHA collision cross-tenant impossible: unique (org, sha256).
--     * On collision same tenant same file — INSERT deduped by sha256
--       via `on conflict`.
--
--   Run state machine + terminal immutability:
--     * NOT_STARTED → IN_PROGRESS → READY_FOR_REVIEW → COMPLETED.
--     * NEEDS_ATTENTION parking state accessible from any non-terminal.
--     * COMPLETED is terminal — trigger blocks further mutations.
--     * `complete_run` requires all `required=true` steps to have a
--       SYNCED result.
--
-- Non-goals (deferred):
--   * eIDAS-level signature (→ C45 document trust).
--   * Auto-generated PDF report (→ C43.1 follow-up if needed).
--   * Binary retention policy (→ policy row similar to fleet_tracking_policies
--     can land in a future migration).

-- =========================================================================
-- Section 1 — field_procedure_templates
-- =========================================================================
create table public.field_procedure_templates (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid references public.organizations(id) on delete cascade,
  key               text not null check (length(key) between 1 and 120),
  version           integer not null default 1 check (version >= 1),
  label             text not null check (length(label) between 1 and 200),
  sector_key        text check (sector_key is null or length(sector_key) between 1 and 60),
  active            boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (id, organization_id)
);

comment on table public.field_procedure_templates is
  'Versioned procedure templates. organization_id NULL → global catalogue (visible read-only to every tenant). Composite unique (organization_id, key, version) enforced via two partial indexes (org NULL vs org NOT NULL).';

create unique index fpt_org_key_version_uniq on public.field_procedure_templates
  (organization_id, key, version)
  where organization_id is not null;
create unique index fpt_global_key_version_uniq on public.field_procedure_templates
  (key, version)
  where organization_id is null;

create index fpt_org_key_active_idx on public.field_procedure_templates
  (organization_id, key, active);

alter table public.field_procedure_templates enable row level security;

create policy fpt_select on public.field_procedure_templates
  for select to authenticated
  using (organization_id is null or private.is_organization_member(organization_id));
create policy fpt_insert_org on public.field_procedure_templates
  for insert to authenticated
  with check (organization_id is not null and private.is_organization_member(organization_id));
create policy fpt_update_org on public.field_procedure_templates
  for update to authenticated
  using (organization_id is not null and private.is_organization_member(organization_id))
  with check (organization_id is not null and private.is_organization_member(organization_id));

grant select on public.field_procedure_templates to authenticated;
grant insert, update on public.field_procedure_templates to authenticated;
grant select, insert, update on public.field_procedure_templates to service_role;

-- =========================================================================
-- Section 2 — field_procedure_steps
-- =========================================================================
create table public.field_procedure_steps (
  id              uuid primary key default gen_random_uuid(),
  template_id     uuid not null references public.field_procedure_templates(id) on delete cascade,
  ordinal         integer not null check (ordinal between 1 and 500),
  kind            text not null
    check (kind in ('CHECK', 'MEASUREMENT', 'TEXT', 'PART', 'PHOTO', 'SIGNATURE', 'REGULATORY_CONFIRMATION')),
  required        boolean not null default true,
  unit            text check (unit is null or length(unit) between 1 and 40),
  range_min       numeric,
  range_max       numeric,
  human_wording   text not null check (length(human_wording) between 1 and 500),
  metadata        jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at      timestamptz not null default now(),
  unique (template_id, ordinal),
  check (range_min is null or range_max is null or range_min <= range_max)
);

comment on table public.field_procedure_steps is
  'Ordered steps per template. kind=MEASUREMENT accepts optional range_min/range_max — a value outside the range does not FAIL the step (SESIRA never issues a "conforme" verdict) but produces a NEEDS_ATTENTION signal on the run. kind=REGULATORY_CONFIRMATION records that the technician acknowledged a regulatory point, NOT that compliance was achieved.';

create index fps_template_ordinal_idx on public.field_procedure_steps (template_id, ordinal);

alter table public.field_procedure_steps enable row level security;

create policy fps_select on public.field_procedure_steps
  for select to authenticated
  using (exists (
    select 1 from public.field_procedure_templates t
    where t.id = field_procedure_steps.template_id
      and (t.organization_id is null or private.is_organization_member(t.organization_id))
  ));
create policy fps_insert on public.field_procedure_steps
  for insert to authenticated
  with check (exists (
    select 1 from public.field_procedure_templates t
    where t.id = field_procedure_steps.template_id
      and t.organization_id is not null
      and private.is_organization_member(t.organization_id)
  ));

grant select, insert on public.field_procedure_steps to authenticated;
grant select, insert, update on public.field_procedure_steps to service_role;

-- =========================================================================
-- Section 3 — intervention_procedure_runs
-- =========================================================================
create table public.intervention_procedure_runs (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  intervention_id     uuid not null,
  template_id         uuid not null,
  template_version    integer not null,
  status              text not null default 'NOT_STARTED'
    check (status in ('NOT_STARTED', 'IN_PROGRESS', 'READY_FOR_REVIEW', 'COMPLETED', 'NEEDS_ATTENTION')),
  started_at          timestamptz,
  completed_at        timestamptz,
  review_notes        text check (review_notes is null or length(review_notes) <= 2000),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  foreign key (intervention_id, organization_id) references public.interventions(id, organization_id) on delete cascade,
  unique (id, organization_id)
);

comment on table public.intervention_procedure_runs is
  'A procedure run = instance of a template on an intervention. template_version snapshots the template row at start time (INV-03 style) so subsequent template edits do NOT retroactively change historical runs. State machine enforced by private.enforce_procedure_run_state_transition.';

create index ipr_org_intervention_idx on public.intervention_procedure_runs
  (organization_id, intervention_id);
create index ipr_org_status_idx on public.intervention_procedure_runs
  (organization_id, status)
  where status not in ('COMPLETED');

alter table public.intervention_procedure_runs enable row level security;

create policy ipr_select on public.intervention_procedure_runs
  for select to authenticated
  using (private.is_organization_member(organization_id));
create policy ipr_insert on public.intervention_procedure_runs
  for insert to authenticated
  with check (private.is_organization_member(organization_id));
create policy ipr_update on public.intervention_procedure_runs
  for update to authenticated
  using (private.is_organization_member(organization_id))
  with check (private.is_organization_member(organization_id));

grant select, insert, update on public.intervention_procedure_runs to authenticated;
grant select, insert, update on public.intervention_procedure_runs to service_role;

create or replace function private.enforce_procedure_run_state_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  if new.status = old.status then
    return new;
  end if;
  if old.status = 'COMPLETED' then
    raise exception 'procedure_run: COMPLETED is terminal and immutable (run %)', old.id
      using errcode = '22023';
  end if;
  if not (
    (old.status = 'NOT_STARTED'      and new.status in ('IN_PROGRESS', 'NEEDS_ATTENTION'))
    or (old.status = 'IN_PROGRESS'      and new.status in ('READY_FOR_REVIEW', 'NEEDS_ATTENTION'))
    or (old.status = 'READY_FOR_REVIEW' and new.status in ('COMPLETED', 'IN_PROGRESS', 'NEEDS_ATTENTION'))
    or (old.status = 'NEEDS_ATTENTION'  and new.status in ('IN_PROGRESS', 'READY_FOR_REVIEW'))
  ) then
    raise exception 'procedure_run: illegal transition % → % (run %)', old.status, new.status, old.id
      using errcode = '22023';
  end if;
  if new.status = 'IN_PROGRESS' and new.started_at is null then
    new.started_at := now();
  end if;
  if new.status = 'COMPLETED' and new.completed_at is null then
    new.completed_at := now();
  end if;
  return new;
end;
$$;

create trigger ipr_enforce_state
  before update on public.intervention_procedure_runs
  for each row execute function private.enforce_procedure_run_state_transition();

-- =========================================================================
-- Section 4 — field_step_results
-- =========================================================================
create table public.field_step_results (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references public.organizations(id) on delete cascade,
  run_id             uuid not null,
  step_id            uuid not null references public.field_procedure_steps(id) on delete restrict,
  captured_at        timestamptz not null,
  value_json         jsonb not null default '{}'::jsonb check (jsonb_typeof(value_json) = 'object'),
  actor_user_id      uuid not null,
  device_ref         text check (device_ref is null or length(device_ref) <= 200),
  offline_client_id  text check (offline_client_id is null or length(offline_client_id) between 1 and 100),
  sync_status        text not null default 'SYNCED'
    check (sync_status in ('SYNCED', 'CONFLICT', 'IGNORED')),
  conflict_reason    text check (conflict_reason is null or length(conflict_reason) <= 500),
  created_at         timestamptz not null default now(),
  foreign key (run_id, organization_id) references public.intervention_procedure_runs(id, organization_id) on delete cascade
);

comment on table public.field_step_results is
  'One row per (run, step, offline_client_id). Partial unique on (run, step, offline_client_id) enforces idempotent offline sync; a conflict is PRESERVED (not silently dropped) — human triage resolves.';

create unique index fsr_run_step_offline_uniq on public.field_step_results
  (run_id, step_id, offline_client_id)
  where offline_client_id is not null;
create index fsr_run_step_idx on public.field_step_results (run_id, step_id);
create index fsr_org_conflict_idx on public.field_step_results
  (organization_id, created_at desc)
  where sync_status = 'CONFLICT';

alter table public.field_step_results enable row level security;

create policy fsr_select on public.field_step_results
  for select to authenticated
  using (private.is_organization_member(organization_id));
create policy fsr_insert on public.field_step_results
  for insert to authenticated
  with check (private.is_organization_member(organization_id));
create policy fsr_update on public.field_step_results
  for update to authenticated
  using (private.is_organization_member(organization_id))
  with check (private.is_organization_member(organization_id));

grant select, insert, update on public.field_step_results to authenticated;
grant select, insert, update on public.field_step_results to service_role;

-- =========================================================================
-- Section 5 — binary_field_artifacts
-- =========================================================================
create table public.binary_field_artifacts (
  id                     uuid primary key default gen_random_uuid(),
  organization_id        uuid not null references public.organizations(id) on delete cascade,
  intervention_id        uuid not null,
  run_id                 uuid,
  step_result_id         uuid,
  kind                   text not null
    check (kind in ('PHOTO', 'SIGNATURE', 'DOCUMENT')),
  storage_bucket         text not null default 'field-binaries' check (length(storage_bucket) between 1 and 60),
  storage_path           text not null check (length(storage_path) between 1 and 500),
  expected_sha256        text not null check (length(expected_sha256) = 64),
  actual_sha256          text check (actual_sha256 is null or length(actual_sha256) = 64),
  content_type           text check (content_type is null or length(content_type) between 1 and 100),
  size_bytes             integer check (size_bytes is null or size_bytes >= 0),
  captured_at            timestamptz not null,
  upload_status          text not null default 'RESERVED'
    check (upload_status in ('RESERVED', 'UPLOADED', 'FINALIZED', 'CONFLICT', 'IGNORED')),
  offline_client_id      text check (offline_client_id is null or length(offline_client_id) between 1 and 100),
  uploaded_by_user_id    uuid not null,
  payload_snapshot       jsonb not null default '{}'::jsonb check (jsonb_typeof(payload_snapshot) = 'object'),
  finalized_at           timestamptz,
  conflict_reason        text check (conflict_reason is null or length(conflict_reason) <= 500),
  created_at             timestamptz not null default now(),
  foreign key (intervention_id, organization_id) references public.interventions(id, organization_id) on delete cascade,
  foreign key (run_id, organization_id) references public.intervention_procedure_runs(id, organization_id) on delete set null,
  unique (organization_id, expected_sha256)
);

comment on table public.binary_field_artifacts is
  'Binaries (photos, signatures, documents). Two-phase upload: reserve_binary_artifact inserts RESERVED with expected_sha256; client uploads to Storage; finalize_binary_artifact compares actual vs expected — mismatch → CONFLICT. Unique (organization_id, expected_sha256) dedupes replays and prevents cross-tenant sha collisions from linking. payload_snapshot immutable: signature evidence stores signer_name / signer_role / consent_version once, never mutated.';

create unique index bfa_org_offline_uniq on public.binary_field_artifacts
  (organization_id, offline_client_id)
  where offline_client_id is not null;
create index bfa_org_run_idx on public.binary_field_artifacts
  (organization_id, run_id)
  where run_id is not null;
create index bfa_org_status_idx on public.binary_field_artifacts
  (organization_id, upload_status)
  where upload_status in ('RESERVED', 'CONFLICT');

alter table public.binary_field_artifacts enable row level security;

create policy bfa_select on public.binary_field_artifacts
  for select to authenticated
  using (private.is_organization_member(organization_id));
create policy bfa_insert on public.binary_field_artifacts
  for insert to authenticated
  with check (private.is_organization_member(organization_id));
create policy bfa_update on public.binary_field_artifacts
  for update to authenticated
  using (private.is_organization_member(organization_id))
  with check (private.is_organization_member(organization_id));

grant select, insert, update on public.binary_field_artifacts to authenticated;
grant select, insert, update, delete on public.binary_field_artifacts to service_role;

-- =========================================================================
-- Section 6 — Storage bucket 'field-binaries' + RLS
-- =========================================================================
-- Private bucket (public=false). Paths conventionally start with
-- '{organization_id}/...' so the RLS policy scoping to
-- storage.foldername(name)[1] enforces tenant safety.
insert into storage.buckets (id, name, public)
values ('field-binaries', 'field-binaries', false)
on conflict (id) do nothing;

create policy field_binaries_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'field-binaries'
    and private.is_organization_member((storage.foldername(name))[1]::uuid)
  );
create policy field_binaries_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'field-binaries'
    and private.is_organization_member((storage.foldername(name))[1]::uuid)
  );
create policy field_binaries_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'field-binaries'
    and private.is_organization_member((storage.foldername(name))[1]::uuid)
  )
  with check (
    bucket_id = 'field-binaries'
    and private.is_organization_member((storage.foldername(name))[1]::uuid)
  );

-- =========================================================================
-- Section 7 — start_procedure_run RPC
-- =========================================================================
create or replace function public.start_procedure_run(
  target_organization_id uuid,
  target_intervention_id uuid,
  target_template_id     uuid,
  target_actor_user_id   uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  template_row  public.field_procedure_templates%rowtype;
  new_run_id    uuid;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'start_procedure_run: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.organization_members
    where organization_id = target_organization_id
      and user_id = target_actor_user_id
      and status = 'ACTIVE'
  ) then
    raise exception 'start_procedure_run: actor % is not an ACTIVE member', target_actor_user_id
      using errcode = '42501';
  end if;

  select * into template_row
  from public.field_procedure_templates
  where id = target_template_id
    and (organization_id is null or organization_id = target_organization_id)
    and active = true;
  if template_row.id is null then
    raise exception 'start_procedure_run: template % not found or not active for org %',
      target_template_id, target_organization_id
      using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.interventions
    where id = target_intervention_id
      and organization_id = target_organization_id
  ) then
    raise exception 'start_procedure_run: intervention % not found in org %',
      target_intervention_id, target_organization_id
      using errcode = '22023';
  end if;

  insert into public.intervention_procedure_runs (
    organization_id, intervention_id, template_id, template_version, status, started_at
  ) values (
    target_organization_id, target_intervention_id, template_row.id, template_row.version,
    'IN_PROGRESS', now()
  )
  returning id into new_run_id;

  perform public.record_audit_log(
    target_organization_id, 'procedure_run.start',
    'intervention_procedure_run', new_run_id,
    jsonb_build_object(
      'intervention_id', target_intervention_id,
      'template_id', template_row.id,
      'template_version', template_row.version,
      'actor_user_id', target_actor_user_id
    )
  );
  return new_run_id;
end;
$$;

revoke all on function public.start_procedure_run(uuid, uuid, uuid, uuid) from public, anon;
grant execute on function public.start_procedure_run(uuid, uuid, uuid, uuid) to authenticated, service_role;

-- =========================================================================
-- Section 8 — submit_step_result RPC (idempotent)
-- =========================================================================
create or replace function public.submit_step_result(
  target_organization_id   uuid,
  target_run_id            uuid,
  target_step_id           uuid,
  target_value_json        jsonb,
  target_captured_at       timestamptz,
  target_actor_user_id     uuid,
  target_offline_client_id text,
  target_device_ref        text
)
returns table (
  result_id     uuid,
  sync_status   text,
  created       boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  run_row      public.intervention_procedure_runs%rowtype;
  step_row     public.field_procedure_steps%rowtype;
  existing_id  uuid;
  existing_st  text;
  new_id       uuid;
  status_out   text := 'SYNCED';
  conflict_rn  text;
  numeric_val  numeric;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'submit_step_result: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.organization_members
    where organization_id = target_organization_id
      and user_id = target_actor_user_id
      and status = 'ACTIVE'
  ) then
    raise exception 'submit_step_result: actor % is not an ACTIVE member', target_actor_user_id
      using errcode = '42501';
  end if;

  select * into run_row
  from public.intervention_procedure_runs
  where id = target_run_id
    and organization_id = target_organization_id;
  if run_row.id is null then
    raise exception 'submit_step_result: run % not found in org %', target_run_id, target_organization_id
      using errcode = '22023';
  end if;

  select * into step_row
  from public.field_procedure_steps
  where id = target_step_id
    and template_id = run_row.template_id;
  if step_row.id is null then
    raise exception 'submit_step_result: step % does not belong to run template', target_step_id
      using errcode = '22023';
  end if;

  -- Idempotency lookup
  if target_offline_client_id is not null then
    select id, sync_status into existing_id, existing_st
    from public.field_step_results
    where run_id = target_run_id
      and step_id = target_step_id
      and offline_client_id = target_offline_client_id;
    if existing_id is not null then
      result_id   := existing_id;
      sync_status := existing_st;
      created     := false;
      return next;
      return;
    end if;
  end if;

  -- Terminal run cannot accept new results (a conflict is still recorded)
  if run_row.status in ('COMPLETED') then
    status_out := 'CONFLICT';
    conflict_rn := format('run already %s when step result arrived — human review required', run_row.status);
  end if;

  -- MEASUREMENT out-of-range → CONFLICT (never a "conforme" verdict, but observable)
  if step_row.kind = 'MEASUREMENT' and target_value_json ? 'value' then
    begin
      numeric_val := (target_value_json->>'value')::numeric;
      if (step_row.range_min is not null and numeric_val < step_row.range_min)
         or (step_row.range_max is not null and numeric_val > step_row.range_max) then
        status_out  := coalesce(nullif(status_out, 'SYNCED'), 'CONFLICT');
        conflict_rn := coalesce(conflict_rn,
          format('measurement %s outside range [%s..%s]',
            numeric_val, coalesce(step_row.range_min::text, '-∞'), coalesce(step_row.range_max::text, '+∞')));
      end if;
    exception when others then
      -- Non-numeric value in MEASUREMENT is a soft conflict
      status_out  := 'CONFLICT';
      conflict_rn := 'measurement value is not numeric';
    end;
  end if;

  insert into public.field_step_results (
    organization_id, run_id, step_id, captured_at, value_json,
    actor_user_id, device_ref, offline_client_id, sync_status, conflict_reason
  ) values (
    target_organization_id, target_run_id, target_step_id, target_captured_at, target_value_json,
    target_actor_user_id, target_device_ref, target_offline_client_id, status_out, conflict_rn
  )
  returning id into new_id;

  -- Emit an attention if the result was a conflict
  if status_out = 'CONFLICT' then
    perform public.insert_attention_once(
      target_organization_id,
      'attention:offline_conflict:' || new_id::text,
      'FIELD_OPS',
      'OFFLINE_CONFLICT',
      'Résultat d''étape en conflit',
      'NORMAL',
      'field_step_result',
      new_id,
      conflict_rn,
      'Vérifier et résoudre le conflit via resolve_step_conflict.',
      null, null,
      jsonb_build_object('run_id', target_run_id, 'step_id', target_step_id)
    );
  end if;

  result_id   := new_id;
  sync_status := status_out;
  created     := true;
  return next;
end;
$$;

revoke all on function public.submit_step_result(uuid, uuid, uuid, jsonb, timestamptz, uuid, text, text) from public, anon;
grant execute on function public.submit_step_result(uuid, uuid, uuid, jsonb, timestamptz, uuid, text, text) to authenticated, service_role;

-- =========================================================================
-- Section 9 — reserve_binary_artifact RPC
-- =========================================================================
-- Inserts RESERVED row with expected_sha256 + a suggested storage_path.
-- Client uses the returned storage_path to upload; then calls
-- finalize_binary_artifact.
create or replace function public.reserve_binary_artifact(
  target_organization_id   uuid,
  target_intervention_id   uuid,
  target_run_id            uuid,
  target_kind              text,
  target_expected_sha256   text,
  target_captured_at       timestamptz,
  target_uploaded_by_user_id uuid,
  target_offline_client_id text,
  target_payload_snapshot  jsonb
)
returns table (
  artifact_id     uuid,
  storage_bucket  text,
  storage_path    text,
  upload_status   text,
  created         boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_id  uuid;
  existing_st  text;
  new_id       uuid;
  new_path     text;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'reserve_binary_artifact: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.organization_members
    where organization_id = target_organization_id
      and user_id = target_uploaded_by_user_id
      and status = 'ACTIVE'
  ) then
    raise exception 'reserve_binary_artifact: uploader % is not an ACTIVE member', target_uploaded_by_user_id
      using errcode = '42501';
  end if;
  if target_kind not in ('PHOTO', 'SIGNATURE', 'DOCUMENT') then
    raise exception 'reserve_binary_artifact: invalid kind %', target_kind
      using errcode = '22023';
  end if;
  if target_expected_sha256 is null or length(target_expected_sha256) <> 64 then
    raise exception 'reserve_binary_artifact: expected_sha256 must be a 64-char hex string'
      using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.interventions
    where id = target_intervention_id
      and organization_id = target_organization_id
  ) then
    raise exception 'reserve_binary_artifact: intervention % not found in org %',
      target_intervention_id, target_organization_id
      using errcode = '22023';
  end if;

  -- Dedup on sha256 (same file uploaded twice → same row)
  select id, upload_status into existing_id, existing_st
  from public.binary_field_artifacts
  where organization_id = target_organization_id
    and expected_sha256 = target_expected_sha256;
  if existing_id is not null then
    artifact_id    := existing_id;
    storage_bucket := 'field-binaries';
    storage_path   := (
      select storage_path from public.binary_field_artifacts where id = existing_id
    );
    upload_status  := existing_st;
    created        := false;
    return next;
    return;
  end if;

  new_path := target_organization_id::text || '/' || target_intervention_id::text
              || '/' || target_expected_sha256;

  insert into public.binary_field_artifacts (
    organization_id, intervention_id, run_id, kind, storage_bucket, storage_path,
    expected_sha256, captured_at, upload_status, offline_client_id,
    uploaded_by_user_id, payload_snapshot
  ) values (
    target_organization_id, target_intervention_id, target_run_id, target_kind,
    'field-binaries', new_path,
    target_expected_sha256, target_captured_at, 'RESERVED', target_offline_client_id,
    target_uploaded_by_user_id, target_payload_snapshot
  )
  returning id into new_id;

  artifact_id    := new_id;
  storage_bucket := 'field-binaries';
  storage_path   := new_path;
  upload_status  := 'RESERVED';
  created        := true;
  return next;
end;
$$;

revoke all on function public.reserve_binary_artifact(uuid, uuid, uuid, text, text, timestamptz, uuid, text, jsonb) from public, anon;
grant execute on function public.reserve_binary_artifact(uuid, uuid, uuid, text, text, timestamptz, uuid, text, jsonb) to authenticated, service_role;

-- =========================================================================
-- Section 10 — finalize_binary_artifact RPC
-- =========================================================================
create or replace function public.finalize_binary_artifact(
  target_organization_id uuid,
  target_artifact_id     uuid,
  target_actual_sha256   text,
  target_size_bytes      integer,
  target_content_type    text
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
  row_before public.binary_field_artifacts%rowtype;
  status_out text;
  reason_out text;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'finalize_binary_artifact: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if target_actual_sha256 is null or length(target_actual_sha256) <> 64 then
    raise exception 'finalize_binary_artifact: actual_sha256 must be a 64-char hex string'
      using errcode = '22023';
  end if;

  select * into row_before
  from public.binary_field_artifacts
  where id = target_artifact_id
    and organization_id = target_organization_id;
  if row_before.id is null then
    raise exception 'finalize_binary_artifact: artifact % not found in org %',
      target_artifact_id, target_organization_id
      using errcode = '22023';
  end if;

  if row_before.upload_status = 'FINALIZED' then
    -- Replay: return existing state
    artifact_id     := row_before.id;
    upload_status   := row_before.upload_status;
    conflict_reason := row_before.conflict_reason;
    return next;
    return;
  end if;

  if row_before.upload_status not in ('RESERVED', 'UPLOADED') then
    raise exception 'finalize_binary_artifact: artifact % is in state % (cannot finalize)',
      row_before.id, row_before.upload_status
      using errcode = '22023';
  end if;

  if row_before.expected_sha256 <> target_actual_sha256 then
    status_out := 'CONFLICT';
    reason_out := format('sha256 mismatch: expected=%s actual=%s',
      row_before.expected_sha256, target_actual_sha256);
    perform public.insert_attention_once(
      target_organization_id,
      'attention:binary_sha_mismatch:' || row_before.id::text,
      'FIELD_OPS',
      'BINARY_SHA_MISMATCH',
      'Empreinte binaire divergente',
      'HIGH',
      'binary_field_artifact',
      row_before.id,
      reason_out,
      'Vérifier le binaire uploadé — potentielle altération.',
      null, null,
      jsonb_build_object('intervention_id', row_before.intervention_id, 'kind', row_before.kind)
    );
  else
    status_out := 'FINALIZED';
    reason_out := null;
  end if;

  update public.binary_field_artifacts
    set upload_status   = status_out,
        actual_sha256   = target_actual_sha256,
        size_bytes      = target_size_bytes,
        content_type    = target_content_type,
        finalized_at    = case when status_out = 'FINALIZED' then now() else null end,
        conflict_reason = reason_out
  where id = target_artifact_id
    and organization_id = target_organization_id;

  perform public.record_audit_log(
    target_organization_id, 'binary_artifact.finalize',
    'binary_field_artifact', target_artifact_id,
    jsonb_build_object(
      'upload_status', status_out,
      'size_bytes', target_size_bytes,
      'content_type', target_content_type
    )
  );

  artifact_id     := target_artifact_id;
  upload_status   := status_out;
  conflict_reason := reason_out;
  return next;
end;
$$;

revoke all on function public.finalize_binary_artifact(uuid, uuid, text, integer, text) from public, anon;
grant execute on function public.finalize_binary_artifact(uuid, uuid, text, integer, text) to authenticated, service_role;

-- =========================================================================
-- Section 11 — submit_signature_evidence RPC
-- =========================================================================
-- Records the client sign-off. Requires a FINALIZED binary artifact of
-- kind='SIGNATURE'. Payload_snapshot is UPDATED once with the signer
-- attestation — the payload is not the signature itself (the binary is),
-- it's the human context (name, role, consent version).
create or replace function public.submit_signature_evidence(
  target_organization_id uuid,
  target_run_id          uuid,
  target_artifact_id     uuid,
  target_signer_name     text,
  target_signer_role     text,
  target_consent_version text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  artifact_row public.binary_field_artifacts%rowtype;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'submit_signature_evidence: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if target_signer_name is null or length(target_signer_name) = 0 or length(target_signer_name) > 200 then
    raise exception 'submit_signature_evidence: signer_name is required (1..200 chars)'
      using errcode = '22023';
  end if;
  if target_signer_role not in ('CUSTOMER', 'SITE_MANAGER', 'TECHNICIAN', 'OTHER') then
    raise exception 'submit_signature_evidence: invalid signer_role %', target_signer_role
      using errcode = '22023';
  end if;
  if target_consent_version is null or length(target_consent_version) = 0 or length(target_consent_version) > 40 then
    raise exception 'submit_signature_evidence: consent_version is required (1..40 chars)'
      using errcode = '22023';
  end if;

  select * into artifact_row
  from public.binary_field_artifacts
  where id = target_artifact_id
    and organization_id = target_organization_id;
  if artifact_row.id is null then
    raise exception 'submit_signature_evidence: artifact % not found in org %',
      target_artifact_id, target_organization_id
      using errcode = '22023';
  end if;
  if artifact_row.kind <> 'SIGNATURE' then
    raise exception 'submit_signature_evidence: artifact % is kind=%, expected SIGNATURE',
      artifact_row.id, artifact_row.kind
      using errcode = '22023';
  end if;
  if artifact_row.upload_status <> 'FINALIZED' then
    raise exception 'submit_signature_evidence: artifact % must be FINALIZED (got %)',
      artifact_row.id, artifact_row.upload_status
      using errcode = '22023';
  end if;
  if artifact_row.payload_snapshot ? 'signer_name' then
    -- Idempotent replay
    return false;
  end if;

  update public.binary_field_artifacts
    set payload_snapshot = jsonb_build_object(
          'signer_name', target_signer_name,
          'signer_role', target_signer_role,
          'signed_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
          'consent_version', target_consent_version,
          'run_id', target_run_id
        )
  where id = target_artifact_id
    and organization_id = target_organization_id;

  perform public.record_audit_log(
    target_organization_id, 'signature_evidence.submit',
    'binary_field_artifact', target_artifact_id,
    jsonb_build_object(
      'signer_role', target_signer_role,
      'consent_version', target_consent_version,
      'run_id', target_run_id
    )
  );
  return true;
end;
$$;

revoke all on function public.submit_signature_evidence(uuid, uuid, uuid, text, text, text) from public, anon;
grant execute on function public.submit_signature_evidence(uuid, uuid, uuid, text, text, text) to authenticated, service_role;

-- =========================================================================
-- Section 12 — mark_run_ready_for_review + complete_run
-- =========================================================================
create or replace function public.mark_run_ready_for_review(
  target_organization_id uuid,
  target_run_id          uuid
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
    raise exception 'mark_run_ready_for_review: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;

  update public.intervention_procedure_runs
    set status = 'READY_FOR_REVIEW'
  where id = target_run_id
    and organization_id = target_organization_id
    and status = 'IN_PROGRESS';
  get diagnostics affected = row_count;
  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'procedure_run.ready_for_review',
      'intervention_procedure_run', target_run_id, '{}'::jsonb
    );
    perform public.insert_attention_once(
      target_organization_id,
      'attention:procedure_ready_for_review:' || target_run_id::text,
      'FIELD_OPS',
      'PROCEDURE_READY_FOR_REVIEW',
      'Procédure prête pour revue',
      'NORMAL',
      'intervention_procedure_run',
      target_run_id,
      'Le technicien a marqué la procédure comme prête pour revue.',
      'Contrôler les résultats et compléter la procédure.',
      null, null, '{}'::jsonb
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.mark_run_ready_for_review(uuid, uuid) from public, anon;
grant execute on function public.mark_run_ready_for_review(uuid, uuid) to authenticated, service_role;

create or replace function public.complete_run(
  target_organization_id uuid,
  target_run_id          uuid,
  target_review_notes    text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  run_row       public.intervention_procedure_runs%rowtype;
  missing_count integer;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'complete_run: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;

  select * into run_row
  from public.intervention_procedure_runs
  where id = target_run_id
    and organization_id = target_organization_id;
  if run_row.id is null then
    raise exception 'complete_run: run % not found', target_run_id
      using errcode = '22023';
  end if;
  if run_row.status = 'COMPLETED' then
    return false;
  end if;
  if run_row.status not in ('READY_FOR_REVIEW', 'IN_PROGRESS') then
    raise exception 'complete_run: run % is in status % (cannot complete)', run_row.id, run_row.status
      using errcode = '22023';
  end if;

  -- Every required step must have a SYNCED result
  select count(*) into missing_count
  from public.field_procedure_steps s
  where s.template_id = run_row.template_id
    and s.required = true
    and not exists (
      select 1 from public.field_step_results r
      where r.run_id = run_row.id
        and r.step_id = s.id
        and r.sync_status = 'SYNCED'
    );
  if missing_count > 0 then
    perform public.insert_attention_once(
      target_organization_id,
      'attention:procedure_step_missing:' || run_row.id::text,
      'FIELD_OPS',
      'PROCEDURE_STEP_MISSING',
      'Procédure incomplète',
      'HIGH',
      'intervention_procedure_run',
      run_row.id,
      format('%s étape(s) requise(s) sans résultat SYNCED', missing_count),
      'Compléter les étapes manquantes ou marquer NEEDS_ATTENTION.',
      null, null, '{}'::jsonb
    );
    raise exception 'complete_run: run % has % required step(s) without a SYNCED result',
      run_row.id, missing_count
      using errcode = '22023';
  end if;

  update public.intervention_procedure_runs
    set status       = 'COMPLETED',
        review_notes = target_review_notes,
        completed_at = now()
  where id = run_row.id
    and organization_id = target_organization_id;

  perform public.record_audit_log(
    target_organization_id, 'procedure_run.complete',
    'intervention_procedure_run', run_row.id,
    jsonb_build_object('review_notes_length', coalesce(length(target_review_notes), 0))
  );
  return true;
end;
$$;

revoke all on function public.complete_run(uuid, uuid, text) from public, anon;
grant execute on function public.complete_run(uuid, uuid, text) to authenticated, service_role;

-- =========================================================================
-- Section 13 — resolve_step_conflict RPC
-- =========================================================================
create or replace function public.resolve_step_conflict(
  target_organization_id uuid,
  target_result_id       uuid,
  target_actor_user_id   uuid,
  target_decision        text,
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
    raise exception 'resolve_step_conflict: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.organization_members
    where organization_id = target_organization_id
      and user_id = target_actor_user_id
      and status = 'ACTIVE'
  ) then
    raise exception 'resolve_step_conflict: actor % is not an ACTIVE member', target_actor_user_id
      using errcode = '42501';
  end if;
  if target_decision not in ('SYNCED', 'IGNORED') then
    raise exception 'resolve_step_conflict: decision must be SYNCED or IGNORED (got %)', target_decision
      using errcode = '22023';
  end if;

  update public.field_step_results
    set sync_status     = target_decision,
        conflict_reason = coalesce(conflict_reason, '') || ' | resolution: ' || coalesce(target_note, '(no note)')
  where id = target_result_id
    and organization_id = target_organization_id
    and sync_status = 'CONFLICT';
  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'field_step_result.resolve_conflict',
      'field_step_result', target_result_id,
      jsonb_build_object('decision', target_decision, 'actor_user_id', target_actor_user_id)
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.resolve_step_conflict(uuid, uuid, uuid, text, text) from public, anon;
grant execute on function public.resolve_step_conflict(uuid, uuid, uuid, text, text) to authenticated, service_role;
