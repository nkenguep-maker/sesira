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

## Internal Control Center contracts

The Product foundation owns the read-only routes `/control`, `/control/organizations`,
`/control/runs`, `/control/ai-runs`, `/control/incidents` and `/control/integrations`. It defines a
strict read boundary in `src/lib/control-center/contracts.ts`, but it does not query tenant tables
directly. The production adapter intentionally returns `CORE_DATA_NOT_CONFIGURED` for every method.

All Control Center routes currently behave as not found, including for authenticated organization
owners and administrators. Organization membership is tenant authority only and must never grant
cross-organization operator access.

### `getInternalControlAccess()` — P0 — REQUESTED

Owner: Claude Core / Security.

Purpose: establish a server-verified Sesira operator identity before any Control Center data is read.

Requirements:

- use a Core-owned internal identity and permission model distinct from `organization_members`;
- deny by default and verify authorization on every server request;
- require MFA and recent authentication for sensitive operational scopes;
- define session freshness, revocation, offboarding and emergency access procedures;
- audit successful and denied access with operator identity, purpose and request correlation;
- never trust browser input, `user_metadata`, an email allowlist or a tenant role;
- never expose a privileged database credential or `service_role` to Product/browser code;
- grant read scopes separately from any future operational action scope.

Expected Product-compatible result:

```text
AUTHORIZED { operatorId }
UNAVAILABLE { reason: CORE_ACCESS_NOT_CONFIGURED }
DENIED
```

Product status: `getControlAccess()` always returns `UNAVAILABLE`. The layout calls `notFound()` and
every page obtains its repository through `getAuthorizedControlCenterRepository()`. This explicit
page-level gate prevents a repository read even if Next.js renders a layout and its page
concurrently.

### Control Center read repository — P0 — REQUESTED

Owner: Claude Core.

Methods expected by Product:

```text
getOverview()
listOrganizations()
listRuns()
listAiRuns()
listIncidents()
listIntegrations()
```

The TypeScript boundary is `ControlCenterRepository` in
`src/lib/control-center/contracts.ts`. Every result must include a generated-at timestamp or an
explicit unavailable state.

Cross-cutting requirements:

- require a valid internal operator scope before querying any organization;
- perform cross-tenant reads only in a dedicated trusted server boundary, never in the browser;
- paginate list results and bound all time windows;
- provide stable identifiers, deterministic ordering and client-safe status enums;
- redact secrets, credentials, tokens, provider payloads, prompts, model input/output and raw errors;
- return only client-safe incident and integration explanations;
- audit operator, query scope, filters, result count and correlation identifier;
- rate-limit bulk reads and prevent unrestricted exports;
- preserve tenant RLS for ordinary application traffic; do not weaken existing policies;
- provide partial/unavailable field semantics instead of fabricated values.

Required data by method:

- `getOverview`: organization count, aggregate automation health, deduplicated success rate, open
  incident count, AI cost and infrastructure cost with period and currency;
- `listOrganizations`: organization name, sector, enabled module labels, aggregate health,
  integration summary and open incident count;
- `listRuns`: organization label, automation label, normalized status, start time and duration;
- `listAiRuns`: organization label, feature, model label, normalized confidence, latency, cost,
  status and date — never raw inputs or outputs;
- `listIncidents`: organization label, severity, category, normalized status, client-safe title and
  timestamps;
- `listIntegrations`: organization label, provider, health, last sync, expiry and a client-safe
  problem — never `credentials_reference`, raw configuration or provider errors.

### Metric definitions and cost provenance — P1 — REQUESTED

Owner: Claude Core / FinOps.

Before overview values become available, define:

- which terminal automation statuses enter the success-rate denominator;
- retry and idempotency rules so duplicate attempts do not distort the rate;
- treatment of running, cancelled and Shadow Mode runs;
- AI cost source, currency, tax treatment and model-price effective date;
- infrastructure cost source, allocation method, currency and time period;
- freshness and reconciliation rules for late-arriving data.

Product status: no percentage or cost is shown while these definitions and adapters are missing.
The UI contains no secret viewer, impersonation control or production override.

## SESIRA Growth contracts

The Product foundation owns `/app/marketing`, `/app/marketing/ideas`,
`/app/marketing/content` and `/app/marketing/publications`. Its read boundary is
`GrowthRepository` in `src/lib/growth/contracts.ts`.

The current adapter is deliberately `DEMO` only. It uses the authenticated server-side viewer to
label “Votre entreprise”, performs no Growth database read or write and exposes no method capable
of generating, scheduling or publishing content. Every example is presented as fictional demo
content, including items whose example status is `Planifié` or `Publié`.

### Growth tenant data model and read repository — P0 — REQUESTED

Owner: Claude Core.

Purpose: persist organization knowledge, ideas, content and publication records behind the existing
Product contracts.

Expected read methods:

```text
getSummary()
getOrganizationKnowledge()
listIdeas()
listContent()
listPublications()
```

Requirements:

- derive `organization_id` from authenticated membership, never browser input;
- preserve RLS and enforce organization scope for every record and relationship;
- use stable identifiers and cursor pagination for lists;
- record source, creator, timestamps and current lifecycle status;
- distinguish demo, manually authored and genuinely generated content;
- support the canonical content states `IDEA`, `DRAFT`, `REVIEW`, `APPROVED`, `SCHEDULED`,
  `PUBLISHED` without allowing arbitrary transitions;
- store channels as canonical values (`LINKEDIN`, `FACEBOOK`, `INSTAGRAM`,
  `GOOGLE_BUSINESS`, `EMAIL`) rather than client-facing labels;
- return explicit empty, partial and unavailable states;
- never expose provider credentials, access tokens or raw webhook payloads.

No schema migration was created by Product. Core should propose the smallest tenant-safe schema and
offensive RLS tests before replacing the demo adapter.

### `getOrganizationKnowledge()` / `updateOrganizationKnowledge(input)` — P0 — REQUESTED

Owner: Claude Core.

Purpose: manage the approved context displayed as “Votre entreprise”.

Required fields may include services, locations, tone, certifications, differentiators, approved
claims, prohibited claims, common questions and common objections.

Requirements:

- field-level validation and bounded text/list sizes;
- explicit verification state for certifications and commercial claims;
- role-compatible edit permission, versioning and audit logging;
- no unverified claim may become approved merely because it appears in generated text;
- deterministic snapshot/version reference on any future content generation run.

Product status: organization knowledge is read-only demo content. Certifications explicitly say
“À confirmer par votre équipe”.

### Content lifecycle mutations — P0 — REQUESTED

Owner: Claude Core.

Expected capabilities:

```text
createIdea(input)
createDraft(input)
submitContentForReview(contentId)
approveContent(contentId, version)
requestContentChanges(contentId, version, reason)
```

Requirements:

- server-side validation and authorization for every transition;
- immutable or versioned approved content;
- optimistic concurrency protection so stale reviews cannot overwrite newer edits;
- actor, previous/new status and content-version audit records;
- idempotency for repeated submissions;
- approval remains human and cannot be inferred from AI confidence or draft creation.

Product status: no create, edit or approval control is connected.

### `generateGrowthDraft(input)` — P1 — REQUESTED

Owner: Claude Core AI layer.

Purpose: generate an optional draft only after the real AI execution architecture is available.

Requirements:

- create a real `ai_runs` record with model, prompt version, latency, cost and status;
- reference an immutable organization-knowledge version;
- validate output and keep it in `DRAFT` until explicit human review;
- retain provenance and distinguish generated text from manual text;
- never claim generation occurred when no successful run exists.

Product status: there is no AI generation action or generated output in Growth.

### `scheduleGrowthPublication(input)` — P0 — REQUESTED

Owner: Claude Core.

Purpose: place an approved, versioned content item into a deterministic publication schedule.

Requirements:

- require `APPROVED` content and an enabled, healthy tenant integration;
- validate organization timezone, channel capability and publication time server-side;
- use a stable idempotency key and prevent duplicate channel/date/content schedules;
- preserve the exact approved content version;
- support cancellation and rescheduling with audit history;
- report scheduling separately from actual provider delivery.

Product status: calendar entries are demo records only; no scheduler or background job exists.

### `publishGrowthContent(scheduleId)` and provider callbacks — P0 — REQUESTED

Owner: Claude Core / Integrations.

Purpose: perform and reconcile a real publication only after explicit product scheduling.

Requirements:

- respect the global external-action kill switch and tenant capability policy;
- execute server-side with encrypted provider credentials that never reach Product code;
- use idempotency, bounded retries, duplicate prevention, incidents and audit logging;
- verify provider callbacks/webhooks and retain client-safe delivery status;
- mark content `PUBLISHED` only after a confirmed provider result;
- never convert Shadow Mode, a queued job or a failed attempt into a published result.

Product status: no social API, webhook, worker, scheduler or real publication is implemented.

### Growth conversation and attribution link — P1 — REQUESTED

Owner: Claude Core.

Purpose: later connect real publication conversations to the existing
Customer → Request → Quote → Result journey without creating a second CRM.

Requirements include deterministic source attribution, tenant-safe customer/request linkage,
consent and retention rules, duplicate prevention, human attention for ambiguous matches and clear
separation between observed and estimated results.

Product status: conversations and Growth results are outside this foundation and no marketing
attribution is fabricated.
