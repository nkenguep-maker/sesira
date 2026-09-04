-- =========================================================================
-- SESIRA regulatory seed — F-Gas III (EU 2024/573) + IPCC AR6 GWP values
-- =========================================================================
--
-- THIS FILE IS AN EXAMPLE / TEMPLATE. It is NOT applied by
-- `supabase db push` and is NOT tracked in `supabase_migrations`.
--
-- A data operator must:
--   1. Cross-check every row against the current authoritative source
--      (EUR-Lex 2024/573 for F-Gas thresholds; IPCC AR6 WG1 Annex VII
--      for GWP values; ADEME + Ministry decrees for CERFA/attestation
--      scope definitions).
--   2. Adjust `effective_from` and `source_ref` to match the exact
--      publication date and article reference.
--   3. Apply through service_role. Every row insert is permanent —
--      corrections happen by inserting a NEW row and stamping the
--      old row's `effective_until` via `supersede_regulatory_*` RPC.
--
-- Sources to verify at seed time (2026-09-04):
--   * EUR-Lex 2024/573 — Regulation (EU) 2024/573 of 7 February 2024
--     on fluorinated greenhouse gases
--     https://eur-lex.europa.eu/eli/reg/2024/573/oj
--   * IPCC AR6 WG1 Annex VII — Table 7.SM.7 (GWP-100 values)
--   * CERFA 15497*04 — current form for annual F-Gas declaration
--     (verify current version on service-public.fr)
--
-- Wording constraint: this file NEVER produces a "conforme" verdict.
-- SESIRA produces exports; the customer submits them.
--
-- Apply with:
--   SUPABASE_ACCESS_TOKEN=<sbp_...> \
--     npx supabase db query --linked -f supabase/seeds/regulatory_fgas_iii.example.sql

begin;

-- =========================================================================
-- IPCC AR6 GWP-100 values (subset — common HVACR fluids)
-- Reference: IPCC AR6 WG1 Annex VII, Table 7.SM.7
-- REPLACE the placeholder gwp_100y values with the current authoritative
-- numbers before applying.
-- =========================================================================
insert into public.regulatory_gwp_values
  (fluid_code, fluid_name, gwp_100y, ipcc_assessment, effective_from, source_ref, provenance)
values
  -- HFC single-component
  ('R-32',    'Difluoromethane',                 771,  'AR6', '2021-08-09', 'IPCC AR6 WG1 Annex VII Table 7.SM.7', '{"note": "verify current value"}'::jsonb),
  ('R-134a',  '1,1,1,2-Tetrafluoroethane',       1526, 'AR6', '2021-08-09', 'IPCC AR6 WG1 Annex VII Table 7.SM.7', '{"note": "verify current value"}'::jsonb),
  ('R-125',   'Pentafluoroethane',               3740, 'AR6', '2021-08-09', 'IPCC AR6 WG1 Annex VII Table 7.SM.7', '{"note": "verify current value"}'::jsonb),
  ('R-143a',  '1,1,1-Trifluoroethane',           5810, 'AR6', '2021-08-09', 'IPCC AR6 WG1 Annex VII Table 7.SM.7', '{"note": "verify current value"}'::jsonb),
  ('R-152a',  '1,1-Difluoroethane',              164,  'AR6', '2021-08-09', 'IPCC AR6 WG1 Annex VII Table 7.SM.7', '{"note": "verify current value"}'::jsonb),
  ('R-1234yf','2,3,3,3-Tetrafluoropropene',      1,    'AR6', '2021-08-09', 'IPCC AR6 WG1 Annex VII Table 7.SM.7', '{"note": "verify current value; often reported as <1"}'::jsonb),
  ('R-1234ze','trans-1,3,3,3-Tetrafluoropropene',1,    'AR6', '2021-08-09', 'IPCC AR6 WG1 Annex VII Table 7.SM.7', '{"note": "verify current value; often reported as <1"}'::jsonb),
  -- HFC blends (weighted average of components; verify per-blend)
  ('R-410A',  'HFC blend (R-32 + R-125)',        2256, 'AR6', '2021-08-09', 'F-Gas Regulation Annex VI blend calc',   '{"note": "blend GWP — recompute from component AR6 if needed"}'::jsonb),
  ('R-404A',  'HFC blend (R-125 + R-143a + R-134a)', 4728, 'AR6', '2021-08-09', 'F-Gas Regulation Annex VI blend calc', '{"note": "blend GWP"}'::jsonb),
  ('R-407C',  'HFC blend (R-32 + R-125 + R-134a)',   1907, 'AR6', '2021-08-09', 'F-Gas Regulation Annex VI blend calc', '{"note": "blend GWP"}'::jsonb),
  ('R-407F',  'HFC blend (R-32 + R-125 + R-134a)',   1990, 'AR6', '2021-08-09', 'F-Gas Regulation Annex VI blend calc', '{"note": "blend GWP"}'::jsonb),
  ('R-448A',  'HFC/HFO blend',                       1490, 'AR6', '2021-08-09', 'F-Gas Regulation Annex VI blend calc', '{"note": "blend GWP"}'::jsonb),
  ('R-449A',  'HFC/HFO blend',                       1440, 'AR6', '2021-08-09', 'F-Gas Regulation Annex VI blend calc', '{"note": "blend GWP"}'::jsonb),
  ('R-452A',  'HFC/HFO blend',                       1730, 'AR6', '2021-08-09', 'F-Gas Regulation Annex VI blend calc', '{"note": "blend GWP"}'::jsonb);

-- =========================================================================
-- F-Gas III leak-check cadence rules (EU 2024/573)
-- Verify the exact article number + tCO₂eq thresholds against the current
-- consolidated text before applying.
-- =========================================================================
insert into public.regulatory_leak_check_rules
  (rule_code, min_tco2eq, max_tco2eq, cadence_days, requires_leak_detector, detector_reduction_factor, effective_from, source_ref, provenance)
values
  ('FGAS_III_5_50',      5,   50,    365, false, null, '2024-03-11', 'EU 2024/573 (verify article — likely Art. 5)',              '{"note": "verify cadence + threshold vs current consolidated text"}'::jsonb),
  ('FGAS_III_50_500',    50,  500,   180, false, null, '2024-03-11', 'EU 2024/573 (verify article — likely Art. 5)',              '{"note": "verify cadence + threshold vs current consolidated text"}'::jsonb),
  ('FGAS_III_500_PLUS',  500, null,  90,  true,  0.50, '2024-03-11', 'EU 2024/573 (verify article — detector halves cadence)',    '{"note": "detector_reduction_factor per Art. 5 §3 approximately"}'::jsonb);

-- =========================================================================
-- F-Gas III market/servicing bans (illustrative subset)
-- ATTENTION: F-Gas III introduces many new bans phasing in 2025 / 2027 / 2032.
-- Verify each row against Annexes IV / VI of EU 2024/573.
-- =========================================================================
insert into public.regulatory_market_bans
  (ban_code, equipment_category, gwp_threshold, charge_kg_threshold, ban_scope, effective_from, source_ref, provenance)
values
  ('FGAS_III_STATIONARY_REFRIG_2500',       'Stationary refrigeration',      2500, null, 'SERVICING',         '2020-01-01', 'EU 517/2014 legacy — verify carry-over in 2024/573',       '{"note": "legacy 2020 ban carried over — confirm"}'::jsonb),
  ('FGAS_III_SPLIT_AC_LT_3KG_2025',         'Split AC systems <3 kg charge', 750,  3,    'PLACING_ON_MARKET', '2025-01-01', 'EU 2024/573 Annex IV (verify)',                             '{"note": "verify GWP threshold and effective date"}'::jsonb),
  ('FGAS_III_MONOBLOC_AC_2027',             'Monobloc AC ≤12 kW',            150,  null, 'PLACING_ON_MARKET', '2027-01-01', 'EU 2024/573 Annex IV (verify)',                             '{"note": "verify"}'::jsonb);

-- =========================================================================
-- No attestations seeded — these are org-specific and must be inserted
-- per-organization via `record_regulatory_attestation` RPC.
-- =========================================================================

commit;

-- After applying, verify:
--   select count(*), ipcc_assessment from public.regulatory_gwp_values group by 1;
--   select count(*) from public.regulatory_leak_check_rules where effective_until is null;
--   select count(*) from public.regulatory_market_bans where effective_until is null;
