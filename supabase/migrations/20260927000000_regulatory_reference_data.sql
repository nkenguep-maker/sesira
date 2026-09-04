-- SESIRA Core Workflow — regulatory reference data (C33.1, WAVE 5 kickoff).
--
-- Foundation for F-Gas / CERFA. Three globally-scoped versioned
-- reference tables (GWP values, leak-check rules, market bans)
-- and one org-scoped attestations table.
--
-- DOCTRINE INVARIANTS (regulatory):
--
--   * Regulatory rules are VERSIONED REFERENCE DATA — never
--     hardcoded date logic. NEVER `if year >= 2025 then …` in
--     application code. Always look up in `regulatory_*` tables.
--   * Reference rows are IMMUTABLE once inserted. The only
--     allowed mutation is setting `effective_until` on a superseded
--     row (via `supersede_regulatory_*` RPC). Content columns
--     (fluid_code, gwp_100y, cadence_days, etc.) never change.
--   * Every calculation (tCO₂eq, next-check date, ban check)
--     must persist the id + source_ref of the reference row used,
--     so the exact rule applied is auditable years later.
--   * SESIRA NEVER declares "conforme / non conforme". Reference
--     rows enable "next check due", "attestation expiring",
--     "missing data" — no legal verdicts.
--
-- C33.1 delivers the MECHANISM. Actual F-Gas III / IPCC AR6 seed
-- data ships as a separate SQL script (see
-- `supabase/seeds/regulatory_fgas_iii.example.sql`) that a data
-- operator applies after cross-checking EUR-Lex 2024/573 and
-- IPCC AR6 WG1 Annex VII.

-- =========================================================================
-- regulatory_gwp_values — versioned GWP values per fluid
-- =========================================================================
-- Global (no organization_id). SELECT open to authenticated; INSERT
-- restricted to service_role (data ops); the immutability trigger
-- rejects any non-supersede update.
create table public.regulatory_gwp_values (
  id                uuid primary key default gen_random_uuid(),
  fluid_code        text not null check (length(fluid_code) between 1 and 60),
  fluid_name        text not null check (length(fluid_name) between 1 and 200),
  gwp_100y          numeric(10,3) not null check (gwp_100y > 0),
  ipcc_assessment   text not null
    check (ipcc_assessment in ('AR4', 'AR5', 'AR6', 'AR7')),
  effective_from    date not null,
  effective_until   date,
  source_ref        text not null check (length(source_ref) between 1 and 500),
  provenance        jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (fluid_code, ipcc_assessment, effective_from),
  check (effective_until is null or effective_until >= effective_from)
);

comment on table public.regulatory_gwp_values is
  'Versioned Global Warming Potential (100y) per fluorinated fluid. Reference data — IMMUTABLE once inserted except for setting effective_until once. Every tCO₂eq calculation must persist the row id used.';

create index regulatory_gwp_values_fluid_active_idx
  on public.regulatory_gwp_values (fluid_code, effective_from desc)
  where effective_until is null;
create index regulatory_gwp_values_fluid_history_idx
  on public.regulatory_gwp_values (fluid_code, effective_from desc);

alter table public.regulatory_gwp_values enable row level security;

create policy regulatory_gwp_values_select on public.regulatory_gwp_values
  for select to authenticated using (true);

grant select on public.regulatory_gwp_values to authenticated;
grant select, insert, update on public.regulatory_gwp_values to service_role;

-- =========================================================================
-- regulatory_leak_check_rules — versioned frequency rules
-- =========================================================================
create table public.regulatory_leak_check_rules (
  id                          uuid primary key default gen_random_uuid(),
  rule_code                   text not null check (length(rule_code) between 1 and 60),
  min_tco2eq                  numeric(12,3) not null check (min_tco2eq >= 0),
  max_tco2eq                  numeric(12,3) check (max_tco2eq is null or max_tco2eq > min_tco2eq),
  cadence_days                integer not null check (cadence_days between 30 and 3650),
  requires_leak_detector      boolean not null default false,
  detector_reduction_factor   numeric(3,2) check (detector_reduction_factor is null or (detector_reduction_factor > 0 and detector_reduction_factor <= 1)),
  effective_from              date not null,
  effective_until             date,
  source_ref                  text not null check (length(source_ref) between 1 and 500),
  provenance                  jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  unique (rule_code, effective_from),
  check (effective_until is null or effective_until >= effective_from)
);

comment on table public.regulatory_leak_check_rules is
  'Versioned leak-check frequency rules (F-Gas). Rows map a tCO₂eq range to a cadence in days + detector requirement. IMMUTABLE except effective_until. Every "next check due" calculation must persist the row id used.';

create index regulatory_leak_check_rules_active_idx
  on public.regulatory_leak_check_rules (min_tco2eq)
  where effective_until is null;
create index regulatory_leak_check_rules_history_idx
  on public.regulatory_leak_check_rules (rule_code, effective_from desc);

alter table public.regulatory_leak_check_rules enable row level security;

create policy regulatory_leak_check_rules_select on public.regulatory_leak_check_rules
  for select to authenticated using (true);

grant select on public.regulatory_leak_check_rules to authenticated;
grant select, insert, update on public.regulatory_leak_check_rules to service_role;

-- =========================================================================
-- regulatory_market_bans — versioned market/servicing bans
-- =========================================================================
create table public.regulatory_market_bans (
  id                 uuid primary key default gen_random_uuid(),
  ban_code           text not null check (length(ban_code) between 1 and 60),
  equipment_category text not null check (length(equipment_category) between 1 and 200),
  gwp_threshold      numeric(10,3) check (gwp_threshold is null or gwp_threshold > 0),
  charge_kg_threshold numeric(12,3) check (charge_kg_threshold is null or charge_kg_threshold >= 0),
  ban_scope          text not null
    check (ban_scope in ('PLACING_ON_MARKET', 'SERVICING', 'IMPORT', 'REFILL', 'MAINTENANCE')),
  effective_from     date not null,
  effective_until    date,
  source_ref         text not null check (length(source_ref) between 1 and 500),
  provenance         jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (ban_code, effective_from),
  check (effective_until is null or effective_until >= effective_from),
  check (gwp_threshold is not null or charge_kg_threshold is not null)
);

comment on table public.regulatory_market_bans is
  'Versioned F-Gas market/servicing bans. Threshold on GWP and/or charge in kg. IMMUTABLE except effective_until. Consulted before recording certain equipment or interventions to surface a documented restriction (never a legal verdict).';

create index regulatory_market_bans_active_idx
  on public.regulatory_market_bans (equipment_category, ban_scope)
  where effective_until is null;
create index regulatory_market_bans_history_idx
  on public.regulatory_market_bans (ban_code, effective_from desc);

alter table public.regulatory_market_bans enable row level security;

create policy regulatory_market_bans_select on public.regulatory_market_bans
  for select to authenticated using (true);

grant select on public.regulatory_market_bans to authenticated;
grant select, insert, update on public.regulatory_market_bans to service_role;

-- =========================================================================
-- Immutability triggers — reference rows can only mutate effective_until
-- =========================================================================
create or replace function private.enforce_regulatory_gwp_immutability()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.fluid_code       is distinct from old.fluid_code
  or new.fluid_name       is distinct from old.fluid_name
  or new.gwp_100y         is distinct from old.gwp_100y
  or new.ipcc_assessment  is distinct from old.ipcc_assessment
  or new.effective_from   is distinct from old.effective_from
  or new.source_ref       is distinct from old.source_ref then
    raise exception 'regulatory_gwp_values row % is immutable — only effective_until may change (once)', old.id
      using errcode = '22023';
  end if;
  if old.effective_until is not null and new.effective_until is distinct from old.effective_until then
    raise exception 'regulatory_gwp_values row %: effective_until already set (%)', old.id, old.effective_until
      using errcode = '22023';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger regulatory_gwp_values_immutability
  before update on public.regulatory_gwp_values
  for each row execute function private.enforce_regulatory_gwp_immutability();

create or replace function private.enforce_regulatory_leak_rule_immutability()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.rule_code                is distinct from old.rule_code
  or new.min_tco2eq               is distinct from old.min_tco2eq
  or new.max_tco2eq               is distinct from old.max_tco2eq
  or new.cadence_days             is distinct from old.cadence_days
  or new.requires_leak_detector   is distinct from old.requires_leak_detector
  or new.detector_reduction_factor is distinct from old.detector_reduction_factor
  or new.effective_from           is distinct from old.effective_from
  or new.source_ref               is distinct from old.source_ref then
    raise exception 'regulatory_leak_check_rules row % is immutable — only effective_until may change (once)', old.id
      using errcode = '22023';
  end if;
  if old.effective_until is not null and new.effective_until is distinct from old.effective_until then
    raise exception 'regulatory_leak_check_rules row %: effective_until already set (%)', old.id, old.effective_until
      using errcode = '22023';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger regulatory_leak_check_rules_immutability
  before update on public.regulatory_leak_check_rules
  for each row execute function private.enforce_regulatory_leak_rule_immutability();

create or replace function private.enforce_regulatory_market_ban_immutability()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.ban_code             is distinct from old.ban_code
  or new.equipment_category   is distinct from old.equipment_category
  or new.gwp_threshold        is distinct from old.gwp_threshold
  or new.charge_kg_threshold  is distinct from old.charge_kg_threshold
  or new.ban_scope            is distinct from old.ban_scope
  or new.effective_from       is distinct from old.effective_from
  or new.source_ref           is distinct from old.source_ref then
    raise exception 'regulatory_market_bans row % is immutable — only effective_until may change (once)', old.id
      using errcode = '22023';
  end if;
  if old.effective_until is not null and new.effective_until is distinct from old.effective_until then
    raise exception 'regulatory_market_bans row %: effective_until already set (%)', old.id, old.effective_until
      using errcode = '22023';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger regulatory_market_bans_immutability
  before update on public.regulatory_market_bans
  for each row execute function private.enforce_regulatory_market_ban_immutability();

-- =========================================================================
-- regulatory_attestations — org-scoped company/technician certificates
-- =========================================================================
-- COMPANY_CAPACITY (attestation de capacité) applies to the whole
-- organization and has no holder_user_id.
-- TECHNICIAN_APTITUDE (attestation d'aptitude) is tied to a specific
-- auth.users row via holder_user_id.
-- Attestations are NOT reference data — they are per-org records with
-- a validity window and a REVOKED terminal state.
create table public.regulatory_attestations (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  attestation_kind    text not null
    check (attestation_kind in ('COMPANY_CAPACITY', 'TECHNICIAN_APTITUDE')),
  scope               text not null
    check (scope in ('CATEGORY_I', 'CATEGORY_II', 'CATEGORY_III', 'CATEGORY_IV', 'OTHER')),
  holder_user_id      uuid,
  reference_number    text not null check (length(reference_number) between 1 and 200),
  issued_by           text not null check (length(issued_by) between 1 and 300),
  issued_at           date not null,
  valid_from          date not null,
  valid_until         date not null,
  status              text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'EXPIRED', 'REVOKED')),
  revoked_at          timestamptz,
  revoke_reason       text check (revoke_reason is null or length(revoke_reason) <= 500),
  document_id         uuid,
  provenance          jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  metadata            jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  -- documents lacks a composite unique (id, organization_id); we validate
  -- tenant match inside `record_regulatory_attestation` instead of via a
  -- composite FK. Simple FK on documents.id keeps referential integrity.
  foreign key (document_id) references public.documents(id) on delete set null,
  check (valid_until >= valid_from),
  check ((attestation_kind = 'TECHNICIAN_APTITUDE' and holder_user_id is not null)
      or (attestation_kind = 'COMPANY_CAPACITY'    and holder_user_id is null)),
  unique (organization_id, attestation_kind, holder_user_id, reference_number)
);

comment on table public.regulatory_attestations is
  'Org-scoped F-Gas attestations. COMPANY_CAPACITY (no holder) or TECHNICIAN_APTITUDE (holder = auth.users). Validity window + REVOKED terminal. Feeds the C33.2 "attestation expiring" attentions and the CERFA export.';

create index regulatory_attestations_org_status_idx on public.regulatory_attestations (organization_id, status);
create index regulatory_attestations_org_expiring_idx on public.regulatory_attestations (organization_id, valid_until)
  where status = 'ACTIVE';
create index regulatory_attestations_org_holder_idx on public.regulatory_attestations (organization_id, holder_user_id)
  where holder_user_id is not null;

alter table public.regulatory_attestations enable row level security;

create policy regulatory_attestations_select on public.regulatory_attestations
  for select to authenticated
  using (private.is_organization_member(organization_id));
create policy regulatory_attestations_insert on public.regulatory_attestations
  for insert to authenticated
  with check (private.is_organization_member(organization_id));
create policy regulatory_attestations_update on public.regulatory_attestations
  for update to authenticated
  using (private.is_organization_member(organization_id))
  with check (private.is_organization_member(organization_id));

grant select, insert, update on public.regulatory_attestations to authenticated;
grant select, insert, update on public.regulatory_attestations to service_role;

create trigger set_regulatory_attestations_updated_at
  before update on public.regulatory_attestations
  for each row execute function private.set_updated_at();

-- =========================================================================
-- supersede_gwp_value — stamp effective_until on a reference row
-- =========================================================================
create or replace function public.supersede_regulatory_gwp_value(
  target_gwp_id         uuid,
  target_effective_until date
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'supersede_regulatory_gwp_value: service_role only'
      using errcode = '42501';
  end if;
  if target_effective_until is null then
    raise exception 'supersede_regulatory_gwp_value: effective_until is required'
      using errcode = '22023';
  end if;

  update public.regulatory_gwp_values
    set effective_until = target_effective_until
  where id = target_gwp_id
    and effective_until is null;

  get diagnostics affected = row_count;
  return affected = 1;
end;
$$;

revoke all on function public.supersede_regulatory_gwp_value(uuid, date) from public, anon, authenticated;
grant execute on function public.supersede_regulatory_gwp_value(uuid, date) to service_role;

create or replace function public.supersede_regulatory_leak_check_rule(
  target_rule_id         uuid,
  target_effective_until date
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'supersede_regulatory_leak_check_rule: service_role only'
      using errcode = '42501';
  end if;
  if target_effective_until is null then
    raise exception 'supersede_regulatory_leak_check_rule: effective_until is required'
      using errcode = '22023';
  end if;

  update public.regulatory_leak_check_rules
    set effective_until = target_effective_until
  where id = target_rule_id
    and effective_until is null;

  get diagnostics affected = row_count;
  return affected = 1;
end;
$$;

revoke all on function public.supersede_regulatory_leak_check_rule(uuid, date) from public, anon, authenticated;
grant execute on function public.supersede_regulatory_leak_check_rule(uuid, date) to service_role;

create or replace function public.supersede_regulatory_market_ban(
  target_ban_id          uuid,
  target_effective_until date
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'supersede_regulatory_market_ban: service_role only'
      using errcode = '42501';
  end if;
  if target_effective_until is null then
    raise exception 'supersede_regulatory_market_ban: effective_until is required'
      using errcode = '22023';
  end if;

  update public.regulatory_market_bans
    set effective_until = target_effective_until
  where id = target_ban_id
    and effective_until is null;

  get diagnostics affected = row_count;
  return affected = 1;
end;
$$;

revoke all on function public.supersede_regulatory_market_ban(uuid, date) from public, anon, authenticated;
grant execute on function public.supersede_regulatory_market_ban(uuid, date) to service_role;

-- =========================================================================
-- record_regulatory_attestation — insert org-scoped attestation
-- =========================================================================
create or replace function public.record_regulatory_attestation(
  target_organization_id  uuid,
  target_attestation_kind text,
  target_scope            text,
  target_holder_user_id   uuid,
  target_reference_number text,
  target_issued_by        text,
  target_issued_at        date,
  target_valid_from       date,
  target_valid_until      date,
  target_document_id      uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'record_regulatory_attestation: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if target_attestation_kind not in ('COMPANY_CAPACITY', 'TECHNICIAN_APTITUDE') then
    raise exception 'record_regulatory_attestation: invalid attestation_kind %', target_attestation_kind
      using errcode = '22023';
  end if;
  if target_attestation_kind = 'TECHNICIAN_APTITUDE' and target_holder_user_id is null then
    raise exception 'record_regulatory_attestation: TECHNICIAN_APTITUDE requires holder_user_id'
      using errcode = '22023';
  end if;
  if target_attestation_kind = 'COMPANY_CAPACITY' and target_holder_user_id is not null then
    raise exception 'record_regulatory_attestation: COMPANY_CAPACITY must have holder_user_id=null'
      using errcode = '22023';
  end if;
  if target_holder_user_id is not null and not exists (
    select 1 from public.organization_members
    where organization_id = target_organization_id
      and user_id = target_holder_user_id
      and status = 'ACTIVE'
  ) then
    raise exception 'record_regulatory_attestation: holder % is not an ACTIVE member of organization %',
      target_holder_user_id, target_organization_id
      using errcode = '22023';
  end if;
  if target_valid_until < target_valid_from then
    raise exception 'record_regulatory_attestation: valid_until (%) < valid_from (%)',
      target_valid_until, target_valid_from
      using errcode = '22023';
  end if;
  if target_document_id is not null and not exists (
    select 1 from public.documents
    where id = target_document_id
      and organization_id = target_organization_id
  ) then
    raise exception 'record_regulatory_attestation: document % not found in organization %',
      target_document_id, target_organization_id
      using errcode = '22023';
  end if;

  insert into public.regulatory_attestations (
    organization_id, attestation_kind, scope, holder_user_id,
    reference_number, issued_by, issued_at, valid_from, valid_until,
    document_id
  ) values (
    target_organization_id, target_attestation_kind, target_scope, target_holder_user_id,
    target_reference_number, target_issued_by, target_issued_at, target_valid_from, target_valid_until,
    target_document_id
  ) returning id into new_id;

  perform public.record_audit_log(
    target_organization_id, 'regulatory_attestation.record',
    'regulatory_attestation', new_id,
    jsonb_build_object(
      'attestation_kind', target_attestation_kind,
      'scope', target_scope,
      'holder_user_id', target_holder_user_id,
      'reference_number', target_reference_number,
      'valid_from', target_valid_from,
      'valid_until', target_valid_until
    )
  );
  return new_id;
end;
$$;

revoke all on function public.record_regulatory_attestation(uuid, text, text, uuid, text, text, date, date, date, uuid) from public, anon;
grant execute on function public.record_regulatory_attestation(uuid, text, text, uuid, text, text, date, date, date, uuid) to authenticated, service_role;

-- =========================================================================
-- revoke_regulatory_attestation — ACTIVE → REVOKED (terminal)
-- =========================================================================
create or replace function public.revoke_regulatory_attestation(
  target_organization_id  uuid,
  target_attestation_id   uuid,
  target_reason           text
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
    raise exception 'revoke_regulatory_attestation: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if target_reason is null or length(target_reason) = 0 or length(target_reason) > 500 then
    raise exception 'revoke_regulatory_attestation: reason must be a non-empty string ≤500 chars'
      using errcode = '22023';
  end if;

  update public.regulatory_attestations
    set status        = 'REVOKED',
        revoked_at    = now(),
        revoke_reason = target_reason
  where id = target_attestation_id
    and organization_id = target_organization_id
    and status = 'ACTIVE';

  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'regulatory_attestation.revoke',
      'regulatory_attestation', target_attestation_id,
      jsonb_build_object('reason', target_reason)
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.revoke_regulatory_attestation(uuid, uuid, text) from public, anon;
grant execute on function public.revoke_regulatory_attestation(uuid, uuid, text) to authenticated, service_role;

-- =========================================================================
-- Read helpers
-- =========================================================================

-- Current GWP row for a fluid at a given date (defaults to now())
create or replace function public.current_gwp_value(
  target_fluid_code text,
  target_at         date
)
returns table (
  gwp_id           uuid,
  fluid_name       text,
  gwp_100y         numeric,
  ipcc_assessment  text,
  effective_from   date,
  effective_until  date,
  source_ref       text
)
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  at_date date;
begin
  at_date := coalesce(target_at, current_date);
  return query
  select g.id, g.fluid_name, g.gwp_100y, g.ipcc_assessment,
         g.effective_from, g.effective_until, g.source_ref
  from public.regulatory_gwp_values g
  where g.fluid_code = target_fluid_code
    and g.effective_from <= at_date
    and (g.effective_until is null or g.effective_until > at_date)
  order by g.effective_from desc
  limit 1;
end;
$$;

revoke all on function public.current_gwp_value(text, date) from public, anon;
grant execute on function public.current_gwp_value(text, date) to authenticated, service_role;

-- Current leak-check rule for a tCO₂eq value at a given date
create or replace function public.current_leak_check_rule(
  target_tco2eq numeric,
  target_at     date
)
returns table (
  rule_id                   uuid,
  rule_code                 text,
  min_tco2eq                numeric,
  max_tco2eq                numeric,
  cadence_days              integer,
  requires_leak_detector    boolean,
  detector_reduction_factor numeric,
  effective_from            date,
  effective_until           date,
  source_ref                text
)
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  at_date date;
begin
  if target_tco2eq is null or target_tco2eq < 0 then
    raise exception 'current_leak_check_rule: tco2eq must be >= 0'
      using errcode = '22023';
  end if;
  at_date := coalesce(target_at, current_date);
  return query
  select r.id, r.rule_code, r.min_tco2eq, r.max_tco2eq,
         r.cadence_days, r.requires_leak_detector, r.detector_reduction_factor,
         r.effective_from, r.effective_until, r.source_ref
  from public.regulatory_leak_check_rules r
  where r.effective_from <= at_date
    and (r.effective_until is null or r.effective_until > at_date)
    and r.min_tco2eq <= target_tco2eq
    and (r.max_tco2eq is null or r.max_tco2eq > target_tco2eq)
  order by r.min_tco2eq desc, r.effective_from desc
  limit 1;
end;
$$;

revoke all on function public.current_leak_check_rule(numeric, date) from public, anon;
grant execute on function public.current_leak_check_rule(numeric, date) to authenticated, service_role;

-- Active attestations for an org
create or replace function public.active_regulatory_attestations(
  target_organization_id uuid
)
returns table (
  attestation_id     uuid,
  attestation_kind   text,
  scope              text,
  holder_user_id     uuid,
  reference_number   text,
  issued_by          text,
  valid_from         date,
  valid_until        date,
  days_until_expiry  integer
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'active_regulatory_attestations: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;

  return query
  select
    a.id, a.attestation_kind, a.scope, a.holder_user_id,
    a.reference_number, a.issued_by, a.valid_from, a.valid_until,
    (a.valid_until - current_date)::integer as days_until_expiry
  from public.regulatory_attestations a
  where a.organization_id = target_organization_id
    and a.status = 'ACTIVE'
  order by a.valid_until asc;
end;
$$;

revoke all on function public.active_regulatory_attestations(uuid) from public, anon;
grant execute on function public.active_regulatory_attestations(uuid) to authenticated, service_role;
