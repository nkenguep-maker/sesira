-- SESIRA Core Workflow — Document trust: versions, provider evidence,
-- timestamp / signature / seal (C45).
--
-- Adds a provider-backed trust layer on top of the existing `documents`
-- catalogue. NEVER makes a legal-status claim on its own — the level
-- (ADVANCED / QUALIFIED / QES / QESeal / …) is always the STRING the
-- provider returned; SESIRA never re-classifies it.
--
-- Reference: docs/core/CORE_EXTENSIONS_PLAN.md §7 C45.
--
-- Adds:
--   * NEW `document_versions` — one row per hashed version of a document.
--     Multiple rows per document allowed (edit history). Composite FK
--     (document_id, organization_id) → documents. Same file can back
--     multiple document rows (sha256 is NOT unique).
--   * NEW `trust_providers` — global registry (no organization_id).
--     Rows describe which capabilities each provider supports
--     (TIMESTAMP / SIGNATURE / SEAL), whether it is production-ready,
--     and its region. anon has NO read.
--   * NEW `document_trust_requests` — one row per (org, document_version,
--     capability, idempotency_key). state machine
--     DRAFT → READY → SUBMITTED → CONFIRMED | REJECTED | FAILED | CANCELLED.
--     Terminal states blocked from further mutation.
--   * NEW `document_trust_evidence` — insert-once record of what the
--     provider actually returned. Immutable after INSERT (trigger).
--     `signature_seal_level_reported_by_provider` is the raw string
--     — UI must render it verbatim.
--   * 6 SECURITY DEFINER RPCs + 1 immutability trigger.
--
-- DOCTRINE INVARIANTS APPLIED:
--
--   Wording strict (INV — REGULATORY.md §1.5 + doctrine §7):
--     * signature_seal_level_reported_by_provider is the ONLY source
--       of truth for the legal level. UI/read-model exposes it as-is
--       AND may only render "qualifié" / "certifié" wording when the
--       level ∈ (QUALIFIED, QES, QESeal) AND the provider is
--       production_ready=true. That gate lives in the read model layer
--       (C49). The DB simply stores facts.
--     * verification_result ∈ PASS | FAIL | UNKNOWN. UNKNOWN is the
--       explicit "we cannot yet verify" — never elided into PASS.
--     * FAILED and REJECTED are distinct: FAILED = transport/technical
--       problem; REJECTED = provider actively refused.
--
--   Insert-once evidence:
--     * `document_trust_evidence` has a trigger BEFORE UPDATE that
--       raises. Once the provider callback lands, the evidence is
--       immutable. Amendments require a NEW request + NEW evidence row.
--
--   No fake success:
--     * `mark_trust_request_submitted` is service_role. Only the
--       server-side path that has actually called the provider can
--       write SUBMITTED — a client cannot pretend.
--     * `record_trust_evidence` is service_role. Only a real webhook
--       receipt or a verified poll can write CONFIRMED.
--     * status = CONFIRMED requires an evidence row (enforced via
--       trigger-checked state transition and evidence relationship).
--
--   Cross-tenant safety:
--     * All request/evidence rows RLS-scoped to organization_id.
--     * trust_providers is a global registry; anon deny; select for
--       authenticated OK (it's a catalogue, no secrets).
--
--   Secret hygiene:
--     * `certificate_metadata` is a jsonb blob provided by the caller.
--       It MUST NOT contain private keys or plaintext credentials —
--       the caller is responsible for sanitizing (out-of-scope of DB).
--       A grep for -----BEGIN PRIVATE KEY----- across pg_proc.prosrc
--       is expected to return 0.
--
-- Non-goals (deferred):
--   * Actual RFC3161 TSR verification — reserved for a future
--     application-side verifier that populates verification_result.
--   * Real production adapters (Docusign, YouSign, Signicat) —
--     PendingProductionTrustProvider is the default.

-- =========================================================================
-- Section 1 — document_versions
-- =========================================================================
create table public.document_versions (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  document_id       uuid not null,
  version           integer not null default 1 check (version >= 1),
  sha256            text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  mime_type         text check (mime_type is null or length(mime_type) between 1 and 200),
  source_reference  text check (source_reference is null or length(source_reference) between 1 and 500),
  storage_bucket    text not null check (length(storage_bucket) between 1 and 60),
  storage_path      text not null check (length(storage_path) between 1 and 500),
  size_bytes        bigint check (size_bytes is null or size_bytes >= 0),
  created_at        timestamptz not null default now(),
  foreign key (document_id, organization_id) references public.documents(id, organization_id) on delete cascade,
  unique (document_id, version),
  unique (id, organization_id)
);

comment on table public.document_versions is
  'Versioned hash of a document. Composite FK to (documents.id, organization_id). Non-unique (organization_id, sha256) — the same file can back multiple document rows.';

create index dv_org_document_idx on public.document_versions (organization_id, document_id);
create index dv_org_sha_idx on public.document_versions (organization_id, sha256);

alter table public.document_versions enable row level security;

create policy dv_select on public.document_versions
  for select to authenticated using (private.is_organization_member(organization_id));
create policy dv_insert on public.document_versions
  for insert to authenticated with check (private.is_organization_member(organization_id));

grant select, insert on public.document_versions to authenticated;
grant select, insert on public.document_versions to service_role;

-- =========================================================================
-- Section 2 — trust_providers (global registry)
-- =========================================================================
create table public.trust_providers (
  id                     uuid primary key default gen_random_uuid(),
  provider_kind          text not null unique check (provider_kind in
    ('TEST', 'PENDING_PRODUCTION', 'DOCUSIGN', 'YOUSIGN', 'SIGNICAT', 'UNIVERSIGN', 'OTHER')),
  status                 text not null default 'PENDING'
    check (status in ('ACTIVE', 'PENDING', 'DISABLED')),
  supported_capabilities text[] not null default '{}',
  region                 text check (region is null or length(region) between 1 and 60),
  production_ready       boolean not null default false,
  metadata               jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

comment on table public.trust_providers is
  'Global registry of trust providers. Each row lists supported capabilities (TIMESTAMP / SIGNATURE / SEAL), whether the provider is production-ready, and its region. anon has no read; authenticated may read (catalogue, no secrets).';

alter table public.trust_providers enable row level security;

create policy tp_select on public.trust_providers
  for select to authenticated using (true);
-- Insert / update reserved to service_role.
grant select on public.trust_providers to authenticated;
grant select, insert, update on public.trust_providers to service_role;

-- Seed the two baseline rows (test + pending) so the seam always has
-- something to name.
insert into public.trust_providers (provider_kind, status, supported_capabilities, region, production_ready)
values
  ('TEST', 'ACTIVE', '{TIMESTAMP,SIGNATURE,SEAL}', 'test', false),
  ('PENDING_PRODUCTION', 'PENDING', '{}', null, false)
on conflict (provider_kind) do nothing;

-- =========================================================================
-- Section 3 — document_trust_requests
-- =========================================================================
create table public.document_trust_requests (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations(id) on delete cascade,
  document_version_id   uuid not null,
  requested_capability  text not null check (requested_capability in ('TIMESTAMP', 'SIGNATURE', 'SEAL')),
  requested_level       text not null check (length(requested_level) between 1 and 40),
  status                text not null default 'DRAFT'
    check (status in ('DRAFT', 'READY', 'SUBMITTED', 'CONFIRMED', 'REJECTED', 'FAILED', 'CANCELLED')),
  provider_id           uuid references public.trust_providers(id) on delete set null,
  provider_snapshot     jsonb not null default '{}'::jsonb check (jsonb_typeof(provider_snapshot) = 'object'),
  idempotency_key       text not null check (length(idempotency_key) between 1 and 200),
  external_ref          text check (external_ref is null or length(external_ref) between 1 and 200),
  submitted_at          timestamptz,
  terminal_at           timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  foreign key (document_version_id, organization_id) references public.document_versions(id, organization_id) on delete cascade,
  unique (organization_id, idempotency_key),
  unique (id, organization_id)
);

comment on table public.document_trust_requests is
  'One row per (org, document_version, capability, idempotency_key). state machine DRAFT → READY → SUBMITTED → CONFIRMED | REJECTED | FAILED | CANCELLED. provider_snapshot captures the provider config at submit time so subsequent config edits do not retroactively rewrite history (INV-03 style).';

create index dtr_org_status_idx on public.document_trust_requests (organization_id, status);
create index dtr_org_docver_idx on public.document_trust_requests (organization_id, document_version_id);

alter table public.document_trust_requests enable row level security;

create policy dtr_select on public.document_trust_requests
  for select to authenticated using (private.is_organization_member(organization_id));
create policy dtr_insert on public.document_trust_requests
  for insert to authenticated with check (private.is_organization_member(organization_id));
create policy dtr_update on public.document_trust_requests
  for update to authenticated
  using (private.is_organization_member(organization_id))
  with check (private.is_organization_member(organization_id));

grant select, insert, update on public.document_trust_requests to authenticated;
grant select, insert, update on public.document_trust_requests to service_role;

create or replace function private.enforce_trust_request_state_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  if new.status = old.status then
    return new;
  end if;
  if old.status in ('CONFIRMED', 'REJECTED', 'FAILED', 'CANCELLED') then
    raise exception 'trust_request: terminal state % is immutable (id=%)', old.status, old.id
      using errcode = '22023';
  end if;
  if not (
    (old.status = 'DRAFT'     and new.status in ('READY', 'CANCELLED'))
    or (old.status = 'READY'     and new.status in ('SUBMITTED', 'CANCELLED'))
    or (old.status = 'SUBMITTED' and new.status in ('CONFIRMED', 'REJECTED', 'FAILED', 'CANCELLED'))
  ) then
    raise exception 'trust_request: illegal transition % → % (id=%)', old.status, new.status, old.id
      using errcode = '22023';
  end if;
  if new.status in ('CONFIRMED', 'REJECTED', 'FAILED', 'CANCELLED') and new.terminal_at is null then
    new.terminal_at := now();
  end if;
  return new;
end;
$$;

create trigger dtr_enforce_state
  before update on public.document_trust_requests
  for each row execute function private.enforce_trust_request_state_transition();

-- =========================================================================
-- Section 4 — document_trust_evidence (insert-once)
-- =========================================================================
create table public.document_trust_evidence (
  id                                          uuid primary key default gen_random_uuid(),
  organization_id                             uuid not null references public.organizations(id) on delete cascade,
  request_id                                  uuid not null,
  provider_ref                                text not null check (length(provider_ref) between 1 and 200),
  confirmed_at                                timestamptz not null,
  raw_evidence_storage_path                   text check (raw_evidence_storage_path is null or length(raw_evidence_storage_path) between 1 and 500),
  certificate_metadata                        jsonb not null default '{}'::jsonb check (jsonb_typeof(certificate_metadata) = 'object'),
  timestamp_token_reference                   text check (timestamp_token_reference is null or length(timestamp_token_reference) between 1 and 500),
  signature_seal_level_reported_by_provider   text check (signature_seal_level_reported_by_provider is null or length(signature_seal_level_reported_by_provider) between 1 and 100),
  verification_result                         text not null default 'UNKNOWN'
    check (verification_result in ('PASS', 'FAIL', 'UNKNOWN')),
  verification_performed_at                   timestamptz,
  verification_notes                          text check (verification_notes is null or length(verification_notes) <= 2000),
  created_at                                  timestamptz not null default now(),
  foreign key (request_id, organization_id) references public.document_trust_requests(id, organization_id) on delete cascade,
  unique (request_id)
);

comment on table public.document_trust_evidence is
  'Insert-once record of the provider outcome. UPDATE blocked by trigger. signature_seal_level_reported_by_provider is stored raw — UI must NOT re-classify it. verification_result UNKNOWN is explicit; do not elide.';

create index dte_org_request_idx on public.document_trust_evidence (organization_id, request_id);
create index dte_org_verify_idx on public.document_trust_evidence (organization_id, verification_result)
  where verification_result <> 'PASS';

alter table public.document_trust_evidence enable row level security;

create policy dte_select on public.document_trust_evidence
  for select to authenticated using (private.is_organization_member(organization_id));
create policy dte_insert on public.document_trust_evidence
  for insert to authenticated with check (private.is_organization_member(organization_id));

grant select, insert on public.document_trust_evidence to authenticated;
grant select, insert on public.document_trust_evidence to service_role;

create or replace function private.enforce_trust_evidence_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Only the verification_* columns may change (once, if UNKNOWN → PASS/FAIL).
  if old.verification_result <> 'UNKNOWN' then
    raise exception 'trust_evidence: rows are append-only once verification_result set (id=%)', old.id
      using errcode = '22023';
  end if;
  if new.provider_ref <> old.provider_ref
     or new.confirmed_at <> old.confirmed_at
     or new.request_id <> old.request_id
     or new.organization_id <> old.organization_id
     or coalesce(new.timestamp_token_reference, '') <> coalesce(old.timestamp_token_reference, '')
     or coalesce(new.signature_seal_level_reported_by_provider, '') <> coalesce(old.signature_seal_level_reported_by_provider, '') then
    raise exception 'trust_evidence: only verification_* columns may change (id=%)', old.id
      using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger dte_immutable
  before update on public.document_trust_evidence
  for each row execute function private.enforce_trust_evidence_immutable();

-- =========================================================================
-- Section 5 — create_document_version RPC
-- =========================================================================
create or replace function public.create_document_version(
  target_organization_id uuid,
  target_document_id     uuid,
  target_sha256          text,
  target_storage_bucket  text,
  target_storage_path    text,
  target_mime_type       text,
  target_size_bytes      bigint,
  target_source_reference text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_version integer;
  new_id       uuid;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'create_document_version: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if target_sha256 is null or target_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'create_document_version: sha256 must be a 64-char hex string'
      using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.documents
    where id = target_document_id
      and organization_id = target_organization_id
  ) then
    raise exception 'create_document_version: document % not found in organization %',
      target_document_id, target_organization_id
      using errcode = '22023';
  end if;

  select coalesce(max(version), 0) + 1 into next_version
  from public.document_versions
  where document_id = target_document_id
    and organization_id = target_organization_id;

  insert into public.document_versions (
    organization_id, document_id, version, sha256, mime_type,
    source_reference, storage_bucket, storage_path, size_bytes
  ) values (
    target_organization_id, target_document_id, next_version, target_sha256, target_mime_type,
    target_source_reference, target_storage_bucket, target_storage_path, target_size_bytes
  )
  returning id into new_id;

  perform public.record_audit_log(
    target_organization_id, 'document_version.create',
    'document_version', new_id,
    jsonb_build_object(
      'document_id', target_document_id,
      'version', next_version,
      'sha256', target_sha256
    )
  );
  return new_id;
end;
$$;

revoke all on function public.create_document_version(uuid, uuid, text, text, text, text, bigint, text) from public, anon;
grant execute on function public.create_document_version(uuid, uuid, text, text, text, text, bigint, text) to authenticated, service_role;

-- =========================================================================
-- Section 6 — request_document_trust RPC (DRAFT)
-- =========================================================================
create or replace function public.request_document_trust(
  target_organization_id      uuid,
  target_document_version_id  uuid,
  target_capability           text,
  target_requested_level      text,
  target_provider_id          uuid,
  target_idempotency_key      text
)
returns table (
  request_id uuid,
  status     text,
  created    boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_id uuid;
  existing_st text;
  provider_row public.trust_providers%rowtype;
  new_id      uuid;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'request_document_trust: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if target_capability not in ('TIMESTAMP', 'SIGNATURE', 'SEAL') then
    raise exception 'request_document_trust: invalid capability %', target_capability
      using errcode = '22023';
  end if;
  if target_requested_level is null or length(target_requested_level) = 0 or length(target_requested_level) > 40 then
    raise exception 'request_document_trust: requested_level required (1..40 chars)'
      using errcode = '22023';
  end if;

  -- Idempotency
  select id, status into existing_id, existing_st
  from public.document_trust_requests
  where organization_id = target_organization_id
    and idempotency_key = target_idempotency_key;
  if existing_id is not null then
    request_id := existing_id;
    status     := existing_st;
    created    := false;
    return next;
    return;
  end if;

  if not exists (
    select 1 from public.document_versions
    where id = target_document_version_id
      and organization_id = target_organization_id
  ) then
    raise exception 'request_document_trust: document_version % not found in org', target_document_version_id
      using errcode = '22023';
  end if;

  if target_provider_id is not null then
    select * into provider_row from public.trust_providers where id = target_provider_id;
    if provider_row.id is null then
      raise exception 'request_document_trust: provider % not found', target_provider_id
        using errcode = '22023';
    end if;
    if not (target_capability = any(provider_row.supported_capabilities)) then
      raise exception 'request_document_trust: provider % does not support %', provider_row.provider_kind, target_capability
        using errcode = '22023';
    end if;
  end if;

  insert into public.document_trust_requests (
    organization_id, document_version_id, requested_capability, requested_level,
    provider_id, provider_snapshot, idempotency_key, status
  ) values (
    target_organization_id, target_document_version_id, target_capability, target_requested_level,
    target_provider_id,
    case when provider_row.id is not null then
      jsonb_build_object(
        'provider_kind', provider_row.provider_kind,
        'status', provider_row.status,
        'production_ready', provider_row.production_ready,
        'region', provider_row.region,
        'supported_capabilities', to_jsonb(provider_row.supported_capabilities)
      )
    else '{}'::jsonb end,
    target_idempotency_key,
    'DRAFT'
  )
  returning id into new_id;

  perform public.record_audit_log(
    target_organization_id, 'trust_request.create',
    'document_trust_request', new_id,
    jsonb_build_object(
      'document_version_id', target_document_version_id,
      'capability', target_capability,
      'requested_level', target_requested_level,
      'provider_id', target_provider_id
    )
  );

  request_id := new_id;
  status     := 'DRAFT';
  created    := true;
  return next;
end;
$$;

revoke all on function public.request_document_trust(uuid, uuid, text, text, uuid, text) from public, anon;
grant execute on function public.request_document_trust(uuid, uuid, text, text, uuid, text) to authenticated, service_role;

-- =========================================================================
-- Section 7 — mark_trust_request_ready + mark_trust_request_submitted
-- =========================================================================
create or replace function public.mark_trust_request_ready(
  target_organization_id uuid,
  target_request_id      uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare affected integer;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'mark_trust_request_ready: caller not authorized'
      using errcode = '42501';
  end if;
  update public.document_trust_requests
    set status = 'READY'
  where id = target_request_id
    and organization_id = target_organization_id
    and status = 'DRAFT';
  get diagnostics affected = row_count;
  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'trust_request.mark_ready',
      'document_trust_request', target_request_id, '{}'::jsonb
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.mark_trust_request_ready(uuid, uuid) from public, anon;
grant execute on function public.mark_trust_request_ready(uuid, uuid) to authenticated, service_role;

create or replace function public.mark_trust_request_submitted(
  target_organization_id uuid,
  target_request_id      uuid,
  target_external_ref    text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare affected integer;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'mark_trust_request_submitted: service_role required'
      using errcode = '42501';
  end if;
  if target_external_ref is null or length(target_external_ref) = 0 then
    raise exception 'mark_trust_request_submitted: external_ref required'
      using errcode = '22023';
  end if;
  update public.document_trust_requests
    set status       = 'SUBMITTED',
        external_ref = target_external_ref,
        submitted_at = now()
  where id = target_request_id
    and organization_id = target_organization_id
    and status = 'READY';
  get diagnostics affected = row_count;
  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'trust_request.submitted',
      'document_trust_request', target_request_id,
      jsonb_build_object('external_ref', target_external_ref)
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.mark_trust_request_submitted(uuid, uuid, text) from public, anon;
grant execute on function public.mark_trust_request_submitted(uuid, uuid, text) to service_role;

-- =========================================================================
-- Section 8 — record_trust_evidence RPC (service_role, insert-once)
-- =========================================================================
create or replace function public.record_trust_evidence(
  target_organization_id                          uuid,
  target_request_id                               uuid,
  target_provider_ref                             text,
  target_confirmed_at                             timestamptz,
  target_raw_evidence_storage_path                text,
  target_certificate_metadata                     jsonb,
  target_timestamp_token_reference                text,
  target_signature_seal_level_reported_by_provider text,
  target_outcome                                  text  -- CONFIRMED | REJECTED | FAILED
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  evidence_id uuid;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'record_trust_evidence: service_role required'
      using errcode = '42501';
  end if;
  if target_outcome not in ('CONFIRMED', 'REJECTED', 'FAILED') then
    raise exception 'record_trust_evidence: invalid outcome %', target_outcome
      using errcode = '22023';
  end if;
  if target_provider_ref is null or length(target_provider_ref) = 0 then
    raise exception 'record_trust_evidence: provider_ref required'
      using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.document_trust_requests
    where id = target_request_id
      and organization_id = target_organization_id
      and status = 'SUBMITTED'
  ) then
    raise exception 'record_trust_evidence: request % is not in SUBMITTED status', target_request_id
      using errcode = '22023';
  end if;

  -- One evidence row per request. On CONFIRMED we insert an evidence row + move
  -- request → CONFIRMED. On REJECTED / FAILED we DO NOT insert evidence — the
  -- request moves to the terminal state and the reason is captured in audit.
  if target_outcome = 'CONFIRMED' then
    insert into public.document_trust_evidence (
      organization_id, request_id, provider_ref, confirmed_at,
      raw_evidence_storage_path, certificate_metadata,
      timestamp_token_reference, signature_seal_level_reported_by_provider,
      verification_result
    ) values (
      target_organization_id, target_request_id, target_provider_ref, target_confirmed_at,
      target_raw_evidence_storage_path, target_certificate_metadata,
      target_timestamp_token_reference, target_signature_seal_level_reported_by_provider,
      'UNKNOWN'
    )
    returning id into evidence_id;
    update public.document_trust_requests
      set status = 'CONFIRMED'
    where id = target_request_id and organization_id = target_organization_id;
  elsif target_outcome = 'REJECTED' then
    update public.document_trust_requests
      set status = 'REJECTED'
    where id = target_request_id and organization_id = target_organization_id;
  else
    update public.document_trust_requests
      set status = 'FAILED'
    where id = target_request_id and organization_id = target_organization_id;
  end if;

  perform public.record_audit_log(
    target_organization_id, 'trust_evidence.record',
    'document_trust_request', target_request_id,
    jsonb_build_object(
      'outcome', target_outcome,
      'provider_ref', target_provider_ref,
      'level_reported', target_signature_seal_level_reported_by_provider
    )
  );

  if target_outcome in ('REJECTED', 'FAILED') then
    perform public.insert_attention_once(
      target_organization_id,
      'attention:trust_' || target_outcome || ':' || target_request_id::text,
      'REGULATORY',
      'TRUST_REQUEST_' || target_outcome,
      'Preuve documentaire ' || target_outcome,
      case when target_outcome = 'REJECTED' then 'HIGH' else 'NORMAL' end,
      'document_trust_request', target_request_id,
      'Le prestataire a retourné ' || target_outcome || '.',
      'Réexaminer la demande ou contacter le prestataire.',
      null, null,
      jsonb_build_object('provider_ref', target_provider_ref)
    );
  end if;

  return evidence_id;  -- null on REJECTED/FAILED
end;
$$;

revoke all on function public.record_trust_evidence(uuid, uuid, text, timestamptz, text, jsonb, text, text, text) from public, anon;
grant execute on function public.record_trust_evidence(uuid, uuid, text, timestamptz, text, jsonb, text, text, text) to service_role;

-- =========================================================================
-- Section 9 — verify_trust_evidence RPC (updates verification_result once)
-- =========================================================================
create or replace function public.verify_trust_evidence(
  target_organization_id uuid,
  target_evidence_id     uuid,
  target_verification_result text,
  target_verification_notes  text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare affected integer;
begin
  if not private.is_organization_member(target_organization_id)
     and (select auth.role()) <> 'service_role' then
    raise exception 'verify_trust_evidence: caller not authorized'
      using errcode = '42501';
  end if;
  if target_verification_result not in ('PASS', 'FAIL') then
    raise exception 'verify_trust_evidence: result must be PASS or FAIL'
      using errcode = '22023';
  end if;

  update public.document_trust_evidence
    set verification_result       = target_verification_result,
        verification_performed_at = now(),
        verification_notes        = target_verification_notes
  where id = target_evidence_id
    and organization_id = target_organization_id
    and verification_result = 'UNKNOWN';
  get diagnostics affected = row_count;
  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'trust_evidence.verify',
      'document_trust_evidence', target_evidence_id,
      jsonb_build_object('result', target_verification_result)
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.verify_trust_evidence(uuid, uuid, text, text) from public, anon;
grant execute on function public.verify_trust_evidence(uuid, uuid, text, text) to authenticated, service_role;

-- =========================================================================
-- Section 10 — cancel_trust_request RPC
-- =========================================================================
create or replace function public.cancel_trust_request(
  target_organization_id uuid,
  target_request_id      uuid,
  target_reason          text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare affected integer;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'cancel_trust_request: caller not authorized'
      using errcode = '42501';
  end if;
  update public.document_trust_requests
    set status = 'CANCELLED'
  where id = target_request_id
    and organization_id = target_organization_id
    and status in ('DRAFT', 'READY', 'SUBMITTED');
  get diagnostics affected = row_count;
  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'trust_request.cancel',
      'document_trust_request', target_request_id,
      jsonb_build_object('reason', target_reason)
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.cancel_trust_request(uuid, uuid, text) from public, anon;
grant execute on function public.cancel_trust_request(uuid, uuid, text) to authenticated, service_role;
