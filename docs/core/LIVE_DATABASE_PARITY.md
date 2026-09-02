# SESIRA — Live Database Parity Gate

Date: 2026-09-03
Supabase project: `sesira-os`
Project ref: `ubfqffhvomaxcwgerwmr`
Repository base: C24 head `04aa1365499b105b4229794109b49736d98f4c66`

## Why this gate exists

C24 established technical maturity at repository-contract level, but it intentionally left `LIVE_DATABASE_PARITY = PENDING`.

The live audit found a concrete reason for that distinction: migration versions `20260912000000` through `20260915000000` had already been applied to Supabase with historical definitions, while Git history now contains newer C19 through C23 definitions under those same version numbers. A migration runner correctly considers those versions already applied, so changing the files in Git does not update the live schema.

The correct repair is forward-only. Existing migration versions are never rewritten or re-applied to production.

## Drift observed before reconciliation

### C19

The repository expects `opportunities.operational_next_step_*` fields and organization-owned policies stored in `organizations.config`. The live database still had the historical `value_policies` table and the old `resolve_value_policy` / `sold_not_scheduled_opportunities` RPC surface. No current operational-next-step columns were present.

### C20

The repository expects `commercial_objections` plus human-authoritative correction and scoreless opportunity snapshot RPCs. The live database still had the historical `reply_objections` model and `record_reply_objection` / `compute_staleness_signal` surface.

### C22

The repository defines Speed to Lead as `FIRST_INTERNAL_HANDLING` through immutable `requests.first_handled_at`. The live database still had historical `acknowledged_at`, `first_response_at`, `record_request_first_response` and `speed_to_lead_stats` semantics. Historical response data is valid historical data, but it must not be silently relabeled as internal handling.

### C23

The live database had `draft_gaps` but no `draft_analysis_at`, no authoritative `DRAFT -> SENT` readiness gate and the historical weaker `record_quote_draft_gaps` implementation.

### C25 and C26

The live database already had migrations `20260916000000 interventions_core` and `20260917000000 field_reports`, but those files were missing from the current integration branch. C25 was recovered from historical Git. C26 was reconstructed from the live schema, constraints, policies, trigger and review RPC.

## Forward-only repair

The parity branch adds:

1. `20260916000000_interventions_core.sql` restored to Git history.
2. `20260917000000_field_reports.sql` reconstructed from the applied schema.
3. `20260918000000_reconcile_value_and_commercial_contracts.sql` for current C19 and C20.
4. `20260919000000_reconcile_speed_to_lead_and_drafting.sql` for current C22 and C23.
5. `20260920000000_reconcile_operations_and_grants.sql` to connect real intervention scheduling to current C19 and narrow C25/C26 grants.

The reconciliation migrations use forward-only patterns such as `ADD COLUMN IF NOT EXISTS`, conditional constraints, `CREATE INDEX IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION` and `DROP TRIGGER IF EXISTS` before recreation. They do not delete the historical `value_policies`, `reply_objections`, `first_response_at` or `acknowledged_at` surfaces.

Legacy objection rows are copied into the current model when present. Historical Speed to Lead response timestamps are deliberately not copied into `first_handled_at`, because doing so would fabricate a different measurement.

## C25 to C19 bridge

A scheduled intervention is observable evidence of an operational next step. The bridge therefore mirrors a scheduled, non-terminal intervention onto a WON opportunity with source `INTERVENTION`.

When that intervention becomes completed or cancelled, the bridge clears the next step only if the opportunity still points to the exact same intervention-derived timestamp. It never erases a different manual or system next step.

## Permissions

The live audit showed that project-level default privileges had granted broader table capabilities than intended on `interventions` and `field_reports`. RLS still restricted row access, but parity hardening makes the capability surface explicit:

Authenticated users receive only `SELECT`, `INSERT` and `UPDATE` on those tables. Public and anon receive no table privileges. RPC execution grants remain explicit.

## Promotion sequence

1. Repository verify must pass on the exact parity head.
2. Reconciliation migrations are then applied to the live `sesira-os` Supabase project in version order using the migration API.
3. Exact columns, functions, triggers and grants are re-read from live.
4. Supabase security and performance advisors are re-run.
5. Only after those checks can `LIVE_DATABASE_PARITY` change from `PENDING` to `PASS`.

External actions remain disabled throughout. This gate does not authorize Vercel production promotion or provider sends.

## Current status

`REPOSITORY_PARITY_PATCH = BUILT`

`LIVE_DATABASE_PARITY = PENDING`

`PRODUCTION_PROMOTION = LOCKED`
