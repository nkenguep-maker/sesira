# SESIRA — Live Database Parity Gate

Date: 2026-09-03
Supabase project: `sesira-os`
Project ref: `ubfqffhvomaxcwgerwmr`
Repository base: C24 head `04aa1365499b105b4229794109b49736d98f4c66`

## Why this gate exists

C24 established technical maturity at repository-contract level, but it intentionally left `LIVE_DATABASE_PARITY = PENDING`.

The live audit found a concrete reason for that distinction: migration versions `20260912000000` through `20260915000000` had already been applied to Supabase with historical definitions, while Git history now contains newer C19 through C23 definitions under those same version numbers. A migration runner correctly considers those versions already applied, so changing the files in Git does not update the live schema.

The repair was therefore forward-only. Existing production objects and historical data were preserved, and current contracts were installed through new reconciliation migrations.

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

The parity branch contains:

1. `20260916000000_interventions_core.sql` restored to Git history.
2. `20260917000000_field_reports.sql` reconstructed from the applied schema.
3. `20260918000000_reconcile_value_and_commercial_contracts.sql` for current C19 and C20.
4. `20260919000000_reconcile_speed_to_lead_and_drafting.sql` for current C22 and C23.
5. `20260920000000_reconcile_operations_and_grants.sql` to connect real intervention scheduling to current C19 and narrow C25/C26 grants.

The reconciliation migrations use forward-only patterns such as `ADD COLUMN IF NOT EXISTS`, conditional constraints, `CREATE INDEX IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION` and `DROP TRIGGER IF EXISTS` before recreation. They do not delete the historical `value_policies`, `reply_objections`, `first_response_at` or `acknowledged_at` surfaces.

Legacy objection rows are copied into the current model when present. Historical Speed to Lead response timestamps are deliberately not copied into `first_handled_at`, because doing so would fabricate a different measurement.

The Supabase migration API generated temporary execution timestamps for the three reconciliation calls. Immediately after each successful transactional migration, `supabase_migrations.schema_migrations.version` was repaired to the canonical Git version. The live history now records exactly `20260918000000`, `20260919000000` and `20260920000000` for the three reconciliation migrations.

## C25 to C19 bridge

A scheduled intervention is observable evidence of an operational next step. The bridge therefore mirrors a scheduled, non-terminal intervention onto a WON opportunity with source `INTERVENTION`.

When that intervention becomes completed or cancelled, the bridge clears the next step only if the opportunity still points to the exact same intervention-derived timestamp. It never erases a different manual or system next step.

## Permissions and RLS

The live audit showed that project-level default privileges had granted broader table capabilities than intended on `interventions` and `field_reports`. RLS still restricted row access, but parity hardening makes the authenticated capability surface explicit.

Authenticated users receive only `SELECT`, `INSERT` and `UPDATE` on `interventions` and `field_reports`. Public and anon receive no table privileges. `commercial_objections`, `interventions`, `field_reports`, `opportunities`, `quotes` and `requests` all have RLS enabled in the live database.

`sync_commercial_objection_from_ai` remains service-role only. Tenant-facing `SECURITY DEFINER` RPCs remain executable by authenticated users only where the application intentionally calls them through the session client; those RPCs re-check organization membership and, where required, organization role inside the function body.

## Live verification evidence

Repository CI on the parity branch passed the canonical `npm run verify` gate with:

- lint passed
- typecheck passed
- 69 test files passed
- 456 tests passed
- Next.js production build passed

After live migration, the database was re-read directly and confirmed:

- all four `opportunities.operational_next_step_*` columns exist
- `requests.first_handled_at` exists while historical `first_response_at` remains intact
- `quotes.draft_analysis_at` and `draft_gaps` exist
- current C19, C20, C22 and C23 RPCs exist with the expected signatures
- `requests_protect_first_handled_at`, Speed to Lead attention triggers, quote draft protection/readiness triggers and `interventions_sync_operational_next_step` are installed
- `commercial_objections`, legacy `reply_objections` and legacy `value_policies` coexist, preserving historical compatibility
- reconciliation migrations `20260918000000`, `20260919000000` and `20260920000000` are present in live migration history
- no `anon` table grants exist on `commercial_objections`, `interventions` or `field_reports`

## Advisor review

Supabase security advisors were re-run after reconciliation. They report warnings for authenticated access to `SECURITY DEFINER` RPCs and for leaked-password protection being disabled.

The RPC warnings are reviewed, not ignored: the tenant-facing RPCs are deliberately exposed because the server-side application uses the authenticated session client, and the functions re-impose membership or role checks in PostgreSQL. Service-only functions such as `sync_commercial_objection_from_ai` remain restricted to `service_role`.

Leaked-password protection is an Auth hardening item and remains separate from this database parity gate.

Performance advisors currently report informational items, mainly unused indexes on this young database and foreign keys without dedicated covering indexes. These are optimization follow-ups, not parity blockers, and should be revisited with real workload data rather than removing or adding indexes speculatively.

## Promotion boundary

External actions remain disabled. Passing this gate does not authorize provider sends, calibration claims or commercial validation claims.

Production promotion remains a separate decision and must continue to respect the external-actions kill switch and the remaining C24 labels.

## Current status

`REPOSITORY_PARITY_PATCH = VERIFIED`

`LIVE_DATABASE_PARITY = PASS`

`SECURITY_ADVISORS = REVIEWED_WITH_WARNINGS`

`PERFORMANCE_ADVISORS = INFO_ONLY`

`PRODUCTION_PROMOTION = LOCKED`
