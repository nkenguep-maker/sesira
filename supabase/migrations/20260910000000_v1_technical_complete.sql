-- SESIRA Core Workflow — V1 technical completeness (C16).
--
-- Closes the V1 gate by adding:
--   * onboarding: `create_organization_with_owner` — one atomic
--     transaction that spawns a fresh org + owner membership,
--     removing the last DB-manual step of onboarding a new tenant;
--   * imports: `imports` + `import_rows` tables + RPCs that let a
--     CSV importer record its progress with idempotency (a re-uploaded
--     file with overlapping external_ids does NOT create duplicate
--     entity rows because callers still use `productCreationKey`);
--   * offboarding: `export_organization_snapshot` — returns a JSON
--     snapshot of the org's data counts + basic metadata, enough for
--     a "you can leave with your data" answer without exposing a raw
--     table dump.
--
-- DOCTRINE INVARIANTS enforced here:
--
--   * `create_organization_with_owner` requires the caller (the
--     freshly signed-up user) to match the named owner_user_id — a
--     user cannot bootstrap an org they will not own.
--   * Every write path is SECURITY DEFINER + ACTIVE membership check
--     (except `create_organization_with_owner`, whose whole point is
--     that no membership exists yet).
--   * Import runs cannot cross tenants — `imports.organization_id`
--     is required and every row-level RPC re-verifies the org.
--   * No entity table is directly mutated by import RPCs. The
--     row-recording RPCs only touch `import_rows`. The importer
--     lib layer (src/lib/imports/run-import.ts) invokes the
--     existing entity RPCs for the actual insert, so all
--     invariants (RLS, unique keys, state machines) still apply.

-- =========================================================================
-- 1. imports + import_rows tables
-- =========================================================================
create table public.imports (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  kind              text not null check (kind in ('customers', 'requests', 'quotes')),
  source_filename   text not null check (length(source_filename) between 1 and 500),
  source_size_bytes integer check (source_size_bytes is null or source_size_bytes >= 0),
  status            text not null default 'RUNNING'
    check (status in ('RUNNING', 'COMPLETED', 'PARTIAL', 'FAILED', 'CANCELLED')),
  row_count_total   integer not null default 0 check (row_count_total >= 0),
  row_count_ok      integer not null default 0 check (row_count_ok >= 0),
  row_count_error   integer not null default 0 check (row_count_error >= 0),
  initiator_user_id uuid,
  started_at        timestamptz not null default now(),
  completed_at      timestamptz,
  error             text check (error is null or length(error) <= 2000),
  metadata          jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at        timestamptz not null default now()
);

comment on table public.imports is
  'Per-file import run. One row per uploaded CSV/XLSX. Counts + status + error are updated by finalize_import; row-level detail lives in import_rows.';

create index imports_org_started_idx on public.imports (organization_id, started_at desc);

alter table public.imports enable row level security;

create policy imports_select on public.imports
  for select to authenticated
  using (private.is_organization_member(organization_id));

grant select on public.imports to authenticated;
grant select, insert, update on public.imports to service_role;

create table public.import_rows (
  id             uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  import_id      uuid not null references public.imports(id) on delete cascade,
  row_index      integer not null check (row_index >= 0),
  external_id    text,
  entity_type    text
    check (entity_type is null or entity_type in ('customer', 'request', 'quote')),
  entity_id      uuid,
  status         text not null default 'PENDING'
    check (status in ('PENDING', 'OK', 'ERROR', 'SKIPPED')),
  error_message  text check (error_message is null or length(error_message) <= 2000),
  raw_payload    jsonb not null default '{}'::jsonb check (jsonb_typeof(raw_payload) = 'object'),
  created_at     timestamptz not null default now(),
  unique (import_id, row_index)
);

comment on table public.import_rows is
  'One row per source row processed by an import. `entity_id` points to the row that was actually inserted (via the existing entity RPC) — the importer lib layer is responsible for calling that RPC; import_rows only records the outcome.';

create index import_rows_import_status_idx on public.import_rows (import_id, status);
create index import_rows_org_entity_idx on public.import_rows (organization_id, entity_type, entity_id) where entity_id is not null;

alter table public.import_rows enable row level security;

create policy import_rows_select on public.import_rows
  for select to authenticated
  using (private.is_organization_member(organization_id));

grant select on public.import_rows to authenticated;
grant select, insert, update on public.import_rows to service_role;

-- =========================================================================
-- 2. create_organization_with_owner
-- =========================================================================
create or replace function public.create_organization_with_owner(
  target_name        text,
  target_sector_key  text,
  target_slug        text,
  target_owner_user_id uuid
)
returns table (organization_id uuid, membership_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_uuid uuid;
  new_org_id  uuid;
  new_membership_id uuid;
begin
  caller_uuid := (select auth.uid());
  if caller_uuid is null then
    raise exception 'create_organization_with_owner: caller must be authenticated'
      using errcode = '42501';
  end if;
  if caller_uuid is distinct from target_owner_user_id then
    raise exception 'create_organization_with_owner: owner_user_id must match the caller'
      using errcode = '42501';
  end if;
  if target_name is null or length(target_name) = 0 or length(target_name) > 200 then
    raise exception 'create_organization_with_owner: name must be 1..200 chars'
      using errcode = '22023';
  end if;
  if target_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'create_organization_with_owner: slug must be kebab-case ([a-z0-9-])'
      using errcode = '22023';
  end if;

  insert into public.organizations (name, slug, sector_key, status)
  values (target_name, target_slug, target_sector_key, 'ACTIVE')
  returning id into new_org_id;

  insert into public.organization_members (organization_id, user_id, role, status)
  values (new_org_id, target_owner_user_id, 'OWNER', 'ACTIVE')
  returning id into new_membership_id;

  perform public.record_audit_log(
    new_org_id, 'organization.create',
    'organization', new_org_id,
    jsonb_build_object('owner_user_id', target_owner_user_id, 'sector_key', target_sector_key)
  );

  organization_id := new_org_id;
  membership_id   := new_membership_id;
  return next;
  return;
end;
$$;

revoke all on function public.create_organization_with_owner(text, text, text, uuid)
  from public, anon;
grant execute on function public.create_organization_with_owner(text, text, text, uuid)
  to authenticated;

comment on function public.create_organization_with_owner(text, text, text, uuid) is
  'Bootstrap a fresh organization + owner membership atomically. Caller MUST match owner_user_id. Records an organization.create audit log.';

-- =========================================================================
-- 3. Import RPCs
-- =========================================================================
create or replace function public.record_import_started(
  target_organization_id uuid,
  target_kind            text,
  target_source_filename text,
  target_source_size_bytes integer,
  target_initiator_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_import_id uuid;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'record_import_started: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if target_kind not in ('customers', 'requests', 'quotes') then
    raise exception 'record_import_started: kind must be customers|requests|quotes (got %)', target_kind
      using errcode = '22023';
  end if;

  insert into public.imports (
    organization_id, kind, source_filename, source_size_bytes,
    status, initiator_user_id
  )
  values (
    target_organization_id, target_kind, target_source_filename, target_source_size_bytes,
    'RUNNING', target_initiator_user_id
  )
  returning id into new_import_id;

  return new_import_id;
end;
$$;

revoke all on function public.record_import_started(uuid, text, text, integer, uuid) from public, anon;
grant execute on function public.record_import_started(uuid, text, text, integer, uuid) to authenticated, service_role;

create or replace function public.record_import_row_ok(
  target_organization_id uuid,
  target_import_id       uuid,
  target_row_index       integer,
  target_external_id     text,
  target_entity_type     text,
  target_entity_id       uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_row_id uuid;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'record_import_row_ok: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;

  insert into public.import_rows (
    organization_id, import_id, row_index, external_id,
    entity_type, entity_id, status
  )
  values (
    target_organization_id, target_import_id, target_row_index, target_external_id,
    target_entity_type, target_entity_id, 'OK'
  )
  on conflict (import_id, row_index) do update
    set status = 'OK',
        external_id = excluded.external_id,
        entity_type = excluded.entity_type,
        entity_id = excluded.entity_id
  returning id into new_row_id;

  return new_row_id;
end;
$$;

revoke all on function public.record_import_row_ok(uuid, uuid, integer, text, text, uuid) from public, anon;
grant execute on function public.record_import_row_ok(uuid, uuid, integer, text, text, uuid) to authenticated, service_role;

create or replace function public.record_import_row_error(
  target_organization_id uuid,
  target_import_id       uuid,
  target_row_index       integer,
  target_error_message   text,
  target_raw_payload     jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_row_id uuid;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'record_import_row_error: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;

  insert into public.import_rows (
    organization_id, import_id, row_index, status, error_message, raw_payload
  )
  values (
    target_organization_id, target_import_id, target_row_index,
    'ERROR', target_error_message, coalesce(target_raw_payload, '{}'::jsonb)
  )
  on conflict (import_id, row_index) do update
    set status = 'ERROR',
        error_message = excluded.error_message,
        raw_payload = excluded.raw_payload
  returning id into new_row_id;

  return new_row_id;
end;
$$;

revoke all on function public.record_import_row_error(uuid, uuid, integer, text, jsonb) from public, anon;
grant execute on function public.record_import_row_error(uuid, uuid, integer, text, jsonb) to authenticated, service_role;

create or replace function public.finalize_import(
  target_organization_id uuid,
  target_import_id       uuid,
  target_status          text,
  target_error           text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  ok_count    integer;
  error_count integer;
  affected    integer;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'finalize_import: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if target_status not in ('COMPLETED', 'PARTIAL', 'FAILED', 'CANCELLED') then
    raise exception 'finalize_import: status must be COMPLETED|PARTIAL|FAILED|CANCELLED (got %)', target_status
      using errcode = '22023';
  end if;

  select
    coalesce(sum(case when status = 'OK' then 1 else 0 end), 0),
    coalesce(sum(case when status = 'ERROR' then 1 else 0 end), 0)
  into ok_count, error_count
  from public.import_rows
  where import_id = target_import_id
    and organization_id = target_organization_id;

  update public.imports
    set status = target_status,
        row_count_ok = ok_count,
        row_count_error = error_count,
        row_count_total = ok_count + error_count,
        completed_at = now(),
        error = target_error
  where id = target_import_id
    and organization_id = target_organization_id
    and status = 'RUNNING';

  get diagnostics affected = row_count;
  return affected = 1;
end;
$$;

revoke all on function public.finalize_import(uuid, uuid, text, text) from public, anon;
grant execute on function public.finalize_import(uuid, uuid, text, text) to authenticated, service_role;

-- =========================================================================
-- 4. export_organization_snapshot — GDPR / offboarding basics
-- =========================================================================
create or replace function public.export_organization_snapshot(
  target_organization_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  snapshot jsonb;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'export_organization_snapshot: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;

  select jsonb_build_object(
    'generated_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'organization_id', target_organization_id,
    'counts', jsonb_build_object(
      'customers',           (select count(*) from public.customers where organization_id = target_organization_id),
      'requests',            (select count(*) from public.requests where organization_id = target_organization_id),
      'quotes',              (select count(*) from public.quotes where organization_id = target_organization_id),
      'messages',            (select count(*) from public.messages where organization_id = target_organization_id),
      'events',              (select count(*) from public.events where organization_id = target_organization_id),
      'attention_items',     (select count(*) from public.attention_items where organization_id = target_organization_id),
      'automation_configs',  (select count(*) from public.automation_configs where organization_id = target_organization_id),
      'automation_runs',     (select count(*) from public.automation_runs where organization_id = target_organization_id),
      'ai_runs',             (select count(*) from public.ai_runs where organization_id = target_organization_id),
      'outbound_messages',   (select count(*) from public.outbound_messages where organization_id = target_organization_id),
      'incidents',           (select count(*) from public.incidents where organization_id = target_organization_id),
      'audit_logs',          (select count(*) from public.audit_logs where organization_id = target_organization_id),
      'imports',             (select count(*) from public.imports where organization_id = target_organization_id)
    ),
    'organization', (
      select jsonb_build_object(
        'id', id, 'name', name, 'slug', slug, 'sector_key', sector_key,
        'status', status, 'created_at', created_at
      )
      from public.organizations where id = target_organization_id
    )
  ) into snapshot;

  perform public.record_audit_log(
    target_organization_id, 'organization.export_snapshot',
    'organization', target_organization_id,
    jsonb_build_object('counts_only', true)
  );

  return snapshot;
end;
$$;

revoke all on function public.export_organization_snapshot(uuid) from public, anon;
grant execute on function public.export_organization_snapshot(uuid) to authenticated, service_role;

comment on function public.export_organization_snapshot(uuid) is
  'Return a JSON snapshot of the org: counts across every V1 table + basic org metadata. Enough for a "you can leave with your data" answer. Full row export is deferred to a dedicated dump pipeline post-V1.';
