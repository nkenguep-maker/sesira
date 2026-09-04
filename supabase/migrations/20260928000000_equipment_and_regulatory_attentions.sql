-- SESIRA Core Workflow — equipment + regulatory attentions (C33.2).
--
-- Adds:
--   * equipment table (org-scoped, fluid + charge + modifiers)
--   * regulatory_attentions table (immutable created_at + seen_at)
--   * tCO₂eq computation function (double threshold kg / tCO₂eq)
--   * next-leak-check computation function (with rule snapshot)
--   * deterministic idempotent emit RPCs
--   * seen-mark RPC (INV-02: seen_at immutable once set)
--
-- Also PATCHES C33.1 schema based on REGULATORY.md sec 1.2/1.3:
--   * regulatory_leak_check_rules: add kg thresholds (annexe II §1),
--     hermetic exemption thresholds, mobile equipment applicability.
--   * regulatory_attestations.scope CHECK: expand from I..IV/OTHER
--     to include A1..E per arrêté 2025-11-21.
--   * Update immutability triggers to protect the new columns.
--
-- REGULATORY.md invariants applied:
--   INV-01  never declare "conforme"; only surface next-check due /
--           attestation expiring / missing data.
--   INV-02  regulatory attentions have created_at + seen_at
--           IMMUTABLE. seen_at can be set exactly once.
--   INV-03  every calculation persists the rule/GWP row id used
--           via rule_snapshot jsonb — future revisions never
--           rewrite historical calculations.
--   INV-04  no external action from these RPCs — only surfaces.
--
-- Double threshold rule (art. 5, 2024/573):
--   An equipment is subject to a leak-check cadence rule if it
--   crosses EITHER the tCO₂eq threshold OR the kg threshold.
--   A tCO₂eq-only model MISSES the entire HFO fleet.
--
-- GWP assessment report:
--   The regulation uses AR4 for HFC (annex I) and AR6 for other
--   fluorinated gases. The tCO₂eq computation MUST respect this.
--   Callers select the appropriate ipcc_assessment when inserting
--   equipment; the compute function does NOT auto-pick.

-- =========================================================================
-- Patch C33.1 — regulatory_leak_check_rules: add kg + modifiers
-- =========================================================================
alter table public.regulatory_leak_check_rules
  add column min_kg                       numeric(12,3) check (min_kg is null or min_kg >= 0),
  add column max_kg                       numeric(12,3) check (max_kg is null or max_kg > 0),
  add column hermetic_exempt_max_tco2eq   numeric(12,3) check (hermetic_exempt_max_tco2eq is null or hermetic_exempt_max_tco2eq > 0),
  add column hermetic_exempt_max_kg       numeric(12,3) check (hermetic_exempt_max_kg is null or hermetic_exempt_max_kg > 0),
  add column hermetic_exempt_residential_max_kg numeric(12,3) check (hermetic_exempt_residential_max_kg is null or hermetic_exempt_residential_max_kg > 0),
  add column applies_to_mobile_from       date;

comment on column public.regulatory_leak_check_rules.min_kg is
  'Lower kg bound for the annex II §1 threshold. NULL = no kg constraint. Rule matches if the equipment crosses EITHER the tCO₂eq threshold OR the kg threshold (union semantics).';
comment on column public.regulatory_leak_check_rules.max_kg is
  'Upper kg bound (exclusive). NULL = unbounded.';
comment on column public.regulatory_leak_check_rules.hermetic_exempt_max_tco2eq is
  'Hermetic-sealed equipment is exempt from this rule if its tCO₂eq is BELOW this value.';
comment on column public.regulatory_leak_check_rules.hermetic_exempt_max_kg is
  'Hermetic-sealed equipment is exempt from this rule if its charge kg is BELOW this value.';
comment on column public.regulatory_leak_check_rules.hermetic_exempt_residential_max_kg is
  'Hermetic-sealed residential-building equipment gets an additional kg exemption.';
comment on column public.regulatory_leak_check_rules.applies_to_mobile_from is
  'Date from which this rule applies to mobile equipment (art. 5(3) b and c). NULL = applies to mobile from effective_from.';

-- Update the immutability trigger to protect the new columns.
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
  or new.min_kg                   is distinct from old.min_kg
  or new.max_kg                   is distinct from old.max_kg
  or new.cadence_days             is distinct from old.cadence_days
  or new.requires_leak_detector   is distinct from old.requires_leak_detector
  or new.detector_reduction_factor is distinct from old.detector_reduction_factor
  or new.hermetic_exempt_max_tco2eq         is distinct from old.hermetic_exempt_max_tco2eq
  or new.hermetic_exempt_max_kg             is distinct from old.hermetic_exempt_max_kg
  or new.hermetic_exempt_residential_max_kg is distinct from old.hermetic_exempt_residential_max_kg
  or new.applies_to_mobile_from   is distinct from old.applies_to_mobile_from
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

-- =========================================================================
-- Patch C33.1 — regulatory_attestations.scope: expand for A1..E
-- =========================================================================
alter table public.regulatory_attestations
  drop constraint regulatory_attestations_scope_check;
alter table public.regulatory_attestations
  add constraint regulatory_attestations_scope_check
  check (scope in (
    -- Legacy categories (arrêté antérieur) — valides jusqu'au 2026-12-31
    'CATEGORY_I', 'CATEGORY_II', 'CATEGORY_III', 'CATEGORY_IV',
    -- Nouveau cadre (arrêté 2025-11-21) — capacité 2025-12-07, aptitude 2025-12-11
    'A1', 'A2', 'B', 'C', 'D', 'E',
    'OTHER'
  ));

comment on column public.regulatory_attestations.scope is
  'Attestation scope. Legacy CATEGORY_I..IV valid through 2026-12-31 per arrêté 2025-11-21. New codes A1, A2, B, C, D, E effective 2025-12-07 (capacité) / 2025-12-11 (aptitude). Extends coverage to non-fluorinated fluids (CO₂, NH₃, HC).';

-- =========================================================================
-- equipment — org-scoped equipment with fluid + charge + modifiers
-- =========================================================================
create table public.equipment (
  id                        uuid primary key default gen_random_uuid(),
  organization_id           uuid not null references public.organizations(id) on delete cascade,
  customer_id               uuid,
  external_ref              text check (external_ref is null or length(external_ref) <= 200),
  label                     text not null check (length(label) between 1 and 200),
  installation_address      text check (installation_address is null or length(installation_address) <= 500),
  equipment_category        text not null check (length(equipment_category) between 1 and 100),
  fluid_code                text not null check (length(fluid_code) between 1 and 60),
  charge_kg                 numeric(12,3) not null check (charge_kg >= 0),
  is_hermetic               boolean not null default false,
  is_residential            boolean not null default false,
  is_mobile                 boolean not null default false,
  has_leak_detector         boolean not null default false,
  commissioned_at           date,
  decommissioned_at         date,
  last_leak_check_at        timestamptz,
  status                    text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'DECOMMISSIONED')),
  provenance                jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  metadata                  jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  foreign key (customer_id, organization_id) references public.customers(id, organization_id) on delete set null,
  unique (organization_id, external_ref) deferrable initially deferred,
  unique (id, organization_id),
  check (decommissioned_at is null or (commissioned_at is null or decommissioned_at >= commissioned_at))
);

comment on table public.equipment is
  'Org-scoped F-Gas equipment. Fluid code + charge kg + physical modifiers (hermetic / residential / mobile / detector). Feeds tCO₂eq computation and next-leak-check calc. NOT an accounting/inventory replacement.';

create index equipment_org_status_idx on public.equipment (organization_id, status);
create index equipment_org_customer_idx on public.equipment (organization_id, customer_id) where customer_id is not null;
create index equipment_org_fluid_idx on public.equipment (organization_id, fluid_code);
create index equipment_org_next_check_idx on public.equipment (organization_id, last_leak_check_at)
  where status = 'ACTIVE';

alter table public.equipment enable row level security;

create policy equipment_select on public.equipment
  for select to authenticated
  using (private.is_organization_member(organization_id));
create policy equipment_insert on public.equipment
  for insert to authenticated
  with check (private.is_organization_member(organization_id));
create policy equipment_update on public.equipment
  for update to authenticated
  using (private.is_organization_member(organization_id))
  with check (private.is_organization_member(organization_id));

grant select, insert, update on public.equipment to authenticated;
grant select, insert, update on public.equipment to service_role;

create trigger set_equipment_updated_at
  before update on public.equipment
  for each row execute function private.set_updated_at();

-- =========================================================================
-- regulatory_attentions — INV-02 immutable created_at + seen_at
-- =========================================================================
-- Distinct from public.attention_items because regulatory attentions
-- carry immutability guarantees the general triage table does not.
-- REGULATORY.md INV-02: created_at (default now(), never editable)
-- and seen_at (nullable, settable ONCE via mark_regulatory_attention_seen).
create table public.regulatory_attentions (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations(id) on delete cascade,
  category              text not null
    check (category in ('LEAK_CHECK_DUE', 'ATTESTATION_EXPIRING',
                        'ATTESTATION_EXPIRED', 'MARKET_BAN_TRIGGERED',
                        'MISSING_DATA', 'OTHER')),
  priority              text not null default 'NORMAL'
    check (priority in ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  entity_type           text not null
    check (entity_type in ('equipment', 'regulatory_attestation', 'organization')),
  entity_id             uuid not null,
  title                 text not null check (length(title) between 1 and 300),
  explanation           text check (explanation is null or length(explanation) <= 2000),
  suggested_action      text check (suggested_action is null or length(suggested_action) <= 1000),
  rule_snapshot         jsonb not null default '{}'::jsonb check (jsonb_typeof(rule_snapshot) = 'object'),
  idempotency_key       text not null check (length(idempotency_key) between 1 and 300),
  assigned_user_id      uuid,
  seen_at               timestamptz,
  seen_by_user_id       uuid,
  resolved_at           timestamptz,
  resolved_by_user_id   uuid,
  resolution_note       text check (resolution_note is null or length(resolution_note) <= 1000),
  metadata              jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at            timestamptz not null default now(),
  unique (organization_id, idempotency_key)
);

comment on table public.regulatory_attentions is
  'Regulatory attentions distinct from generic attention_items. INV-02: created_at and seen_at are IMMUTABLE. seen_at can be set exactly ONCE via mark_regulatory_attention_seen. rule_snapshot persists the reference rule row id / value used, so revisions never rewrite history (INV-03).';

comment on column public.regulatory_attentions.rule_snapshot is
  'Snapshot of the regulatory reference row(s) used to compute this attention. Includes leak_check_rule_id, gwp_value_id, thresholds, source_ref, at_date. Immutable via the immutability trigger.';

comment on column public.regulatory_attentions.seen_at is
  'First time a human opened this attention. Set ONCE via mark_regulatory_attention_seen — subsequent attempts raise. Used as evidence for "logiciel ne m''a pas prévenu" defense.';

create index regulatory_attentions_org_seen_idx on public.regulatory_attentions (organization_id, seen_at nulls first);
create index regulatory_attentions_org_open_idx on public.regulatory_attentions (organization_id, priority, created_at desc)
  where resolved_at is null;
create index regulatory_attentions_org_entity_idx on public.regulatory_attentions (organization_id, entity_type, entity_id);

alter table public.regulatory_attentions enable row level security;

create policy regulatory_attentions_select on public.regulatory_attentions
  for select to authenticated
  using (private.is_organization_member(organization_id));
create policy regulatory_attentions_insert on public.regulatory_attentions
  for insert to authenticated
  with check (private.is_organization_member(organization_id));
create policy regulatory_attentions_update on public.regulatory_attentions
  for update to authenticated
  using (private.is_organization_member(organization_id))
  with check (private.is_organization_member(organization_id));

grant select, insert, update on public.regulatory_attentions to authenticated;
grant select, insert, update on public.regulatory_attentions to service_role;

-- =========================================================================
-- Immutability trigger — created_at NEVER changes, seen_at set ONCE
-- =========================================================================
create or replace function private.enforce_regulatory_attention_immutability()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.created_at is distinct from old.created_at then
    raise exception 'regulatory_attention % created_at is immutable', old.id
      using errcode = '22023';
  end if;
  if new.category is distinct from old.category
  or new.entity_type is distinct from old.entity_type
  or new.entity_id is distinct from old.entity_id
  or new.title is distinct from old.title
  or new.idempotency_key is distinct from old.idempotency_key then
    raise exception 'regulatory_attention % core columns are immutable', old.id
      using errcode = '22023';
  end if;
  if new.rule_snapshot::text is distinct from old.rule_snapshot::text then
    raise exception 'regulatory_attention % rule_snapshot is immutable', old.id
      using errcode = '22023';
  end if;
  if old.seen_at is not null and new.seen_at is distinct from old.seen_at then
    raise exception 'regulatory_attention % seen_at already set (%) — cannot be modified', old.id, old.seen_at
      using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger regulatory_attentions_immutability
  before update on public.regulatory_attentions
  for each row execute function private.enforce_regulatory_attention_immutability();

-- =========================================================================
-- compute_equipment_tco2eq — tCO₂eq for an equipment at a given date
-- =========================================================================
-- Returns computed value + snapshot of the GWP row used. Caller MUST
-- persist the snapshot alongside any decision that depends on the
-- returned value.
create or replace function public.compute_equipment_tco2eq(
  target_organization_id uuid,
  target_equipment_id    uuid,
  target_at              date
)
returns table (
  tco2eq            numeric,
  fluid_code        text,
  charge_kg         numeric,
  gwp_value_id      uuid,
  gwp_100y          numeric,
  ipcc_assessment   text,
  gwp_source_ref    text,
  at_date           date
)
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  eq_row  public.equipment%rowtype;
  gwp_row public.regulatory_gwp_values%rowtype;
  eval_at date;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'compute_equipment_tco2eq: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;

  eval_at := coalesce(target_at, current_date);

  select * into eq_row
  from public.equipment
  where id = target_equipment_id
    and organization_id = target_organization_id;

  if eq_row.id is null then
    raise exception 'compute_equipment_tco2eq: equipment % not found in organization %',
      target_equipment_id, target_organization_id
      using errcode = '22023';
  end if;

  select * into gwp_row
  from public.regulatory_gwp_values g
  where g.fluid_code = eq_row.fluid_code
    and g.effective_from <= eval_at
    and (g.effective_until is null or g.effective_until > eval_at)
  order by g.effective_from desc
  limit 1;

  if gwp_row.id is null then
    raise exception 'compute_equipment_tco2eq: no GWP row for fluid % at %', eq_row.fluid_code, eval_at
      using errcode = '22023';
  end if;

  tco2eq          := round(eq_row.charge_kg * gwp_row.gwp_100y / 1000, 3);
  fluid_code      := eq_row.fluid_code;
  charge_kg       := eq_row.charge_kg;
  gwp_value_id    := gwp_row.id;
  gwp_100y        := gwp_row.gwp_100y;
  ipcc_assessment := gwp_row.ipcc_assessment;
  gwp_source_ref  := gwp_row.source_ref;
  at_date         := eval_at;
  return next;
end;
$$;

revoke all on function public.compute_equipment_tco2eq(uuid, uuid, date) from public, anon;
grant execute on function public.compute_equipment_tco2eq(uuid, uuid, date) to authenticated, service_role;

comment on function public.compute_equipment_tco2eq(uuid, uuid, date) is
  'Returns tCO₂eq for an equipment at a given date + snapshot of the GWP row used (INV-03). Caller MUST persist the snapshot when the value drives a decision. GWP AR selection is per the versioned reference row — F-Gas III requires AR4 for HFC and AR6 for others, encoded in the reference data itself.';

-- =========================================================================
-- compute_next_leak_check_due — apply the double-threshold rule
-- =========================================================================
-- Matches the equipment against active leak_check_rules using UNION
-- semantics: a rule matches if (min_tco2eq..max_tco2eq covers the
-- equipment's tCO₂eq) OR (min_kg..max_kg covers its charge). Picks the
-- STRICTEST cadence when multiple rules match. Applies hermetic +
-- detector modifiers per the matched row.
create or replace function public.compute_next_leak_check_due(
  target_organization_id uuid,
  target_equipment_id    uuid,
  target_at              date
)
returns table (
  next_due_at             timestamptz,
  cadence_days            integer,
  matched_rule_id         uuid,
  matched_rule_code       text,
  rule_source_ref         text,
  hermetic_exempt         boolean,
  mobile_not_yet_applies  boolean,
  detector_doubled        boolean,
  tco2eq_snapshot         numeric,
  gwp_value_id_snapshot   uuid,
  at_date                 date
)
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  eq_row public.equipment%rowtype;
  rule_row public.regulatory_leak_check_rules%rowtype;
  tco2eq_val numeric;
  gwp_id uuid;
  applied_cadence integer;
  eval_at date;
  base_from timestamptz;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'compute_next_leak_check_due: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;

  eval_at := coalesce(target_at, current_date);

  select * into eq_row
  from public.equipment
  where id = target_equipment_id
    and organization_id = target_organization_id;

  if eq_row.id is null then
    raise exception 'compute_next_leak_check_due: equipment % not found in organization %',
      target_equipment_id, target_organization_id
      using errcode = '22023';
  end if;

  if eq_row.status = 'DECOMMISSIONED' then
    return; -- no rows: decommissioned equipment has no next check
  end if;

  -- Compute tCO₂eq first (may be 0 if the fluid is non-fluorinated)
  select t.tco2eq, t.gwp_value_id into tco2eq_val, gwp_id
  from public.compute_equipment_tco2eq(target_organization_id, target_equipment_id, eval_at) t;

  -- Match: (tCO₂eq bracket) OR (kg bracket), whichever mandates the strictest cadence
  select * into rule_row
  from public.regulatory_leak_check_rules r
  where r.effective_from <= eval_at
    and (r.effective_until is null or r.effective_until > eval_at)
    and (
      (r.min_tco2eq <= tco2eq_val and (r.max_tco2eq is null or r.max_tco2eq > tco2eq_val))
      or
      (r.min_kg is not null and r.min_kg <= eq_row.charge_kg and (r.max_kg is null or r.max_kg > eq_row.charge_kg))
    )
  order by r.cadence_days asc, r.min_tco2eq desc
  limit 1;

  if rule_row.id is null then
    return; -- no matching rule at this date (equipment below all thresholds)
  end if;

  -- Hermetic exemption
  hermetic_exempt := false;
  if eq_row.is_hermetic then
    if rule_row.hermetic_exempt_max_tco2eq is not null and tco2eq_val < rule_row.hermetic_exempt_max_tco2eq then
      hermetic_exempt := true;
    end if;
    if rule_row.hermetic_exempt_max_kg is not null and eq_row.charge_kg < rule_row.hermetic_exempt_max_kg then
      hermetic_exempt := true;
    end if;
    if eq_row.is_residential and rule_row.hermetic_exempt_residential_max_kg is not null
       and eq_row.charge_kg < rule_row.hermetic_exempt_residential_max_kg then
      hermetic_exempt := true;
    end if;
  end if;

  -- Mobile equipment not yet in scope
  mobile_not_yet_applies := false;
  if eq_row.is_mobile and rule_row.applies_to_mobile_from is not null
     and rule_row.applies_to_mobile_from > eval_at then
    mobile_not_yet_applies := true;
  end if;

  if hermetic_exempt or mobile_not_yet_applies then
    return; -- no due date: rule does not apply to this equipment yet
  end if;

  -- Detector doubles the cadence when the rule allows it
  applied_cadence := rule_row.cadence_days;
  detector_doubled := false;
  if eq_row.has_leak_detector and coalesce(rule_row.detector_reduction_factor, 1) < 1 then
    -- detector_reduction_factor represents the cadence FRACTION when detector is present
    -- (0.5 means the base cadence is halved WITHOUT detector, i.e. the base row already
    -- assumes detector; without detector the cadence is base / factor). To keep semantics
    -- explicit, we treat detector_reduction_factor as the FACTOR to divide by when the
    -- detector IS present, effectively multiplying cadence by 1/factor.
    applied_cadence := (rule_row.cadence_days / rule_row.detector_reduction_factor)::integer;
    detector_doubled := true;
  end if;

  base_from := coalesce(eq_row.last_leak_check_at, coalesce(eq_row.commissioned_at::timestamptz, now()));
  next_due_at            := base_from + make_interval(days => applied_cadence);
  cadence_days           := applied_cadence;
  matched_rule_id        := rule_row.id;
  matched_rule_code      := rule_row.rule_code;
  rule_source_ref        := rule_row.source_ref;
  tco2eq_snapshot        := tco2eq_val;
  gwp_value_id_snapshot  := gwp_id;
  at_date                := eval_at;
  return next;
end;
$$;

revoke all on function public.compute_next_leak_check_due(uuid, uuid, date) from public, anon;
grant execute on function public.compute_next_leak_check_due(uuid, uuid, date) to authenticated, service_role;

comment on function public.compute_next_leak_check_due(uuid, uuid, date) is
  'Returns next leak-check due date for an equipment + snapshot of the matched rule. Applies UNION semantics on tCO₂eq/kg thresholds (double threshold rule, art. 5). Applies hermetic and mobile modifiers from the matched rule. Returns NO rows when the equipment is decommissioned, below all thresholds, hermetic-exempt, or mobile-not-yet-applicable — caller decides how to render the absence.';

-- =========================================================================
-- emit_regulatory_leak_check_attention — idempotent surface
-- =========================================================================
-- Deterministic: same equipment + same due date = same idempotency key
-- = no duplicate row. Uses ON CONFLICT (organization_id, idempotency_key)
-- DO NOTHING.
create or replace function public.emit_regulatory_leak_check_attention(
  target_organization_id uuid,
  target_equipment_id    uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  compute_row record;
  eq_row      public.equipment%rowtype;
  new_id      uuid;
  existing_id uuid;
  idem_key    text;
  is_overdue  boolean;
  the_priority text;
  days_late   integer;
begin
  if not (
    private.is_organization_member(target_organization_id)
    or (select auth.role()) = 'service_role'
  ) then
    raise exception 'emit_regulatory_leak_check_attention: caller is not authorized for organization %', target_organization_id
      using errcode = '42501';
  end if;

  select * into eq_row
  from public.equipment
  where id = target_equipment_id
    and organization_id = target_organization_id;

  if eq_row.id is null or eq_row.status = 'DECOMMISSIONED' then
    return null;
  end if;

  select * into compute_row
  from public.compute_next_leak_check_due(target_organization_id, target_equipment_id, null::date);

  if compute_row.next_due_at is null then
    return null; -- no obligation at this date
  end if;

  is_overdue := compute_row.next_due_at < now();
  days_late  := case when is_overdue then extract(day from now() - compute_row.next_due_at)::integer else 0 end;
  the_priority := case
    when not is_overdue and compute_row.next_due_at - now() > make_interval(days => 30) then 'LOW'
    when not is_overdue then 'NORMAL'
    when days_late < 30 then 'HIGH'
    else 'URGENT'
  end;

  idem_key := 'reg:leak_check:' || target_equipment_id::text
              || ':' || to_char(compute_row.next_due_at at time zone 'utc', 'YYYYMMDDHH24MISS');

  insert into public.regulatory_attentions (
    organization_id, category, priority, entity_type, entity_id,
    title, explanation, suggested_action, rule_snapshot, idempotency_key
  ) values (
    target_organization_id, 'LEAK_CHECK_DUE', the_priority, 'equipment', target_equipment_id,
    case when is_overdue
      then format('Contrôle d''étanchéité en retard (%s j)', days_late)
      else format('Contrôle d''étanchéité — échéance %s', to_char(compute_row.next_due_at, 'DD/MM/YYYY'))
    end,
    format('Équipement %s (%s kg de %s = %s tCO₂eq). Cadence %s j (règle %s).',
      coalesce(eq_row.external_ref, target_equipment_id::text),
      eq_row.charge_kg, eq_row.fluid_code, compute_row.tco2eq_snapshot,
      compute_row.cadence_days, compute_row.matched_rule_code
    ),
    'Planifier le contrôle d''étanchéité (technicien attesté). SESIRA prépare la fiche CERFA — le dépôt reste à la charge du client.',
    jsonb_build_object(
      'matched_rule_id',       compute_row.matched_rule_id,
      'matched_rule_code',     compute_row.matched_rule_code,
      'rule_source_ref',       compute_row.rule_source_ref,
      'cadence_days',          compute_row.cadence_days,
      'gwp_value_id',          compute_row.gwp_value_id_snapshot,
      'tco2eq',                compute_row.tco2eq_snapshot,
      'detector_doubled',      compute_row.detector_doubled,
      'computed_at',           to_char(compute_row.at_date, 'YYYY-MM-DD'),
      'next_due_at',           to_char(compute_row.next_due_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    ),
    idem_key
  )
  on conflict (organization_id, idempotency_key) do nothing
  returning id into new_id;

  if new_id is null then
    select id into existing_id
    from public.regulatory_attentions
    where organization_id = target_organization_id
      and idempotency_key = idem_key;
    return existing_id;
  end if;

  perform public.record_audit_log(
    target_organization_id, 'regulatory_attention.emit_leak_check',
    'regulatory_attention', new_id,
    jsonb_build_object(
      'equipment_id', target_equipment_id,
      'priority', the_priority,
      'is_overdue', is_overdue
    )
  );
  return new_id;
end;
$$;

revoke all on function public.emit_regulatory_leak_check_attention(uuid, uuid) from public, anon;
grant execute on function public.emit_regulatory_leak_check_attention(uuid, uuid) to authenticated, service_role;

-- =========================================================================
-- emit_regulatory_attestation_expiry_attention — idempotent
-- =========================================================================
create or replace function public.emit_regulatory_attestation_expiry_attention(
  target_organization_id uuid,
  target_attestation_id  uuid,
  target_days_before     integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  a_row     public.regulatory_attestations%rowtype;
  new_id    uuid;
  existing_id uuid;
  idem_key  text;
  days_left integer;
  the_priority text;
  the_category text;
begin
  if not (
    private.is_organization_member(target_organization_id)
    or (select auth.role()) = 'service_role'
  ) then
    raise exception 'emit_regulatory_attestation_expiry_attention: caller is not authorized for organization %', target_organization_id
      using errcode = '42501';
  end if;
  if target_days_before is null or target_days_before < 0 or target_days_before > 365 then
    raise exception 'emit_regulatory_attestation_expiry_attention: days_before must be in [0, 365] (got %)', target_days_before
      using errcode = '22023';
  end if;

  select * into a_row
  from public.regulatory_attestations
  where id = target_attestation_id
    and organization_id = target_organization_id;

  if a_row.id is null or a_row.status <> 'ACTIVE' then
    return null;
  end if;

  days_left := (a_row.valid_until - current_date)::integer;
  if days_left > target_days_before then
    return null; -- not yet within warning window
  end if;

  the_category := case when days_left < 0 then 'ATTESTATION_EXPIRED' else 'ATTESTATION_EXPIRING' end;
  the_priority := case
    when days_left < 0 then 'HIGH'
    when days_left <= 30 then 'HIGH'
    when days_left <= 90 then 'NORMAL'
    else 'LOW'
  end;

  idem_key := 'reg:attestation_expiry:' || target_attestation_id::text
              || ':' || to_char(a_row.valid_until, 'YYYYMMDD');

  insert into public.regulatory_attentions (
    organization_id, category, priority, entity_type, entity_id,
    title, explanation, suggested_action, rule_snapshot, idempotency_key
  ) values (
    target_organization_id, the_category, the_priority, 'regulatory_attestation', target_attestation_id,
    case when days_left < 0
      then format('Attestation expirée (il y a %s j)', -days_left)
      else format('Attestation expire dans %s j', days_left)
    end,
    format('Attestation %s / catégorie %s délivrée par %s, valide jusqu''au %s.',
      a_row.attestation_kind, a_row.scope, a_row.issued_by, a_row.valid_until),
    'Planifier le renouvellement (recyclage / examen selon le nouveau cadre) avant la date limite. SESIRA n''enregistre pas la démarche auprès de l''organisme.',
    jsonb_build_object(
      'attestation_kind', a_row.attestation_kind,
      'scope',            a_row.scope,
      'reference_number', a_row.reference_number,
      'issued_by',        a_row.issued_by,
      'valid_from',       a_row.valid_from,
      'valid_until',      a_row.valid_until,
      'days_left',        days_left,
      'days_before_trigger', target_days_before
    ),
    idem_key
  )
  on conflict (organization_id, idempotency_key) do nothing
  returning id into new_id;

  if new_id is null then
    select id into existing_id
    from public.regulatory_attentions
    where organization_id = target_organization_id
      and idempotency_key = idem_key;
    return existing_id;
  end if;

  perform public.record_audit_log(
    target_organization_id, 'regulatory_attention.emit_attestation_expiry',
    'regulatory_attention', new_id,
    jsonb_build_object(
      'attestation_id', target_attestation_id,
      'category', the_category,
      'days_left', days_left
    )
  );
  return new_id;
end;
$$;

revoke all on function public.emit_regulatory_attestation_expiry_attention(uuid, uuid, integer) from public, anon;
grant execute on function public.emit_regulatory_attestation_expiry_attention(uuid, uuid, integer) to authenticated, service_role;

-- =========================================================================
-- mark_regulatory_attention_seen — set seen_at exactly once (INV-02)
-- =========================================================================
create or replace function public.mark_regulatory_attention_seen(
  target_organization_id uuid,
  target_attention_id    uuid,
  target_seen_by_user_id uuid
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
    raise exception 'mark_regulatory_attention_seen: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.organization_members
    where organization_id = target_organization_id
      and user_id = target_seen_by_user_id
      and status = 'ACTIVE'
  ) then
    raise exception 'mark_regulatory_attention_seen: seen_by % is not an ACTIVE member of organization %',
      target_seen_by_user_id, target_organization_id
      using errcode = '42501';
  end if;

  update public.regulatory_attentions
    set seen_at         = now(),
        seen_by_user_id = target_seen_by_user_id
  where id = target_attention_id
    and organization_id = target_organization_id
    and seen_at is null;

  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'regulatory_attention.seen',
      'regulatory_attention', target_attention_id,
      jsonb_build_object('seen_by_user_id', target_seen_by_user_id)
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.mark_regulatory_attention_seen(uuid, uuid, uuid) from public, anon;
grant execute on function public.mark_regulatory_attention_seen(uuid, uuid, uuid) to authenticated, service_role;

comment on function public.mark_regulatory_attention_seen(uuid, uuid, uuid) is
  'Sets seen_at exactly once (INV-02). Immutability trigger rejects any further modification. Provides evidence for the "logiciel ne m''a pas prévenu" defense.';

-- =========================================================================
-- resolve_regulatory_attention — soft close with note (does not change seen_at)
-- =========================================================================
create or replace function public.resolve_regulatory_attention(
  target_organization_id uuid,
  target_attention_id    uuid,
  target_resolved_by_user_id uuid,
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
    raise exception 'resolve_regulatory_attention: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.organization_members
    where organization_id = target_organization_id
      and user_id = target_resolved_by_user_id
      and status = 'ACTIVE'
  ) then
    raise exception 'resolve_regulatory_attention: resolver % is not an ACTIVE member of organization %',
      target_resolved_by_user_id, target_organization_id
      using errcode = '42501';
  end if;

  update public.regulatory_attentions
    set resolved_at         = now(),
        resolved_by_user_id = target_resolved_by_user_id,
        resolution_note     = target_note
  where id = target_attention_id
    and organization_id = target_organization_id
    and resolved_at is null;

  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'regulatory_attention.resolve',
      'regulatory_attention', target_attention_id,
      jsonb_build_object('resolved_by_user_id', target_resolved_by_user_id)
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.resolve_regulatory_attention(uuid, uuid, uuid, text) from public, anon;
grant execute on function public.resolve_regulatory_attention(uuid, uuid, uuid, text) to authenticated, service_role;

-- =========================================================================
-- Read helpers
-- =========================================================================
create or replace function public.open_regulatory_attentions(
  target_organization_id uuid
)
returns table (
  attention_id       uuid,
  category           text,
  priority           text,
  entity_type        text,
  entity_id          uuid,
  title              text,
  explanation        text,
  suggested_action   text,
  rule_snapshot      jsonb,
  seen_at            timestamptz,
  seen_by_user_id    uuid,
  created_at         timestamptz
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'open_regulatory_attentions: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;

  return query
  select
    a.id, a.category, a.priority, a.entity_type, a.entity_id,
    a.title, a.explanation, a.suggested_action, a.rule_snapshot,
    a.seen_at, a.seen_by_user_id, a.created_at
  from public.regulatory_attentions a
  where a.organization_id = target_organization_id
    and a.resolved_at is null
  order by
    case a.priority
      when 'URGENT' then 1
      when 'HIGH' then 2
      when 'NORMAL' then 3
      when 'LOW' then 4
    end,
    a.created_at asc;
end;
$$;

revoke all on function public.open_regulatory_attentions(uuid) from public, anon;
grant execute on function public.open_regulatory_attentions(uuid) to authenticated, service_role;

create or replace function public.equipment_leak_check_pipeline(
  target_organization_id uuid
)
returns table (
  equipment_id       uuid,
  label              text,
  external_ref       text,
  fluid_code         text,
  charge_kg          numeric,
  tco2eq             numeric,
  last_leak_check_at timestamptz,
  next_due_at        timestamptz,
  matched_rule_code  text
)
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  eq record;
  due record;
  tco record;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'equipment_leak_check_pipeline: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;

  for eq in
    select id, label, external_ref, fluid_code, charge_kg, last_leak_check_at
    from public.equipment
    where organization_id = target_organization_id
      and status = 'ACTIVE'
  loop
    select t.tco2eq into tco
    from public.compute_equipment_tco2eq(target_organization_id, eq.id, null::date) t;

    select d.next_due_at, d.matched_rule_code into due
    from public.compute_next_leak_check_due(target_organization_id, eq.id, null::date) d;

    equipment_id       := eq.id;
    label              := eq.label;
    external_ref       := eq.external_ref;
    fluid_code         := eq.fluid_code;
    charge_kg          := eq.charge_kg;
    tco2eq             := coalesce(tco.tco2eq, 0);
    last_leak_check_at := eq.last_leak_check_at;
    next_due_at        := due.next_due_at;
    matched_rule_code  := due.matched_rule_code;
    return next;
  end loop;
end;
$$;

revoke all on function public.equipment_leak_check_pipeline(uuid) from public, anon;
grant execute on function public.equipment_leak_check_pipeline(uuid) to authenticated, service_role;

comment on function public.equipment_leak_check_pipeline(uuid) is
  'Per-equipment view of tCO₂eq + next-check-due. next_due_at is NULL when equipment is out of scope (below thresholds, hermetic-exempt, mobile-not-yet). UI renders the NULL as "hors périmètre" — never as "conforme".';
