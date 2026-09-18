-- SESIRA Core Workflow — commercial opportunity signals (C50).
--
-- New backend layer that connects the regulatory reference data (already
-- versioned in regulatory_leak_check_rules + regulatory_gwp_values) to a
-- deterministic "chantier à préparer" surface. Distinct from:
--
--   * regulatory_attentions (immutable, INV-02/INV-03 — the obligation
--     itself; must never be modified once seen);
--   * attention_items (generic OPS triage — no commercial lifecycle);
--   * opportunities/quotes (only created after an explicit human
--     conversion — never by a cron).
--
-- REGULATORY.md invariants applied:
--   INV-01  never declare "conforme" or "obligatoire de remplacer";
--           wording is "à examiner", "préparer", "planifier".
--   INV-03  every signal persists rule_snapshot (matched_rule_id +
--           source_ref + cadence_days + tCO₂eq + GWP row id). Future
--           revisions of the reference data never rewrite history.
--   INV-04  no external action, no automatic conversion. Cron can scan;
--           only a human RPC can convert a signal to an opportunity.
--
-- Design choices (see project notes):
--   * Dedicated table `commercial_opportunity_signals` — the commercial
--     lifecycle (DETECTED → REVIEWED → PLANNED → CONVERTED, with SNOOZED
--     and DISMISSED branches) does not fit either `attention_items`
--     (4-state ops triage) or `regulatory_attentions` (immutable).
--   * A single equipment can carry BOTH a regulatory_attention AND a
--     commercial signal at the same time — they answer different
--     questions ("is there an obligation?" vs "should we prepare a job?").
--   * Kinds are extensible via check constraint. C50 ships only
--     LEAK_CHECK_DUE because it is the only kind backed by a fully
--     versioned deterministic rule engine today.
--   * Priority is computed deterministically from due-date proximity
--     inside the scanner — never scored by an LLM.

-- =========================================================================
-- Table
-- =========================================================================
create table public.commercial_opportunity_signals (
  id                          uuid primary key default gen_random_uuid(),
  organization_id             uuid not null references public.organizations(id) on delete cascade,
  customer_id                 uuid,
  equipment_id                uuid not null,

  -- Provenance (INV-03 — the "why this exists" trail)
  source_type                 text not null
    check (source_type in ('regulatory_leak_check')),
  source_rule_id              uuid,
  source_rule_version         text,
  source_reference            text,

  signal_kind                 text not null
    check (signal_kind in ('LEAK_CHECK_DUE')),
  title                       text not null check (length(title) between 1 and 300),
  explanation                 text check (explanation is null or length(explanation) <= 2000),
  facts                       jsonb not null default '[]'::jsonb check (jsonb_typeof(facts) = 'array'),
  next_action_hint            text check (next_action_hint is null or length(next_action_hint) <= 500),

  detected_at                 timestamptz not null default now(),
  relevant_from               timestamptz,
  due_at                      timestamptz,

  severity                    text not null default 'NORMAL'
    check (severity in ('LOW', 'NORMAL', 'HIGH', 'URGENT')),

  commercial_status           text not null default 'DETECTED'
    check (commercial_status in ('DETECTED', 'REVIEWED', 'PLANNED', 'SNOOZED', 'CONVERTED', 'DISMISSED')),

  snoozed_until               timestamptz,
  snoozed_reason              text check (snoozed_reason is null or length(snoozed_reason) <= 500),
  snoozed_by_user_id          uuid,

  reviewed_at                 timestamptz,
  reviewed_by_user_id         uuid,

  planned_at                  timestamptz,
  planned_by_user_id          uuid,
  planning_note               text check (planning_note is null or length(planning_note) <= 500),

  dismissed_at                timestamptz,
  dismissed_by_user_id        uuid,
  dismissed_reason            text check (dismissed_reason is null or length(dismissed_reason) <= 500),

  converted_at                timestamptz,
  converted_by_user_id        uuid,
  converted_opportunity_id    uuid,
  converted_quote_id          uuid,

  suggested_catalog_item_id   uuid,
  applied_catalog_item_id     uuid,

  rule_snapshot               jsonb not null default '{}'::jsonb check (jsonb_typeof(rule_snapshot) = 'object'),
  dedupe_key                  text not null check (length(dedupe_key) between 1 and 300),
  metadata                    jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),

  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),

  foreign key (equipment_id, organization_id) references public.equipment(id, organization_id) on delete cascade,
  foreign key (customer_id,  organization_id) references public.customers(id,  organization_id) on delete set null,

  unique (organization_id, dedupe_key)
);

comment on table public.commercial_opportunity_signals is
  'Deterministic "chantier à préparer" surface derived from equipment × regulatory rule. Distinct from regulatory_attentions (which are immutable obligations). Commercial lifecycle: DETECTED → REVIEWED → PLANNED → CONVERTED (with SNOOZED and DISMISSED branches). A signal is never converted to an opportunity by the scanner — only by an explicit human RPC (INV-04). rule_snapshot persists the reference row versions used (INV-03).';

comment on column public.commercial_opportunity_signals.dedupe_key is
  'Deterministic identity: signal:{kind_snake}:{equipment}:{rule_id}:{rule_effective_from}:{due_bucket_yyyymmdd}. Two scans over unchanged data must produce the same key = no duplicate row.';

comment on column public.commercial_opportunity_signals.rule_snapshot is
  'Snapshot of the reference rows used at detection: matched_rule_id, rule_source_ref, cadence_days, tco2eq, gwp_value_id, at_date. INV-03: future revisions of the reference data never rewrite this.';

comment on column public.commercial_opportunity_signals.facts is
  'Array of {label, value} pairs surfaced to explain the signal. Never a legal claim; always factual ("Fluide: R410A", "Charge: 12 kg", "Cadence: 6 mois").';

comment on column public.commercial_opportunity_signals.next_action_hint is
  'Non-committal wording ("À examiner avant …", "Préparer le contrôle …"). Never "vous devez", never "conforme".';

comment on column public.commercial_opportunity_signals.suggested_catalog_item_id is
  'Reserved for C51 catalog integration. C50 never populates this field and never invents a catalog suggestion.';

comment on column public.commercial_opportunity_signals.applied_catalog_item_id is
  'Reserved for C51 catalog integration. C50 leaves this field null.';

create index commercial_signals_org_status_due_idx
  on public.commercial_opportunity_signals (organization_id, commercial_status, due_at nulls last);
create index commercial_signals_org_equipment_idx
  on public.commercial_opportunity_signals (organization_id, equipment_id);
create index commercial_signals_org_customer_idx
  on public.commercial_opportunity_signals (organization_id, customer_id)
  where customer_id is not null;
create index commercial_signals_org_snoozed_idx
  on public.commercial_opportunity_signals (organization_id, snoozed_until)
  where commercial_status = 'SNOOZED';
create index commercial_signals_org_converted_opportunity_idx
  on public.commercial_opportunity_signals (organization_id, converted_opportunity_id)
  where converted_opportunity_id is not null;

-- =========================================================================
-- RLS
-- =========================================================================
alter table public.commercial_opportunity_signals enable row level security;

create policy commercial_signals_select on public.commercial_opportunity_signals
  for select to authenticated
  using (private.is_organization_member(organization_id));

-- INSERT is scoped to organization members; in practice only the scanner
-- (which is invoked either by an authenticated member or by service_role
-- via the SECURITY DEFINER RPC) writes rows. Manual INSERT is allowed but
-- discouraged — the DB accepts them so long as they respect the schema.
create policy commercial_signals_insert on public.commercial_opportunity_signals
  for insert to authenticated
  with check (private.is_organization_member(organization_id));

create policy commercial_signals_update on public.commercial_opportunity_signals
  for update to authenticated
  using (private.is_organization_member(organization_id))
  with check (private.is_organization_member(organization_id));

grant select, insert, update on public.commercial_opportunity_signals to authenticated;
grant select, insert, update on public.commercial_opportunity_signals to service_role;

create trigger set_commercial_signal_updated_at
  before update on public.commercial_opportunity_signals
  for each row execute function private.set_updated_at();

-- =========================================================================
-- State-machine trigger
-- =========================================================================
create or replace function private.enforce_commercial_signal_state_transition()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  old_status text := old.commercial_status;
  new_status text := new.commercial_status;
  allowed    boolean := false;
begin
  -- No transition = always allowed
  if old_status = new_status then
    return new;
  end if;

  -- Terminal states: cannot leave
  if old_status in ('CONVERTED', 'DISMISSED') then
    raise exception 'commercial_signal %: cannot transition out of terminal state %',
      old.id, old_status
      using errcode = '22023';
  end if;

  -- Allowed transitions
  allowed := case old_status
    when 'DETECTED' then new_status in ('REVIEWED', 'PLANNED', 'SNOOZED', 'DISMISSED', 'CONVERTED')
    when 'REVIEWED' then new_status in ('PLANNED', 'SNOOZED', 'DISMISSED', 'CONVERTED', 'DETECTED')
    when 'PLANNED'  then new_status in ('CONVERTED', 'DISMISSED', 'SNOOZED')
    when 'SNOOZED'  then new_status in ('DETECTED', 'REVIEWED', 'DISMISSED')
    else false
  end;

  if not allowed then
    raise exception 'commercial_signal %: transition %→% is not allowed',
      old.id, old_status, new_status
      using errcode = '22023';
  end if;

  return new;
end;
$$;

create trigger commercial_signals_state_transition
  before update on public.commercial_opportunity_signals
  for each row execute function private.enforce_commercial_signal_state_transition();

-- =========================================================================
-- Priority helper (deterministic — mirrored in TS for UI previews)
-- =========================================================================
create or replace function private.commercial_signal_severity_from_due(target_due_at timestamptz)
returns text
language plpgsql
immutable
set search_path = ''
as $$
begin
  if target_due_at is null then
    return 'LOW';
  end if;
  if target_due_at < now() then
    return 'URGENT';
  end if;
  if target_due_at - now() <= make_interval(days => 7) then
    return 'URGENT';
  end if;
  if target_due_at - now() <= make_interval(days => 30) then
    return 'HIGH';
  end if;
  if target_due_at - now() <= make_interval(days => 90) then
    return 'NORMAL';
  end if;
  return 'LOW';
end;
$$;

comment on function private.commercial_signal_severity_from_due(timestamptz) is
  'Deterministic severity from due-date proximity. URGENT if overdue or ≤7d, HIGH if ≤30d, NORMAL if ≤90d, LOW otherwise. TS mirror lives in src/lib/commercial-signals/severity.ts — both sides must move together.';

-- =========================================================================
-- scan_commercial_equipment_signals — idempotent deterministic scanner
-- =========================================================================
-- For each ACTIVE equipment in the organization:
--   * Reuses compute_next_leak_check_due (already versioned, INV-03 aware).
--   * If a due date exists within the LOOKAHEAD_DAYS window: upsert a
--     LEAK_CHECK_DUE signal keyed by (equipment, rule, rule_effective_from,
--     due-bucket day). Two scans over unchanged data produce the SAME
--     dedupe_key = NO duplicate row.
--   * If a signal exists AND is in an active state (DETECTED/REVIEWED/
--     SNOOZED) AND compute now returns NO row (equipment decommissioned,
--     charge below thresholds, hermetic-exempt, etc.): auto-dismiss with
--     dismissed_reason = 'RESOLVED_BY_SCAN'. PLANNED is left untouched —
--     it means a human is actively preparing a quote.
--   * CONVERTED and DISMISSED signals are never touched.
--
-- Cron / service_role can call this. It never creates an opportunity or
-- quote (INV-04).
--
-- Returns counters (detected_new, updated, resolved_by_scan).
create or replace function public.scan_commercial_equipment_signals(
  target_organization_id uuid
)
returns table (
  detected_new       integer,
  updated            integer,
  resolved_by_scan   integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  lookahead_days constant integer := 180;
  eq_row     record;
  due_row    record;
  rule_row   record;
  dedupe     text;
  new_sev    text;
  cust_id    uuid;
  new_title  text;
  new_expl   text;
  new_facts  jsonb;
  new_snap   jsonb;
  new_hint   text;
  existing   record;
  inserted_id uuid;
  now_ts     timestamptz := now();
  cnt_new    integer := 0;
  cnt_upd    integer := 0;
  cnt_res    integer := 0;
  cnt_tmp    integer := 0;
begin
  if not (
    private.is_organization_member(target_organization_id)
    or (select auth.role()) = 'service_role'
  ) then
    raise exception 'scan_commercial_equipment_signals: caller is not authorized for organization %', target_organization_id
      using errcode = '42501';
  end if;

  for eq_row in
    select id, customer_id, external_ref, label, fluid_code, charge_kg,
           is_hermetic, is_residential, is_mobile, has_leak_detector,
           last_leak_check_at, status
    from public.equipment
    where organization_id = target_organization_id
      and status = 'ACTIVE'
  loop
    -- Snapshot the current computation for this equipment.
    select * into due_row
    from public.compute_next_leak_check_due(target_organization_id, eq_row.id, null::date);

    if due_row.next_due_at is null then
      -- No obligation at this date. Auto-resolve any active signal for
      -- this equipment (except PLANNED — a human is preparing a quote).
      update public.commercial_opportunity_signals
        set commercial_status = 'DISMISSED',
            dismissed_at      = now_ts,
            dismissed_by_user_id = null,
            dismissed_reason  = 'RESOLVED_BY_SCAN'
      where organization_id = target_organization_id
        and equipment_id    = eq_row.id
        and signal_kind     = 'LEAK_CHECK_DUE'
        and commercial_status in ('DETECTED', 'REVIEWED', 'SNOOZED');
      get diagnostics cnt_tmp = row_count;
      cnt_res := cnt_res + cnt_tmp;
      continue;
    end if;

    -- Fetch the effective_from of the matched rule to lock the dedupe key
    -- against future rule revisions (INV-03).
    select r.effective_from, r.rule_code, r.source_ref, r.cadence_days
    into rule_row
    from public.regulatory_leak_check_rules r
    where r.id = due_row.matched_rule_id;

    -- Skip beyond the lookahead window: no signal for equipment whose
    -- next check is > 180 days away (avoids noise).
    if due_row.next_due_at > now_ts + make_interval(days => lookahead_days) then
      -- Auto-resolve if a previously-emitted signal for this equipment
      -- is now out of window and still active (rule change moved due_at).
      update public.commercial_opportunity_signals
        set commercial_status = 'DISMISSED',
            dismissed_at      = now_ts,
            dismissed_by_user_id = null,
            dismissed_reason  = 'RESOLVED_BY_SCAN'
      where organization_id = target_organization_id
        and equipment_id    = eq_row.id
        and signal_kind     = 'LEAK_CHECK_DUE'
        and commercial_status in ('DETECTED', 'REVIEWED', 'SNOOZED');
      get diagnostics cnt_tmp = row_count;
      cnt_res := cnt_res + cnt_tmp;
      continue;
    end if;

    dedupe := 'signal:leak_check_due:'
              || eq_row.id::text
              || ':' || coalesce(due_row.matched_rule_id::text, 'unknown')
              || ':' || coalesce(to_char(rule_row.effective_from, 'YYYYMMDD'), 'unknown')
              || ':' || to_char(due_row.next_due_at at time zone 'utc', 'YYYYMMDD');

    new_sev := private.commercial_signal_severity_from_due(due_row.next_due_at);
    cust_id := eq_row.customer_id;

    new_title := case
      when due_row.next_due_at < now_ts
        then format('Contrôle d''étanchéité — préparer (échéance dépassée le %s)',
                    to_char(due_row.next_due_at, 'DD/MM/YYYY'))
      else format('Contrôle d''étanchéité — préparer avant le %s',
                    to_char(due_row.next_due_at, 'DD/MM/YYYY'))
    end;

    new_expl := format(
      'Équipement %s (%s kg de %s, ≈ %s tCO₂eq). Cadence issue de la règle %s.',
      coalesce(eq_row.external_ref, eq_row.label),
      eq_row.charge_kg, eq_row.fluid_code, due_row.tco2eq_snapshot,
      coalesce(due_row.matched_rule_code, 'inconnue')
    );

    new_facts := jsonb_build_array(
      jsonb_build_object('label', 'Fluide',   'value', eq_row.fluid_code),
      jsonb_build_object('label', 'Charge',   'value', format('%s kg', eq_row.charge_kg)),
      jsonb_build_object('label', 'tCO₂eq',   'value', format('%s', due_row.tco2eq_snapshot)),
      jsonb_build_object('label', 'Cadence',  'value', format('%s jours', due_row.cadence_days)),
      jsonb_build_object('label', 'Règle',    'value', coalesce(due_row.matched_rule_code, 'inconnue')),
      jsonb_build_object('label', 'Échéance', 'value', to_char(due_row.next_due_at, 'DD/MM/YYYY'))
    );

    new_snap := jsonb_build_object(
      'matched_rule_id',      due_row.matched_rule_id,
      'matched_rule_code',    due_row.matched_rule_code,
      'rule_source_ref',      due_row.rule_source_ref,
      'rule_effective_from',  to_char(rule_row.effective_from, 'YYYY-MM-DD'),
      'cadence_days',         due_row.cadence_days,
      'tco2eq',               due_row.tco2eq_snapshot,
      'gwp_value_id',         due_row.gwp_value_id_snapshot,
      'next_due_at',          to_char(due_row.next_due_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'detector_doubled',     due_row.detector_doubled,
      'at_date',              to_char(due_row.at_date, 'YYYY-MM-DD')
    );

    new_hint := case
      when due_row.next_due_at < now_ts
        then 'À examiner rapidement — préparer un devis de contrôle avec un technicien attesté.'
      else 'À examiner — préparer un devis de contrôle en amont de l''échéance.'
    end;

    -- Look for an existing row with the same dedupe key.
    select id, commercial_status
    into existing
    from public.commercial_opportunity_signals
    where organization_id = target_organization_id
      and dedupe_key      = dedupe;

    if existing.id is null then
      inserted_id := null;
      insert into public.commercial_opportunity_signals (
        organization_id, customer_id, equipment_id,
        source_type, source_rule_id, source_rule_version, source_reference,
        signal_kind, title, explanation, facts, next_action_hint,
        detected_at, relevant_from, due_at, severity,
        rule_snapshot, dedupe_key
      ) values (
        target_organization_id, cust_id, eq_row.id,
        'regulatory_leak_check', due_row.matched_rule_id,
        to_char(rule_row.effective_from, 'YYYY-MM-DD'),
        due_row.rule_source_ref,
        'LEAK_CHECK_DUE', new_title, new_expl, new_facts, new_hint,
        now_ts, now_ts, due_row.next_due_at, new_sev,
        new_snap, dedupe
      )
      on conflict (organization_id, dedupe_key) do nothing
      returning id into inserted_id;

      if inserted_id is not null then
        cnt_new := cnt_new + 1;
        perform public.record_audit_log(
          target_organization_id, 'commercial_signal.detected',
          'commercial_opportunity_signal', inserted_id,
          jsonb_build_object(
            'equipment_id', eq_row.id,
            'signal_kind', 'LEAK_CHECK_DUE',
            'due_at', to_char(due_row.next_due_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
            'severity', new_sev
          )
        );
      end if;
    else
      -- Refresh mutable descriptive fields but preserve status/lifecycle.
      -- Never overwrite CONVERTED or DISMISSED (terminal). Never touch
      -- SNOOZED (humain deferred). PLANNED is refreshed to keep facts in
      -- sync while the human prepares.
      if existing.commercial_status in ('DETECTED', 'REVIEWED', 'PLANNED') then
        update public.commercial_opportunity_signals
          set title            = new_title,
              explanation      = new_expl,
              facts            = new_facts,
              next_action_hint = new_hint,
              severity         = new_sev,
              due_at           = due_row.next_due_at,
              customer_id      = cust_id,
              rule_snapshot    = new_snap
        where id = existing.id;
        cnt_upd := cnt_upd + 1;
      end if;
    end if;
  end loop;

  detected_new     := cnt_new;
  updated          := cnt_upd;
  resolved_by_scan := cnt_res;
  return next;
end;
$$;

revoke all on function public.scan_commercial_equipment_signals(uuid) from public, anon;
grant execute on function public.scan_commercial_equipment_signals(uuid) to authenticated, service_role;

comment on function public.scan_commercial_equipment_signals(uuid) is
  'Deterministic idempotent scan. Reuses compute_next_leak_check_due (versioned regulatory rules). Emits/refreshes commercial_opportunity_signals for equipment whose next check is within 180 days. Auto-resolves active signals (DETECTED/REVIEWED/SNOOZED) when the equipment is no longer in scope. Never touches CONVERTED, DISMISSED, or PLANNED (except PLANNED gets fact refresh). Never creates an opportunity or quote (INV-04).';

-- =========================================================================
-- mark_commercial_signal_reviewed — DETECTED / SNOOZED → REVIEWED
-- =========================================================================
create or replace function public.mark_commercial_signal_reviewed(
  target_organization_id uuid,
  target_signal_id       uuid
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
    raise exception 'mark_commercial_signal_reviewed: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;

  update public.commercial_opportunity_signals
    set commercial_status    = 'REVIEWED',
        reviewed_at          = now(),
        reviewed_by_user_id  = (select auth.uid())
  where id              = target_signal_id
    and organization_id = target_organization_id
    and commercial_status in ('DETECTED', 'SNOOZED');

  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'commercial_signal.reviewed',
      'commercial_opportunity_signal', target_signal_id,
      jsonb_build_object()
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.mark_commercial_signal_reviewed(uuid, uuid) from public, anon;
grant execute on function public.mark_commercial_signal_reviewed(uuid, uuid) to authenticated, service_role;

-- =========================================================================
-- mark_commercial_signal_planned — REVIEWED / DETECTED → PLANNED
-- =========================================================================
create or replace function public.mark_commercial_signal_planned(
  target_organization_id uuid,
  target_signal_id       uuid,
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
    raise exception 'mark_commercial_signal_planned: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if target_note is not null and length(target_note) > 500 then
    raise exception 'mark_commercial_signal_planned: note too long (max 500 chars)'
      using errcode = '22023';
  end if;

  update public.commercial_opportunity_signals
    set commercial_status  = 'PLANNED',
        planned_at         = now(),
        planned_by_user_id = (select auth.uid()),
        planning_note      = target_note
  where id              = target_signal_id
    and organization_id = target_organization_id
    and commercial_status in ('DETECTED', 'REVIEWED');

  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'commercial_signal.planned',
      'commercial_opportunity_signal', target_signal_id,
      jsonb_build_object('note_provided', target_note is not null)
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.mark_commercial_signal_planned(uuid, uuid, text) from public, anon;
grant execute on function public.mark_commercial_signal_planned(uuid, uuid, text) to authenticated, service_role;

-- =========================================================================
-- snooze_commercial_signal — DETECTED / REVIEWED / PLANNED → SNOOZED
-- =========================================================================
create or replace function public.snooze_commercial_signal(
  target_organization_id uuid,
  target_signal_id       uuid,
  target_until           timestamptz,
  target_reason          text
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
    raise exception 'snooze_commercial_signal: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if target_until is null or target_until <= now() then
    raise exception 'snooze_commercial_signal: snoozed_until must be in the future'
      using errcode = '22023';
  end if;
  if target_until > now() + make_interval(years => 2) then
    raise exception 'snooze_commercial_signal: snoozed_until cannot be more than 2 years away'
      using errcode = '22023';
  end if;
  if target_reason is not null and length(target_reason) > 500 then
    raise exception 'snooze_commercial_signal: reason too long (max 500 chars)'
      using errcode = '22023';
  end if;

  update public.commercial_opportunity_signals
    set commercial_status   = 'SNOOZED',
        snoozed_until       = target_until,
        snoozed_reason      = target_reason,
        snoozed_by_user_id  = (select auth.uid())
  where id              = target_signal_id
    and organization_id = target_organization_id
    and commercial_status in ('DETECTED', 'REVIEWED', 'PLANNED');

  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'commercial_signal.snoozed',
      'commercial_opportunity_signal', target_signal_id,
      jsonb_build_object(
        'snoozed_until', to_char(target_until at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'reason_provided', target_reason is not null
      )
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.snooze_commercial_signal(uuid, uuid, timestamptz, text) from public, anon;
grant execute on function public.snooze_commercial_signal(uuid, uuid, timestamptz, text) to authenticated, service_role;

-- =========================================================================
-- dismiss_commercial_signal — any active state → DISMISSED (terminal)
-- =========================================================================
create or replace function public.dismiss_commercial_signal(
  target_organization_id uuid,
  target_signal_id       uuid,
  target_reason          text
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
    raise exception 'dismiss_commercial_signal: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if target_reason is null or length(trim(target_reason)) = 0 then
    raise exception 'dismiss_commercial_signal: reason is required'
      using errcode = '22023';
  end if;
  if length(target_reason) > 500 then
    raise exception 'dismiss_commercial_signal: reason too long (max 500 chars)'
      using errcode = '22023';
  end if;

  update public.commercial_opportunity_signals
    set commercial_status     = 'DISMISSED',
        dismissed_at          = now(),
        dismissed_by_user_id  = (select auth.uid()),
        dismissed_reason      = target_reason
  where id              = target_signal_id
    and organization_id = target_organization_id
    and commercial_status in ('DETECTED', 'REVIEWED', 'PLANNED', 'SNOOZED');

  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'commercial_signal.dismissed',
      'commercial_opportunity_signal', target_signal_id,
      jsonb_build_object('reason', target_reason)
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.dismiss_commercial_signal(uuid, uuid, text) from public, anon;
grant execute on function public.dismiss_commercial_signal(uuid, uuid, text) to authenticated, service_role;

-- =========================================================================
-- resume_snoozed_commercial_signal — SNOOZED → DETECTED (for expired snoozes)
-- =========================================================================
-- Idempotent. Callable by cron (service_role) or by a member manually.
-- Only flips SNOOZED signals whose snoozed_until <= now().
create or replace function public.resume_expired_commercial_signals(
  target_organization_id uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  if not (
    private.is_organization_member(target_organization_id)
    or (select auth.role()) = 'service_role'
  ) then
    raise exception 'resume_expired_commercial_signals: caller is not authorized for organization %', target_organization_id
      using errcode = '42501';
  end if;

  update public.commercial_opportunity_signals
    set commercial_status = 'DETECTED',
        snoozed_until     = null,
        snoozed_reason    = null,
        snoozed_by_user_id = null
  where organization_id = target_organization_id
    and commercial_status = 'SNOOZED'
    and snoozed_until is not null
    and snoozed_until <= now();

  get diagnostics affected = row_count;
  return coalesce(affected, 0);
end;
$$;

revoke all on function public.resume_expired_commercial_signals(uuid) from public, anon;
grant execute on function public.resume_expired_commercial_signals(uuid) to authenticated, service_role;

-- =========================================================================
-- convert_commercial_signal_to_proposal — HUMAN ONLY (INV-04)
-- =========================================================================
-- Transactional conversion:
--   1. Lock the signal row FOR UPDATE.
--   2. Verify eligibility (DETECTED/REVIEWED/PLANNED; not CONVERTED/DISMISSED/SNOOZED).
--   3. Resolve customer (signal.customer_id or override).
--   4. Call create_opportunity_with_quote (SECURITY DEFINER — reuses its
--      own membership check and creates opportunity + quote atomically).
--   5. Catalog application is intentionally disabled in C50. C51 owns the
--      production catalog contract and immutable price/version semantics.
--   6. UPDATE the signal to CONVERTED with all provenance recorded.
--   7. Emit audit event.
--
-- Concurrency: the FOR UPDATE lock + the "commercial_status in (…)" filter
-- guarantees that two concurrent callers cannot both succeed — the second
-- gets NOT_ELIGIBLE.
--
-- Never invoked from cron / service_role in normal use: the caller is
-- assumed to be an authenticated member who explicitly clicked "Préparer
-- un devis". The RPC does not gate on that (a service_role call is
-- technically allowed) so tests remain simple, but the audit event still
-- carries auth.uid() so a service_role call is visible.
create or replace function public.convert_commercial_signal_to_proposal(
  target_organization_id  uuid,
  target_signal_id        uuid,
  target_quote_title      text,
  target_variant_key      text,
  target_estimated_value  numeric,
  target_currency         text,
  target_owner_user_id    uuid,
  target_override_customer_id uuid,
  target_catalog_item_id  uuid
)
returns table (
  opportunity_id uuid,
  quote_id       uuid,
  signal_id      uuid,
  catalog_applied boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  sig       record;
  cust_id   uuid;
  opp_id    uuid;
  qte_id    uuid;
  applied   boolean := false;
  rpc_row   record;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'convert_commercial_signal_to_proposal: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if target_quote_title is null or length(trim(target_quote_title)) = 0 then
    raise exception 'convert_commercial_signal_to_proposal: quote_title is required'
      using errcode = '22023';
  end if;

  if target_catalog_item_id is not null then
    raise exception 'convert_commercial_signal_to_proposal: catalog application is not available in C50; wait for C51'
      using errcode = '22023';
  end if;

  -- Lock the signal row for the duration of this transaction.
  select id, organization_id, customer_id, equipment_id, signal_kind,
         commercial_status
  into sig
  from public.commercial_opportunity_signals
  where id              = target_signal_id
    and organization_id = target_organization_id
  for update;

  if sig.id is null then
    raise exception 'convert_commercial_signal_to_proposal: signal % not found in organization %',
      target_signal_id, target_organization_id
      using errcode = '22023';
  end if;

  if sig.commercial_status not in ('DETECTED', 'REVIEWED', 'PLANNED') then
    -- Not eligible. Common paths: already CONVERTED, or DISMISSED, or SNOOZED.
    return; -- empty result set → caller reports NOT_ELIGIBLE
  end if;

  cust_id := coalesce(target_override_customer_id, sig.customer_id);
  if cust_id is null then
    raise exception 'convert_commercial_signal_to_proposal: signal % has no customer and no override provided',
      target_signal_id
      using errcode = '22023';
  end if;

  -- Verify the override customer belongs to the same organization
  -- (create_opportunity_with_quote will re-verify too, but we fail early).
  if not exists (
    select 1 from public.customers
    where id = cust_id and organization_id = target_organization_id
  ) then
    raise exception 'convert_commercial_signal_to_proposal: customer % is not in organization %',
      cust_id, target_organization_id
      using errcode = '22023';
  end if;

  -- Create opportunity + first quote atomically.
  select oc.opportunity_id, oc.quote_id
  into rpc_row
  from public.create_opportunity_with_quote(
    target_organization_id,
    cust_id,
    null::uuid,           -- no request
    target_owner_user_id, -- may be null → opportunity has no owner
    target_estimated_value,
    coalesce(target_currency, 'EUR'),
    target_quote_title,
    coalesce(target_variant_key, 'default'),
    jsonb_build_object(
      'origin', 'commercial_signal',
      'signal_id', target_signal_id,
      'signal_kind', sig.signal_kind,
      'equipment_id', sig.equipment_id
    )
  ) oc;
  opp_id := rpc_row.opportunity_id;
  qte_id := rpc_row.quote_id;

  if opp_id is null or qte_id is null then
    raise exception 'convert_commercial_signal_to_proposal: create_opportunity_with_quote returned no ids'
      using errcode = '22023';
  end if;

  -- C50 does not touch service_catalog_items. The richer catalog schema
  -- and immutable price/version contract are delivered by C51.
  applied := false;

  -- Flip the signal to CONVERTED. The state trigger allows DETECTED /
  -- REVIEWED / PLANNED → CONVERTED. If another concurrent caller managed
  -- to convert first (would only happen without FOR UPDATE — kept as
  -- defence-in-depth), the update filter guarantees at-most-one success.
  update public.commercial_opportunity_signals
    set commercial_status         = 'CONVERTED',
        converted_at              = now(),
        converted_by_user_id      = (select auth.uid()),
        converted_opportunity_id  = opp_id,
        converted_quote_id        = qte_id,
        applied_catalog_item_id   = case when applied then target_catalog_item_id else null end
  where id              = target_signal_id
    and organization_id = target_organization_id
    and commercial_status in ('DETECTED', 'REVIEWED', 'PLANNED');

  if not found then
    raise exception 'convert_commercial_signal_to_proposal: signal % was moved out of active state during conversion',
      target_signal_id
      using errcode = '55000';
  end if;

  perform public.record_audit_log(
    target_organization_id, 'commercial_signal.converted_to_proposal',
    'commercial_opportunity_signal', target_signal_id,
    jsonb_build_object(
      'opportunity_id', opp_id,
      'quote_id', qte_id,
      'customer_id', cust_id,
      'catalog_item_id', target_catalog_item_id,
      'catalog_applied', applied
    )
  );

  if target_catalog_item_id is not null then
    perform public.record_audit_log(
      target_organization_id, 'commercial_signal.catalog_suggested',
      'commercial_opportunity_signal', target_signal_id,
      jsonb_build_object(
        'catalog_item_id', target_catalog_item_id,
        'applied', applied
      )
    );
  end if;

  opportunity_id  := opp_id;
  quote_id        := qte_id;
  signal_id       := target_signal_id;
  catalog_applied := applied;
  return next;
end;
$$;

revoke all on function public.convert_commercial_signal_to_proposal(uuid, uuid, text, text, numeric, text, uuid, uuid, uuid) from public, anon;
grant execute on function public.convert_commercial_signal_to_proposal(uuid, uuid, text, text, numeric, text, uuid, uuid, uuid) to authenticated, service_role;

comment on function public.convert_commercial_signal_to_proposal(uuid, uuid, text, text, numeric, text, uuid, uuid, uuid) is
  'Human-only conversion: signal → opportunity + first quote (DRAFT). Locks the signal FOR UPDATE, refuses double-conversion (returns empty set = NOT_ELIGIBLE). Optionally applies a catalog item. Never called from cron. INV-04 preserved.';

-- =========================================================================
-- Read helper — open_commercial_signals(org)
-- =========================================================================
create or replace function public.open_commercial_signals(
  target_organization_id uuid
)
returns table (
  signal_id                 uuid,
  customer_id               uuid,
  equipment_id              uuid,
  signal_kind               text,
  commercial_status         text,
  severity                  text,
  title                     text,
  explanation               text,
  facts                     jsonb,
  next_action_hint          text,
  due_at                    timestamptz,
  detected_at               timestamptz,
  snoozed_until             timestamptz,
  suggested_catalog_item_id uuid,
  rule_snapshot             jsonb
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'open_commercial_signals: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;

  return query
  select
    s.id, s.customer_id, s.equipment_id, s.signal_kind, s.commercial_status,
    s.severity, s.title, s.explanation, s.facts, s.next_action_hint,
    s.due_at, s.detected_at, s.snoozed_until,
    s.suggested_catalog_item_id, s.rule_snapshot
  from public.commercial_opportunity_signals s
  where s.organization_id = target_organization_id
    and s.commercial_status in ('DETECTED', 'REVIEWED', 'PLANNED', 'SNOOZED')
  order by
    case s.severity
      when 'URGENT' then 1
      when 'HIGH'   then 2
      when 'NORMAL' then 3
      when 'LOW'    then 4
    end,
    s.due_at nulls last,
    s.detected_at asc;
end;
$$;

revoke all on function public.open_commercial_signals(uuid) from public, anon;
grant execute on function public.open_commercial_signals(uuid) to authenticated, service_role;

comment on function public.open_commercial_signals(uuid) is
  'Server-side ordered view of open commercial signals for the attention feed. Sort: severity then due_at then detected_at. Excludes CONVERTED and DISMISSED.';
