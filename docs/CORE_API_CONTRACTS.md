# SESIRA — Core API Contracts

> Shared boundary between Product (Codex) and Core Workflow engineering (Claude).
> Updated: 24 August 2026.

This document records backend data that Product needs but must not fabricate or implement inside
the UI layer. `REQUESTED` means the Results interface keeps the value visibly unavailable until
Core provides a tenant-safe implementation.

## Results contracts

### `getAutomationResultsSummary(period)` — P0 — REQUESTED

Owner: Claude Core.

Purpose: return real, organization-scoped workflow outcomes for a bounded period.

Required output:

- follow-ups scheduled, attempted, completed and failed;
- replies received after a follow-up;
- attention items created by a workflow decision;
- work completed in Shadow Mode versus externally executed;
- stable identifiers or aggregation rules that prevent duplicate counting;
- data freshness and unavailable fields.

Requirements:

- organization authority must come from authenticated membership, never browser input;
- only completed real actions may be reported as observed;
- Shadow Mode decisions must never be counted as external sends;
- retries and duplicate attempts must not inflate business metrics;
- the period must have explicit inclusive/exclusive UTC boundaries.

Product status: `/app/results` does not show real follow-up, reply or automation metrics while this
contract is missing.

### `getResultsValueInputs(period)` — P0 — REQUESTED

Owner: Claude Core, with product/business configuration supplied separately.

Purpose: provide validated inputs for commercial value and investment calculations.

Required output:

- loaded hourly cost and currency, with source and effective date;
- tenant investment or subscription cost for the selected period;
- contribution margin when available (revenue alone is insufficient);
- attribution method and confidence;
- attributed outcomes with deduplication keys;
- an explicit unavailable state for every missing input.

Product status: “Gain potentiel estimé” and “Pour 1 € investi” remain `À établir`. Product must not
derive these values from quote totals alone.

### `getAttributedCommercialOutcomes(period)` — P1 — REQUESTED

Owner: Claude Core.

Purpose: expose outcomes that can be connected to a deterministic SESIRA workflow without claiming
causality that the data does not support.

Required output:

- quote/customer/request identifiers scoped to the active organization;
- outcome type and timestamp;
- contribution margin or explicitly marked proxy;
- originating workflow run, follow-up action and audit references;
- attribution status (`OBSERVED`, `ESTIMATED`, `UNKNOWN`) and rationale;
- duplicate-prevention key.

Product status: no commercial outcome is shown as generated revenue until this contract is
implemented and reviewed.

## Existing Product-side contract

The current Results UI owns these TypeScript contracts in `src/lib/results/contracts.ts`:

- `ResultsPeriod`
- `ResultsSummary`
- `ObservedMetric`
- `EstimatedMetric`
- `ValueEstimate`
- `ResultsRepository`

They are a Product read boundary, not a workflow engine. Core should provide adapters compatible
with that boundary and must not rewrite Customers, Requests, Quotes, Attention, Events or the
application shell to satisfy it.

## Automations product contracts

The current `/app/automations` page reads only enabled `automation_configs` and existing,
organization-scoped `automation_runs`. It does not schedule, execute, retry or approve anything.
Until the contracts below are implemented, health is a cautious presentation of the latest stored
runs and Shadow Mode contains explanatory copy only.

### `getAutomationProductSummary()` — P0 — REQUESTED

Owner: Claude Core.

Purpose: provide one tenant-safe, deduplicated status summary for every enabled automation.

Required output:

- canonical template key and template version;
- enabled state and effective level;
- runtime health with a client-safe explanation;
- latest real activity, latest success and latest problem;
- data freshness and explicit unavailable fields;
- stable run identifiers and duplicate-safe aggregation rules;
- pause/kill-switch state when Core supports it.

Requirements:

- retries and duplicate attempts must not inflate recent activity;
- technical errors, secrets and raw provider payloads must not reach the client;
- Shadow decisions must never be reported as real external actions;
- organization authority must come from authenticated membership.

### `getShadowDecisions(automationId)` — P0 — REQUESTED

Owner: Claude Core.

Purpose: return real proposed actions created by the future Shadow Mode engine.

Required output:

- proposal identifier, automation and source event/run provenance;
- proposed action and client-safe rationale;
- creation time and deterministic decision version;
- explicit confirmation that no external effect occurred;
- links to the relevant Customer, Request, Quote or Attention item when applicable.

Product status: the UI currently shows only the explanatory sentence “Sesira aurait effectué cette
action.” It does not fabricate a proposal or a run.

### `getAutomationCapabilityPolicy(automationId)` — P1 — REQUESTED

Owner: Claude Core.

Purpose: expose the effective actions permitted at the current trust level and the actions that
always require human judgment.

Required output:

- effective level (`OBSERVATION`, `SHADOW`, `APPROVAL`, `AUTOMATIC`);
- allowed deterministic actions;
- approval-required actions;
- prohibited/sensitive actions;
- effective organization, integration and global kill-switch state;
- policy version and effective date.

The initial Product catalog recognizes these canonical template keys:

```text
quote_follow_up
request_intake
email_triage
report_creation
invoice_follow_up
```

Core should preserve stable template identity or provide an explicit mapping. Product copy must not
be used as a workflow identifier.

## Organization settings contracts

The current `/app/settings` page persists only existing `organizations` fields and reads existing
members and integrations. Product does not emulate the missing services below.

### `getNotificationPreferences()` / `updateNotificationPreferences(input)` — P1 — REQUESTED

Owner: Claude Core.

Purpose: read and update tenant-scoped preferences for urgent requests, quote replies, price
objections and automation incidents.

Requirements:

- organization authority derived from authenticated membership;
- explicit channel, enabled state, preference version and update timestamp;
- permission checks compatible with existing organization roles;
- validation, audit logging and an unavailable state;
- no preference inferred from a disabled Product control.

Product status: notification controls are disabled and explicitly state that no preference is
currently applied.

### `createOrganizationDataExport()` — P1 — REQUESTED

Owner: Claude Core.

Purpose: create an auditable, asynchronous export for the active organization.

Required output: export identifier, state, requested/completed/expiry times and a short-lived safe
download reference. Requests must be idempotent and must not expose another tenant’s data.

### `getOrganizationRetentionPolicy()` — P1 — REQUESTED

Owner: Claude Core.

Purpose: return the effective retention rules, policy source, effective date and explicit exceptions.

Product status: the UI says that retention is not configured; it does not invent a duration.

### `requestOrganizationDeletion(input)` — P0 — REQUESTED

Owner: Claude Core.

Purpose: start a controlled deletion request. This must not be a direct browser-triggered cascade.

Requirements:

- OWNER-only authorization with recent re-authentication;
- impact preview, explicit confirmation and cooling-off/cancellation policy;
- stable idempotency key, audit log and incident-safe failure handling;
- export option before deletion and tenant-scoped progress state;
- documented treatment of legal retention, backups and connected providers.

Product status: deletion is disabled and no destructive action is sent.

### `getBillingSummary()` — P1 — REQUESTED

Owner: Core/Commercial platform.

Purpose: return the actual plan, billing state, currency, renewal date, invoice references and safe
billing-portal capability for the active organization.

Product status: only the existing organization status is displayed. No plan, price, subscription or
Stripe connection is fabricated.

## Public diagnostic lead contract

The public `/diagnostic` route calculates results entirely in the browser. No prospect table or
secure public ingestion endpoint exists in the current schema, so Product does not send or persist
contact details.

The typed Product boundary is defined by `DiagnosticLead`, `DiagnosticLeadSubmission`,
`DiagnosticLeadSubmissionResult` and `DiagnosticLeadRepository` in
`src/lib/diagnostic/contracts.ts`.

### `submitDiagnosticLead(input)` — P0 — REQUESTED

Owner: Claude Core.

Purpose: accept a contact request only after the visitor has seen their diagnostic results.

Required input:

- first name, last name, company and professional email;
- optional phone, employee count and postal code;
- explicit contact consent;
- diagnostic calculation version and validated diagnostic inputs;
- source, campaign fields when supplied by trusted server parsing;
- idempotency token created for the submission, not supplied as authority.

Security and operating requirements:

- server-side validation and normalization;
- abuse protection, rate limiting and bot mitigation suitable for a public endpoint;
- duplicate prevention without revealing whether an email already exists;
- no browser-supplied organization authority and no `service_role` in client code;
- explicit consent timestamp, privacy-policy version and retention policy;
- audit-safe status without storing raw diagnostic data in logs;
- client-safe success, validation, throttled and unavailable outcomes;
- notification or CRM handoff must be asynchronous and idempotent.

Product status: the contact fields are visible after results, but submission is disabled and the UI
states that no data is sent or stored.
