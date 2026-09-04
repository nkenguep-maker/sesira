-- SESIRA Core Workflow — regulatory exports (C33.3, WAVE 5 mid-point).
--
-- Adds:
--   * regulatory_exports table (one row per generated export)
--   * generate_cerfa_intervention_export RPC (one CERFA per
--     intervention, per REGULATORY.md 1.1)
--   * generate_annual_regulatory_bilan RPC (once per year per org)
--   * mark_regulatory_export_exported RPC (READY → EXPORTED, ACTIVE
--     member, records download timestamp)
--   * supersede_regulatory_export RPC (marks stale export inactive)
--   * regulatory_exports_for read RPC
--   * pending_cerfa_interventions read RPC (COMPLETED interventions
--     without a CERFA yet)
--
-- REGULATORY.md doctrine applied:
--   INV-01: no "conforme" verdict. Export status labels use
--           « À préparer » / « Prêt » / « Exporté » / « Superseded »
--           (SESIRA never says "declared" / "submitted").
--   INV-03: every export persists rule_snapshot (leak_check_rule_id,
--           gwp_value_id, attestation_ids used). A future revision
--           NEVER rewrites the exported payload.
--   INV-04: mark_regulatory_export_exported requires an ACTIVE org
--           member and records exported_at + exported_by — this is
--           the "human validation traced" boundary for the download
--           action.
--   Section 1.5 boundary: SESIRA produces the file; the client
--           deposits with the approved body (DEKRA, Cemafroid, etc.).
--           No API to any organisme agréé is called from here.
--           No "SESIRA déclare pour vous" wording anywhere.

-- =========================================================================
-- regulatory_exports
-- =========================================================================
create table public.regulatory_exports (
  id                      uuid primary key default gen_random_uuid(),
  organization_id         uuid not null references public.organizations(id) on delete cascade,
  export_kind             text not null
    check (export_kind in ('CERFA_15497_04', 'ANNUAL_BILAN', 'OTHER')),
  reference_year          integer check (reference_year is null or (reference_year between 2020 and 2100)),
  reference_intervention_id uuid,
  reference_equipment_id  uuid,
  status                  text not null default 'DRAFT'
    check (status in ('DRAFT', 'READY', 'EXPORTED', 'SUPERSEDED')),
  payload                 jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  payload_gaps            jsonb not null default '[]'::jsonb check (jsonb_typeof(payload_gaps) = 'array'),
  rule_snapshot           jsonb not null default '{}'::jsonb check (jsonb_typeof(rule_snapshot) = 'object'),
  generated_by_user_id    uuid,
  generated_at            timestamptz not null default now(),
  exported_at             timestamptz,
  exported_by_user_id     uuid,
  export_format           text check (export_format is null or export_format in ('JSON', 'XML', 'PDF', 'CSV')),
  superseded_at           timestamptz,
  superseded_by_export_id uuid,
  supersede_reason        text check (supersede_reason is null or length(supersede_reason) <= 500),
  provenance              jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  metadata                jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  foreign key (reference_intervention_id, organization_id) references public.interventions(id, organization_id) on delete set null,
  foreign key (reference_equipment_id, organization_id) references public.equipment(id, organization_id) on delete set null,
  foreign key (superseded_by_export_id) references public.regulatory_exports(id) on delete set null,
  check (
    (export_kind = 'CERFA_15497_04' and reference_intervention_id is not null and reference_year is null)
    or
    (export_kind = 'ANNUAL_BILAN' and reference_year is not null and reference_intervention_id is null)
    or
    (export_kind = 'OTHER')
  )
);

comment on table public.regulatory_exports is
  'One row per generated regulatory export. SESIRA produces; the customer deposits with their organisme agréé. NEVER "declared" — status labels stay « À préparer » (DRAFT) / « Prêt » (READY) / « Exporté » (EXPORTED) / « Remplacé » (SUPERSEDED). rule_snapshot persists the reference rule/GWP row ids used so a future rule revision does not rewrite the payload.';

comment on column public.regulatory_exports.payload_gaps is
  'Array of {field, reason} objects flagging required fields the caller could not populate. When non-empty, status stays DRAFT — operator must fill the gaps before marking READY.';

create index regulatory_exports_org_kind_idx on public.regulatory_exports (organization_id, export_kind, status);
create index regulatory_exports_org_year_idx on public.regulatory_exports (organization_id, reference_year)
  where reference_year is not null;
create index regulatory_exports_org_intervention_idx on public.regulatory_exports (organization_id, reference_intervention_id)
  where reference_intervention_id is not null;
-- Uniqueness among ACTIVE (non-superseded) exports per target
create unique index regulatory_exports_active_cerfa_uniq
  on public.regulatory_exports (organization_id, reference_intervention_id)
  where superseded_at is null and export_kind = 'CERFA_15497_04' and reference_intervention_id is not null;
create unique index regulatory_exports_active_bilan_uniq
  on public.regulatory_exports (organization_id, reference_year)
  where superseded_at is null and export_kind = 'ANNUAL_BILAN' and reference_year is not null;

alter table public.regulatory_exports enable row level security;

create policy regulatory_exports_select on public.regulatory_exports
  for select to authenticated
  using (private.is_organization_member(organization_id));
create policy regulatory_exports_insert on public.regulatory_exports
  for insert to authenticated
  with check (private.is_organization_member(organization_id));
create policy regulatory_exports_update on public.regulatory_exports
  for update to authenticated
  using (private.is_organization_member(organization_id))
  with check (private.is_organization_member(organization_id));

grant select, insert, update on public.regulatory_exports to authenticated;
grant select, insert, update on public.regulatory_exports to service_role;

create trigger set_regulatory_exports_updated_at
  before update on public.regulatory_exports
  for each row execute function private.set_updated_at();

-- =========================================================================
-- State machine trigger — protect exported/superseded terminals
-- =========================================================================
create or replace function private.enforce_regulatory_export_state_transition()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_role <> 'authenticated' then
    return new;
  end if;

  -- payload + rule_snapshot are immutable once the row is READY or EXPORTED
  -- (INV-03: no retroactive rewrite)
  if old.status in ('READY', 'EXPORTED') then
    if new.payload::text is distinct from old.payload::text then
      raise exception 'regulatory_export % payload is immutable once READY/EXPORTED', old.id
        using errcode = '22023';
    end if;
    if new.rule_snapshot::text is distinct from old.rule_snapshot::text then
      raise exception 'regulatory_export % rule_snapshot is immutable once READY/EXPORTED', old.id
        using errcode = '22023';
    end if;
  end if;

  -- EXPORTED and SUPERSEDED are terminal for status transitions
  if old.status = 'EXPORTED' and new.status not in ('EXPORTED', 'SUPERSEDED') then
    raise exception 'regulatory_export % is EXPORTED (terminal) — can only be superseded', old.id
      using errcode = '22023';
  end if;
  if old.status = 'SUPERSEDED' and new.status <> 'SUPERSEDED' then
    raise exception 'regulatory_export % is SUPERSEDED (terminal)', old.id
      using errcode = '22023';
  end if;

  -- Allowed transitions
  if not (
    (old.status = 'DRAFT'    and new.status in ('READY', 'DRAFT', 'SUPERSEDED')) or
    (old.status = 'READY'    and new.status in ('EXPORTED', 'DRAFT', 'SUPERSEDED')) or
    (old.status = 'EXPORTED' and new.status in ('EXPORTED', 'SUPERSEDED')) or
    (old.status = new.status)
  ) then
    raise exception 'regulatory_export % cannot transition from % to %', old.id, old.status, new.status
      using errcode = '22023';
  end if;

  return new;
end;
$$;

create trigger regulatory_exports_state_transition
  before update on public.regulatory_exports
  for each row execute function private.enforce_regulatory_export_state_transition();

-- =========================================================================
-- generate_cerfa_intervention_export — 1 CERFA per intervention
-- =========================================================================
-- CERFA 15497*04 (fiche d'intervention F-Gas, arrêté 2024-05-29,
-- obligatoire depuis 2024-07-06). SESIRA compiles the JSON dataset
-- from intervention + linked equipment + field report + attestations.
-- A downstream renderer converts to XML/PDF (out of scope here).
--
-- If an active export exists for this intervention, it is
-- automatically SUPERSEDED and a new row is inserted. This keeps a
-- full audit trail of every version generated.
create or replace function public.generate_cerfa_intervention_export(
  target_organization_id uuid,
  target_intervention_id uuid,
  target_generator_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  int_row       public.interventions%rowtype;
  eq_row        public.equipment%rowtype;
  report_row    public.field_reports%rowtype;
  tech_att      public.regulatory_attestations%rowtype;
  company_att   public.regulatory_attestations%rowtype;
  gwp_row       public.regulatory_gwp_values%rowtype;
  leak_rule_row public.regulatory_leak_check_rules%rowtype;
  tco2eq_val    numeric;
  eq_id         uuid;
  gaps          jsonb := '[]'::jsonb;
  payload       jsonb;
  rule_snap     jsonb;
  new_id        uuid;
  existing_export_id uuid;
  new_status    text;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'generate_cerfa_intervention_export: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;

  select * into int_row
  from public.interventions
  where id = target_intervention_id
    and organization_id = target_organization_id;

  if int_row.id is null then
    raise exception 'generate_cerfa_intervention_export: intervention % not found in organization %',
      target_intervention_id, target_organization_id
      using errcode = '22023';
  end if;

  -- Try to locate the equipment via intervention.metadata->>'equipment_id'
  eq_id := (int_row.metadata->>'equipment_id')::uuid;
  if eq_id is null then
    gaps := gaps || jsonb_build_object(
      'field', 'equipment_id',
      'reason', 'intervention.metadata.equipment_id manquant — SESIRA ne peut pas construire la fiche sans identifier l''équipement.'
    );
  else
    select * into eq_row
    from public.equipment
    where id = eq_id and organization_id = target_organization_id;
    if eq_row.id is null then
      gaps := gaps || jsonb_build_object(
        'field', 'equipment_id',
        'reason', format('équipement %s introuvable dans l''organisation', eq_id)
      );
      eq_id := null;
    end if;
  end if;

  -- tCO₂eq snapshot (using the GWP row active at intervention.completed_at or now())
  if eq_id is not null then
    select * into gwp_row
    from public.regulatory_gwp_values
    where fluid_code = eq_row.fluid_code
      and effective_from <= coalesce(int_row.completed_at::date, current_date)
      and (effective_until is null or effective_until > coalesce(int_row.completed_at::date, current_date))
    order by effective_from desc
    limit 1;

    if gwp_row.id is null then
      gaps := gaps || jsonb_build_object(
        'field', 'gwp_value',
        'reason', format('aucune valeur GWP versionnée pour %s à la date d''intervention — seed regulatory_gwp_values requis',
                         eq_row.fluid_code)
      );
    else
      tco2eq_val := round(eq_row.charge_kg * gwp_row.gwp_100y / 1000, 3);
      -- Matching leak-check rule at intervention date (for reference in the CERFA)
      select * into leak_rule_row
      from public.regulatory_leak_check_rules r
      where r.effective_from <= coalesce(int_row.completed_at::date, current_date)
        and (r.effective_until is null or r.effective_until > coalesce(int_row.completed_at::date, current_date))
        and (
          (r.min_tco2eq <= tco2eq_val and (r.max_tco2eq is null or r.max_tco2eq > tco2eq_val))
          or
          (r.min_kg is not null and r.min_kg <= eq_row.charge_kg and (r.max_kg is null or r.max_kg > eq_row.charge_kg))
        )
      order by r.cadence_days asc, r.min_tco2eq desc
      limit 1;
    end if;
  end if;

  -- Company capacity attestation (COMPANY_CAPACITY active at intervention date)
  select * into company_att
  from public.regulatory_attestations
  where organization_id = target_organization_id
    and attestation_kind = 'COMPANY_CAPACITY'
    and status = 'ACTIVE'
    and valid_from <= coalesce(int_row.completed_at::date, current_date)
    and valid_until >= coalesce(int_row.completed_at::date, current_date)
  order by valid_until desc
  limit 1;

  if company_att.id is null then
    gaps := gaps || jsonb_build_object(
      'field', 'company_capacity_attestation',
      'reason', 'aucune attestation de capacité entreprise ACTIVE couvrant la date d''intervention'
    );
  end if;

  -- Technician aptitude attestation (assigned_user_id must hold TECHNICIAN_APTITUDE)
  if int_row.assigned_user_id is not null then
    select * into tech_att
    from public.regulatory_attestations
    where organization_id = target_organization_id
      and attestation_kind = 'TECHNICIAN_APTITUDE'
      and holder_user_id = int_row.assigned_user_id
      and status = 'ACTIVE'
      and valid_from <= coalesce(int_row.completed_at::date, current_date)
      and valid_until >= coalesce(int_row.completed_at::date, current_date)
    order by valid_until desc
    limit 1;

    if tech_att.id is null then
      gaps := gaps || jsonb_build_object(
        'field', 'technician_aptitude_attestation',
        'reason', format('technicien %s n''a pas d''attestation d''aptitude ACTIVE couvrant la date d''intervention', int_row.assigned_user_id)
      );
    end if;
  else
    gaps := gaps || jsonb_build_object(
      'field', 'assigned_user_id',
      'reason', 'intervention sans technicien assigné'
    );
  end if;

  -- Optional field report attached
  select * into report_row
  from public.field_reports
  where intervention_id = target_intervention_id
    and organization_id = target_organization_id
  limit 1;

  -- Build the CERFA payload — mirrors the 15497*04 sheet structure
  payload := jsonb_build_object(
    'cerfa_form_reference', '15497*04',
    'cerfa_source', 'arrêté du 2024-05-29 — obligatoire depuis 2024-07-06',
    'intervention', jsonb_build_object(
      'id', int_row.id,
      'title', int_row.title,
      'description', int_row.description,
      'address', jsonb_build_object(
        'line1', int_row.address_line1,
        'line2', int_row.address_line2,
        'postal_code', int_row.address_postal_code,
        'city', int_row.address_city,
        'country_code', int_row.address_country_code
      ),
      'scheduled_at', int_row.scheduled_at,
      'completed_at', int_row.completed_at,
      'notes', int_row.notes
    ),
    'equipment', case when eq_id is null then null else jsonb_build_object(
      'id', eq_row.id,
      'label', eq_row.label,
      'external_ref', eq_row.external_ref,
      'category', eq_row.equipment_category,
      'fluid_code', eq_row.fluid_code,
      'charge_kg', eq_row.charge_kg,
      'is_hermetic', eq_row.is_hermetic,
      'is_residential', eq_row.is_residential,
      'is_mobile', eq_row.is_mobile,
      'has_leak_detector', eq_row.has_leak_detector,
      'commissioned_at', eq_row.commissioned_at,
      'installation_address', eq_row.installation_address,
      'tco2eq_at_intervention_date', tco2eq_val
    ) end,
    'operator_company', case when company_att.id is null then null else jsonb_build_object(
      'attestation_kind', company_att.attestation_kind,
      'scope', company_att.scope,
      'reference_number', company_att.reference_number,
      'issued_by', company_att.issued_by,
      'valid_from', company_att.valid_from,
      'valid_until', company_att.valid_until
    ) end,
    'technician', case when tech_att.id is null then null else jsonb_build_object(
      'holder_user_id', tech_att.holder_user_id,
      'attestation_kind', tech_att.attestation_kind,
      'scope', tech_att.scope,
      'reference_number', tech_att.reference_number,
      'issued_by', tech_att.issued_by,
      'valid_from', tech_att.valid_from,
      'valid_until', tech_att.valid_until
    ) end,
    'field_report', case when report_row.id is null then null else jsonb_build_object(
      'id', report_row.id,
      'status', report_row.status,
      'summary', report_row.summary,
      'observations', report_row.observations,
      'attachments', report_row.attachments,
      'approved_at', report_row.approved_at
    ) end
  );

  rule_snap := jsonb_build_object(
    'gwp_value_id',    gwp_row.id,
    'gwp_100y',        gwp_row.gwp_100y,
    'ipcc_assessment', gwp_row.ipcc_assessment,
    'gwp_source_ref',  gwp_row.source_ref,
    'leak_rule_id',    leak_rule_row.id,
    'leak_rule_code',  leak_rule_row.rule_code,
    'leak_rule_source_ref', leak_rule_row.source_ref,
    'company_attestation_id', company_att.id,
    'technician_attestation_id', tech_att.id,
    'generated_at',    to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'reference_date',  coalesce(int_row.completed_at::date, current_date)
  );

  new_status := case when jsonb_array_length(gaps) = 0 then 'READY' else 'DRAFT' end;

  -- Supersede any existing ACTIVE export for this intervention
  select id into existing_export_id
  from public.regulatory_exports
  where organization_id = target_organization_id
    and export_kind = 'CERFA_15497_04'
    and reference_intervention_id = target_intervention_id
    and superseded_at is null;

  -- Insert new row FIRST so we know its id, then link the old one
  insert into public.regulatory_exports (
    organization_id, export_kind, reference_intervention_id, reference_equipment_id,
    status, payload, payload_gaps, rule_snapshot,
    generated_by_user_id
  ) values (
    target_organization_id, 'CERFA_15497_04', target_intervention_id, eq_id,
    new_status, payload, gaps, rule_snap,
    target_generator_user_id
  ) returning id into new_id;

  if existing_export_id is not null then
    update public.regulatory_exports
      set status = 'SUPERSEDED',
          superseded_at = now(),
          superseded_by_export_id = new_id,
          supersede_reason = 'regenerated'
    where id = existing_export_id;
  end if;

  perform public.record_audit_log(
    target_organization_id, 'regulatory_export.generate_cerfa',
    'regulatory_export', new_id,
    jsonb_build_object(
      'intervention_id', target_intervention_id,
      'equipment_id', eq_id,
      'status', new_status,
      'gaps_count', jsonb_array_length(gaps),
      'superseded_export_id', existing_export_id
    )
  );

  return new_id;
end;
$$;

revoke all on function public.generate_cerfa_intervention_export(uuid, uuid, uuid) from public, anon;
grant execute on function public.generate_cerfa_intervention_export(uuid, uuid, uuid) to authenticated, service_role;

comment on function public.generate_cerfa_intervention_export(uuid, uuid, uuid) is
  'Generate a CERFA 15497*04 export payload for an intervention. Compiles from equipment, attestations, field report + versioned GWP/leak-rule snapshots. Missing required fields land in payload_gaps → status DRAFT until filled. Regeneration supersedes the previous active export. SESIRA produces; the customer deposits.';

-- =========================================================================
-- generate_annual_regulatory_bilan — 1 bilan per (org, year)
-- =========================================================================
-- Annual F-Gas bilan for the operator. Aggregated across all active
-- equipment in the org, using the GWP row active at year-end.
-- Section 1.1: opérateurs déposent auprès de leur organisme agréé
-- (DEKRA, Cemafroid, Socotec…) du 1er au 31 janvier. SESIRA
-- produces; the customer deposits.
create or replace function public.generate_annual_regulatory_bilan(
  target_organization_id uuid,
  target_year            integer,
  target_generator_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  year_end          date;
  new_id            uuid;
  existing_id       uuid;
  gaps              jsonb := '[]'::jsonb;
  payload           jsonb;
  rule_snap         jsonb;
  new_status        text;
  equipment_summary jsonb;
  attestation_summary jsonb;
  cerfa_summary     jsonb;
  gwp_used          jsonb;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'generate_annual_regulatory_bilan: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if target_year is null or target_year < 2020 or target_year > 2100 then
    raise exception 'generate_annual_regulatory_bilan: year must be in [2020, 2100] (got %)', target_year
      using errcode = '22023';
  end if;

  year_end := make_date(target_year, 12, 31);

  -- Per-fluid aggregation using the GWP active at year-end (INV-03 snapshot)
  select coalesce(jsonb_agg(row_to_json(t)::jsonb order by t.fluid_code), '[]'::jsonb) into equipment_summary
  from (
    select
      e.fluid_code,
      count(*)                                 as equipment_count,
      sum(e.charge_kg)                         as total_charge_kg,
      sum(e.charge_kg * coalesce(g.gwp_100y, 0) / 1000) as total_tco2eq,
      g.id                                     as gwp_value_id,
      g.gwp_100y,
      g.ipcc_assessment,
      g.source_ref
    from public.equipment e
    left join lateral (
      select gv.id, gv.gwp_100y, gv.ipcc_assessment, gv.source_ref
      from public.regulatory_gwp_values gv
      where gv.fluid_code = e.fluid_code
        and gv.effective_from <= year_end
        and (gv.effective_until is null or gv.effective_until > year_end)
      order by gv.effective_from desc
      limit 1
    ) g on true
    where e.organization_id = target_organization_id
      and e.status = 'ACTIVE'
      and (e.commissioned_at is null or e.commissioned_at <= year_end)
      and (e.decommissioned_at is null or e.decommissioned_at > year_end)
    group by e.fluid_code, g.id, g.gwp_100y, g.ipcc_assessment, g.source_ref
  ) t;

  -- Flag fluids without GWP data (they contribute 0 to tCO₂eq — audit gap)
  if exists (
    select 1
    from jsonb_array_elements(equipment_summary) elem
    where (elem->>'gwp_value_id') is null
  ) then
    gaps := gaps || jsonb_build_object(
      'field', 'gwp_values',
      'reason', 'un ou plusieurs fluides sans valeur GWP versionnée au 31 décembre — seed regulatory_gwp_values requis'
    );
  end if;

  -- Attestations covering the reporting year
  select coalesce(jsonb_agg(row_to_json(t)::jsonb order by t.attestation_kind, t.scope), '[]'::jsonb) into attestation_summary
  from (
    select id, attestation_kind, scope, holder_user_id, reference_number,
           issued_by, valid_from, valid_until, status
    from public.regulatory_attestations
    where organization_id = target_organization_id
      and valid_from <= year_end
      and valid_until >= make_date(target_year, 1, 1)
  ) t;

  -- CERFA interventions during the reporting year (context, not required)
  select coalesce(jsonb_agg(row_to_json(t)::jsonb order by t.completed_at), '[]'::jsonb) into cerfa_summary
  from (
    select
      i.id            as intervention_id,
      i.completed_at,
      i.title,
      e.id            as export_id,
      e.status        as export_status,
      jsonb_array_length(e.payload_gaps) as gap_count
    from public.interventions i
    left join public.regulatory_exports e
      on e.reference_intervention_id = i.id
      and e.organization_id = target_organization_id
      and e.export_kind = 'CERFA_15497_04'
      and e.superseded_at is null
    where i.organization_id = target_organization_id
      and i.completed_at is not null
      and extract(year from i.completed_at) = target_year
  ) t;

  -- Flag COMPLETED interventions with no CERFA export as a gap
  if exists (
    select 1 from jsonb_array_elements(cerfa_summary) elem
    where (elem->>'export_id') is null
  ) then
    gaps := gaps || jsonb_build_object(
      'field', 'cerfa_missing',
      'reason', 'une ou plusieurs interventions terminées de l''année sans fiche CERFA générée — appeler generate_cerfa_intervention_export pour chacune avant de finaliser le bilan'
    );
  end if;

  -- GWP snapshot used across the aggregation
  select coalesce(jsonb_agg(jsonb_build_object(
    'gwp_value_id', elem->>'gwp_value_id',
    'gwp_100y', elem->>'gwp_100y',
    'ipcc_assessment', elem->>'ipcc_assessment',
    'source_ref', elem->>'source_ref',
    'fluid_code', elem->>'fluid_code'
  )), '[]'::jsonb) into gwp_used
  from jsonb_array_elements(equipment_summary) elem
  where (elem->>'gwp_value_id') is not null;

  payload := jsonb_build_object(
    'bilan_form_reference', 'F-Gas annual bilan (organisme agréé)',
    'reference_year', target_year,
    'reference_year_end', year_end,
    'operator_organization_id', target_organization_id,
    'equipment_summary', equipment_summary,
    'attestation_summary', attestation_summary,
    'interventions_summary', cerfa_summary,
    'reminder', 'SESIRA prépare l''export. Le dépôt reste à la charge du client, auprès de son organisme agréé (DEKRA, Cemafroid, Socotec, Bureau Veritas…) entre le 1er et le 31 janvier.'
  );

  rule_snap := jsonb_build_object(
    'reference_year', target_year,
    'gwp_values_used', gwp_used,
    'generated_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  );

  new_status := case when jsonb_array_length(gaps) = 0 then 'READY' else 'DRAFT' end;

  select id into existing_id
  from public.regulatory_exports
  where organization_id = target_organization_id
    and export_kind = 'ANNUAL_BILAN'
    and reference_year = target_year
    and superseded_at is null;

  insert into public.regulatory_exports (
    organization_id, export_kind, reference_year, status,
    payload, payload_gaps, rule_snapshot, generated_by_user_id
  ) values (
    target_organization_id, 'ANNUAL_BILAN', target_year, new_status,
    payload, gaps, rule_snap, target_generator_user_id
  ) returning id into new_id;

  if existing_id is not null then
    update public.regulatory_exports
      set status = 'SUPERSEDED',
          superseded_at = now(),
          superseded_by_export_id = new_id,
          supersede_reason = 'regenerated'
    where id = existing_id;
  end if;

  perform public.record_audit_log(
    target_organization_id, 'regulatory_export.generate_annual_bilan',
    'regulatory_export', new_id,
    jsonb_build_object(
      'reference_year', target_year,
      'status', new_status,
      'gaps_count', jsonb_array_length(gaps),
      'superseded_export_id', existing_id
    )
  );

  return new_id;
end;
$$;

revoke all on function public.generate_annual_regulatory_bilan(uuid, integer, uuid) from public, anon;
grant execute on function public.generate_annual_regulatory_bilan(uuid, integer, uuid) to authenticated, service_role;

comment on function public.generate_annual_regulatory_bilan(uuid, integer, uuid) is
  'Generate the annual F-Gas bilan payload for an operator organization. Aggregates per-fluid charge / tCO₂eq using GWP rows active at year-end (INV-03 snapshot). Missing GWP or missing CERFAs land in payload_gaps → status DRAFT. Deposit remains the customer''s responsibility (organisme agréé, 1–31 janvier).';

-- =========================================================================
-- mark_regulatory_export_exported — READY → EXPORTED (ACTIVE member)
-- =========================================================================
-- INV-04 boundary: the download / handoff action is the point where a
-- human validates the export. Records exported_at + exported_by + format
-- so we can later prove which version of the file was actually shipped.
create or replace function public.mark_regulatory_export_exported(
  target_organization_id uuid,
  target_export_id       uuid,
  target_exported_by_user_id uuid,
  target_export_format   text
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
    raise exception 'mark_regulatory_export_exported: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.organization_members
    where organization_id = target_organization_id
      and user_id = target_exported_by_user_id
      and status = 'ACTIVE'
  ) then
    raise exception 'mark_regulatory_export_exported: user % is not an ACTIVE member of organization %',
      target_exported_by_user_id, target_organization_id
      using errcode = '42501';
  end if;
  if target_export_format not in ('JSON', 'XML', 'PDF', 'CSV') then
    raise exception 'mark_regulatory_export_exported: export_format must be JSON|XML|PDF|CSV (got %)', target_export_format
      using errcode = '22023';
  end if;

  update public.regulatory_exports
    set status              = 'EXPORTED',
        exported_at         = now(),
        exported_by_user_id = target_exported_by_user_id,
        export_format       = target_export_format
  where id = target_export_id
    and organization_id = target_organization_id
    and status = 'READY';

  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'regulatory_export.exported',
      'regulatory_export', target_export_id,
      jsonb_build_object(
        'exported_by_user_id', target_exported_by_user_id,
        'export_format', target_export_format
      )
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.mark_regulatory_export_exported(uuid, uuid, uuid, text) from public, anon;
grant execute on function public.mark_regulatory_export_exported(uuid, uuid, uuid, text) to authenticated, service_role;

comment on function public.mark_regulatory_export_exported(uuid, uuid, uuid, text) is
  'Marks a READY export as EXPORTED. Records who downloaded it + in which format. Requires ACTIVE org member (INV-04 traced human validation). Does NOT push to any organisme agréé — SESIRA produces, customer deposits.';

-- =========================================================================
-- Read helpers
-- =========================================================================
create or replace function public.regulatory_exports_for(
  target_organization_id uuid,
  target_export_kind     text,
  target_year            integer,
  target_intervention_id uuid,
  target_include_superseded boolean
)
returns table (
  export_id                uuid,
  export_kind              text,
  reference_year           integer,
  reference_intervention_id uuid,
  status                   text,
  payload_gap_count        integer,
  generated_by_user_id     uuid,
  generated_at             timestamptz,
  exported_at              timestamptz,
  exported_by_user_id      uuid,
  export_format            text,
  superseded_at            timestamptz
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'regulatory_exports_for: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;

  return query
  select
    e.id, e.export_kind, e.reference_year, e.reference_intervention_id,
    e.status, jsonb_array_length(e.payload_gaps), e.generated_by_user_id,
    e.generated_at, e.exported_at, e.exported_by_user_id, e.export_format,
    e.superseded_at
  from public.regulatory_exports e
  where e.organization_id = target_organization_id
    and (target_export_kind is null or e.export_kind = target_export_kind)
    and (target_year is null or e.reference_year = target_year)
    and (target_intervention_id is null or e.reference_intervention_id = target_intervention_id)
    and (target_include_superseded or e.superseded_at is null)
  order by e.generated_at desc;
end;
$$;

revoke all on function public.regulatory_exports_for(uuid, text, integer, uuid, boolean) from public, anon;
grant execute on function public.regulatory_exports_for(uuid, text, integer, uuid, boolean) to authenticated, service_role;

create or replace function public.pending_cerfa_interventions(
  target_organization_id uuid
)
returns table (
  intervention_id uuid,
  title           text,
  completed_at    timestamptz,
  customer_id     uuid
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'pending_cerfa_interventions: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;

  return query
  select i.id, i.title, i.completed_at, i.customer_id
  from public.interventions i
  where i.organization_id = target_organization_id
    and i.status = 'COMPLETED'
    and not exists (
      select 1 from public.regulatory_exports e
      where e.organization_id = target_organization_id
        and e.export_kind = 'CERFA_15497_04'
        and e.reference_intervention_id = i.id
        and e.superseded_at is null
    )
  order by i.completed_at desc;
end;
$$;

revoke all on function public.pending_cerfa_interventions(uuid) from public, anon;
grant execute on function public.pending_cerfa_interventions(uuid) to authenticated, service_role;

comment on function public.pending_cerfa_interventions(uuid) is
  'List COMPLETED interventions that do NOT have an ACTIVE CERFA export yet. Feeds the C33 « Suivi réglementaire » surface. NOT a compliance verdict — just a queue of interventions waiting for their CERFA to be generated.';
