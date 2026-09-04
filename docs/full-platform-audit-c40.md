# C40 — SESIRA Full Platform Maturity — Integration Closure

**Status:** C40 backend contracts retained; product integration gaps G1/G2 closed in `integration/c40-core-ui`.
**Branch:** `integration/c40-core-ui`
**Supabase:** `ubfqffhvomaxcwgerwmr`
**Date:** 2026-09-04

This note updates the previous C40 audit only where the product integration work changed the evidence. It does **not** re-audit the underlying C5–C40 Core milestones. The existing milestone evidence remains the source of truth for those contracts.

The product rule remains unchanged: where a real external service is not configured or has not confirmed an outcome, SESIRA shows the state as unavailable, pending or unknown. It never manufactures provider success.

## Criteria legend

- **functional** — a real contract exists for the domain.
- **tenant-safe** — organization scoping and RLS/guard checks apply.
- **auditable** — mutations or external-state changes leave an audit/domain event trail.
- **idempotent** — retries do not duplicate side effects.
- **recoverable** — state transitions retain enough context to retry, reverse when legal, or investigate.
- **honest UI** — the product renders recorded facts, estimates and unknowns distinctly.
- **mobile** — road-facing workflows are usable on small screens; field capture retains device timestamps and replay keys where supported.
- **accessible** — labels and state descriptions remain explicit rather than relying only on colour.
- **no fake provider success** — external success is displayed only from a real external confirmation or an explicitly labelled test mode.

## Coverage grid

| Domain | functional | tenant-safe | auditable | idempotent | recoverable | honest UI | mobile | accessible | no fake provider success |
|---|---|---|---|---|---|---|---|---|---|
| Auth | ✓ base | ✓ base | ✓ | N/A | ✓ | ✓ product | N/A | ✓ product | N/A |
| Tenancy / RLS | ✓ | ✓ | ✓ | N/A | ✓ | ✓ | N/A | ✓ | N/A |
| Clients | ✓ | ✓ | ✓ | ✓ external refs | ✓ | ✓ product | ✓ product | ✓ product | N/A |
| Requests | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ product | ✓ product | ✓ product | N/A |
| Quotes / Opportunities | ✓ C18+ | ✓ | ✓ | ✓ | ✓ | ✓ product | ✓ product | ✓ product | N/A |
| Follow-up / Attention / Approval | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ product | ✓ product | ✓ product | ✓ external actions gated |
| Email / Replies | ✓ | ✓ | ✓ | ✓ provider refs | ✓ | ✓ product | ✓ product | ✓ product | ✓ real external confirmation only |
| AI reply classification | ✓ provider seam | ✓ ai_runs.org_id | ✓ ai_runs | ✓ idempotency key | ✓ failure classes + retry records | ✓ low confidence/sensitive → human | N/A | ✓ | ✓ no classification success when no classifier configured |
| Interventions | ✓ C25 | ✓ | ✓ | ✓ | ✓ | ✓ product | ✓ | ✓ | N/A |
| Field reports | ✓ C26 | ✓ | ✓ | ✓ | ✓ | ✓ product | ✓ | ✓ | ✓ delivery truth separated |
| Documents | ✓ C27+ | ✓ | ✓ | ✓ | ✓ | ✓ product | ✓ product | ✓ | ✓ |
| Invoices | ✓ C28 | ✓ | ✓ | ✓ | ✓ | ✓ product | ✓ product | ✓ | ✓ accounting/e-invoice truth separated |
| Maintenance | ✓ C29 | ✓ | ✓ | ✓ | ✓ | ✓ product | ✓ product | ✓ | N/A |
| Growth / Publishing / Conversations | ✓ C30/C31 | ✓ | ✓ | ✓ | ✓ | ✓ product | ✓ product | ✓ | ✓ external publication refs required |
| Attribution | ✓ C32 | ✓ | ✓ | ✓ | ✓ | ✓ confidence shown | ✓ product | ✓ | N/A |
| F-Gas / CERFA | ✓ C33 | ✓ + rule snapshots | ✓ | ✓ | ✓ | ✓ no compliance verdict | ✓ product | ✓ | ✓ SESIRA prepares; human deposits |
| E-invoicing | ✓ C34 | ✓ | ✓ provider events | ✓ | ✓ | ✓ pending/accepted/rejected only from recorded truth | ✓ product | ✓ | ✓ pending sentinel + external confirmation gate |
| Financing | ✓ C35 | ✓ | ✓ | ✓ | ✓ human-declared status | ✓ consent + human decision | ✓ product | ✓ | ✓ no scoring/advice/funds |
| Technician Field | ✓ C36 | ✓ assignee gate | ✓ | ✓ offline_client_id | ✓ conflicts retained | ✓ product | ✓ structured offline queue | ✓ | N/A |
| Voice | ✓ C37 | ✓ | ✓ disclosure snapshots | ✓ external call ref | ✓ retention/opt-out states | ✓ product | ✓ product | ✓ | ✓ region/provider state never inferred |
| Incidents / Platform state | ✓ C38 | ✓ | ✓ | ✓ | ✓ | ✓ raw measures, no health score | ✓ product | ✓ | N/A |
| Recovery / Security | ✓ C39 evidence retained | ✓ | ✓ | ✓ replay evidence | ✓ | N/A | N/A | N/A | ✓ test/production boundaries retained |
| Data export | ✓ complete-org V2 | ✓ SECURITY INVOKER + RLS | ✓ export audit | N/A read operation | ✓ open JSON/CSV | ✓ downloadable product surface | N/A | ✓ | N/A |
| Regulatory auditability | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ product | ✓ | N/A |

## Closed integration gaps

### G1 — AI provider seam — CLOSED

The previous audit stated that no centralized AI provider contract existed. That statement is now stale.

Current evidence:

- `src/lib/ai/provider.ts` defines `ReplyClassifierProvider`.
- `src/lib/ai/providers/claude.ts` contains the external API adapter; the feature layer does not call Anthropic directly.
- `src/lib/ai/classify-reply.ts` receives the provider by dependency injection and records both successful and failed runs in `ai_runs`.
- `src/lib/email/webhook/ingest.ts` accepts an optional classifier. Without one, the reply is ingested normally and classification is explicitly `SKIPPED`.
- `src/app/webhooks/resend/route.ts` creates the Claude adapter only when `ANTHROPIC_API_KEY` is configured.

**Closure:** the code-level provider seam for the currently implemented AI reply-classification feature exists and is auditable.

**Operational gate retained:** this does not assert that a production Anthropic key is currently provisioned, nor that a specific provider region/data-residency condition has been verified. Those remain deployment facts to verify independently before making a regional-hosting claim.

### G2 — Complete organization export — CLOSED

The old `export_organization_snapshot` returned a limited V1 snapshot. It has been replaced by a real organization export.

Applied migrations:

- `20260904211858_complete_organization_export`
- `20260904212010_secure_organization_export_invoker`

Current contract:

- schema version `C40_COMPLETE_ORGANIZATION_EXPORT_V2`;
- automatically includes every `public` table that is actually linked through `organization_id`;
- verified against the live schema with **49 organization-scoped datasets**;
- includes C33–C40 data such as equipment/regulatory, e-invoicing, financing, technician field artifacts, voice, growth and platform observability;
- recursive redaction removes secret/token/credential-like keys from the exported JSON;
- function is `SECURITY INVOKER`, therefore normal RLS remains authoritative;
- exporting leaves an audit record;
- product routes provide both JSON and CSV downloads from the same snapshot.

**Closure:** INV-07 is now implemented as an actual complete organization export rather than a collection of per-domain reads.

### F1 — documents composite unique — CLOSED

Retained from the original audit: `20261005000000_platform_maturity_fixes.sql` adds `documents_id_organization_id_uniq`, allowing tenant-safe composite references where needed.

## Doctrine sign-off checklist

| Invariant | Status | Evidence |
|---|---|---|
| INV-01 — no compliance verdict | ✓ | Regulatory UI uses prepare/review language; no automatic compliance conclusion |
| INV-02 — regulatory first-seen trace | ✓ | C33 contract retained |
| INV-03 — versioned regulatory references | ✓ | C33 rule snapshots retained |
| INV-04 — human validation for external regulatory actions | ✓ | Product prepares documents; external filing remains human |
| INV-05 — SESIRA never touches funds | ✓ | Financing is referral/status/commission audit only |
| INV-06 — no natural-person credit/emotion/reliability scoring | ✓ | Financing and voice product surfaces explicitly exclude those scores |
| INV-07 — complete customer export, open format | ✓ | Complete-org V2 + JSON/CSV routes + RLS |
| No fake external success | ✓ | Provider-pending/test states remain explicit; external states require recorded confirmation |
| AI provider abstraction | ✓ code seam | ReplyClassifierProvider + injected Claude adapter; runtime activation remains an operational fact |

## Product integration closure added after the original audit

The C40 integration branch also closes the visible product gaps that were not represented in the old backend-only grid:

- `/app` is now a role-aware **Aujourd’hui** work queue rather than a decorative dashboard.
- Technicians get a reduced **Ma journée / Terrain / Rapports / Documents** navigation.
- Structured field capture (notes, anomalies, measurements, parts) can be queued offline and replayed with `captured_at` + `offline_client_id`; conflicts remain visible for human resolution.
- Financing is handled inside the commercial dossier with explicit customer consent and human-declared statuses; no rate/monthly-payment/credit scoring is produced.
- Onboarding is persisted into the organization configuration for OWNER/ADMIN and reloaded on return.
- Connexions displays only rows actually registered in `integrations`; there is no fabricated Microsoft/Gmail/CRM/calendar catalogue.
- Paramètres exposes the complete organization export in JSON and CSV.
- État SESIRA exposes raw technical observations and keeps absent measures absent rather than synthesizing a health score.

## Honest limitations retained

These are not C40 code gaps and must not be hidden:

1. **Offline binary capture:** photos and signatures are not buffered offline yet. Structured text/measurement/parts capture is. Binary offline support requires dedicated IndexedDB/storage work.
2. **External provider activation:** a provider adapter existing in code does not mean production credentials, regional hosting or external delivery are configured. SESIRA must continue to show those states exactly as recorded.
3. **Real-world calibration:** thresholds, cadences, cost baselines, ROI and conversion impact are not market-validated merely because the platform is technically complete.

## Sign-off

**C40 product integration gaps tracked by this audit: 0 open code gaps.**

The branch may be merged only after the repository verification gate (`check:wording`, lint, typecheck, tests, build) and the preview deployment are green. Production deployment remains a separate final gate.

**What NOT to claim:**

- market validated;
- ROI proven;
- threshold calibrated;
- conversion improvement proven;
- a provider/region is active unless the deployment record confirms it;
- offline photo/signature support until binary persistence is implemented.
