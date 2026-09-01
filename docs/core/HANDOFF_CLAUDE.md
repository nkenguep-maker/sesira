# SESIRA Core Workflow — Claude Code Handoff

> Prepared: 24 August 2026
> Branch: `codex/product-workflows`
> Handoff base commit: `c29c155401e3d6de4368bb225accbb42060b6634` (`test: harden core product workflows`)
> Expected handoff commit message: `docs: prepare core workflow handoff`

This is an engineering handoff, not permission to redesign SESIRA. Start by running
`git branch --show-current` and `git log -1 --oneline`, then read `SESIRA_SPEC.md` first, followed by
this document, `docs/CURRENT_STATE.md`, `docs/SCHEMA_REQUESTS.md`, the migrations and the existing
domain code. `SESIRA_SPEC.md` version 2.0 is the principal product source of truth; this handoff
describes the verified implementation beneath it.

## 1. Current architecture

- Next.js 16 App Router, React 19, strict TypeScript, Tailwind CSS 4, Zod 4 and Vitest.
- Supabase Auth, PostgreSQL and RLS through typed `@supabase/ssr`/`supabase-js` clients.
- Async Server Components perform reads directly from Supabase. UI mutations use Server Actions.
- There is no ORM, parallel REST API, client state store or second workflow/event system.
- `src/lib/auth/viewer.ts` resolves verified claims, the first active membership and its
  organization. The organization ID is derived on the server and never accepted as browser
  authority.
- Product queries add an explicit `organization_id` predicate in addition to RLS.
- UUID detail routes validate IDs before querying. Missing and cross-tenant resources behave as
  not found.
- Domain input/transition contracts live in `src/lib/{customers,requests,quotes,attention}`.
- PostgreSQL security-invoker triggers append business events atomically. Shared timeline loading
  and formatting live in `src/lib/events` and `src/components/sesira`.
- The UI follows the existing Midnight Papyrus shell and plain French product language.
- External integrations, email delivery, AI classification and production automation are not
  implemented.

## 2. Current branch and commit

- Work only on `codex/product-workflows`, never directly on `main`.
- The verified code baseline before this documentation handoff is
  `c29c155401e3d6de4368bb225accbb42060b6634`.
- The handoff documentation itself is the next commit with message
  `docs: prepare core workflow handoff`; use the current `HEAD` shown by Git as the authoritative
  handoff commit.

## 3. Current routes

| Route | Current responsibility |
|---|---|
| `/` | Public SESIRA landing page |
| `/login` | Supabase sign-in and account creation |
| `/auth/confirm` | Auth confirmation Route Handler |
| `/app` | Tenant dashboard with live product metrics and external-action state |
| `/app/customers` | Customer list, search, filters and stable cursor pagination |
| `/app/customers/new` | Manual customer creation |
| `/app/customers/[customerId]` | Customer context, related requests/quotes and unified timeline |
| `/app/requests` | Request list, counts, search, status/source filters and pagination |
| `/app/requests/new` | Manual request creation linked to an existing customer |
| `/app/requests/[requestId]` | Request details, safe manual status changes, related quote activity |
| `/app/quotes` | Quote list, commercial/date filters and pagination |
| `/app/quotes/new` | Manual quote creation linked to a customer and optional request |
| `/app/quotes/[quoteId]` | Quote details, status changes, timeline and manual attention action |
| `/app/attention` | Open/resolved human-decision inbox and resolution actions |
| `/app/attention/new` | Manual quote-related attention creation |
| `/app/automations` | Presentational business-level automation page; no engine yet |
| `/app/settings` | Current settings surface |
| `/dev/customers` | Fictional visual preview; deliberately returns 404 in production |

`/app` and `/control` prefixes are protected by `src/proxy.ts` and
`src/lib/supabase/proxy.ts`. There is no `/control` product route yet.

## 4. Workflow-relevant database tables

Workflow tables use UUIDs and an `organization_id` tenant key, have RLS enabled and are typed in
`src/types/database.ts`. `organizations` is the boundary itself, while `profiles` is protected
through membership-sharing policies rather than carrying an organization column.

| Table | Existing role in the system |
|---|---|
| `organizations` | Tenant boundary, configuration and feature flags |
| `organization_members` | User-to-tenant membership, generic role and active status |
| `profiles` | User display identity, protected through shared-organization RLS |
| `service_catalog_items` | Generic organization-scoped request/service vocabulary |
| `customers` | Customer identity and external provider identity |
| `requests` | Customer need, source, status, qualification, assignment and versionable `data` JSONB |
| `quotes` | Customer/request relation, amount, status, owner, sent/expiry/next-action dates and metadata |
| `messages` | Future inbound/outbound communication records linked tenant-safely to customer/request/quote |
| `attention_items` | Human decision inbox with category, priority, reason, explanation, suggested action and due/resolution dates |
| `integrations` | Provider connection metadata; credentials remain indirect through `credentials_reference` |
| `automation_configs` | Organization-specific workflow template, version, enabled state, mode and JSON config |
| `automation_runs` | Idempotent workflow execution record, trigger event, attempt count, summaries and result state |
| `ai_runs` | Append-oriented model invocation trace; currently unused by product flows |
| `events` | Append-oriented domain event log used by the unified timeline |
| `incidents` | Tenant-scoped operational failures and resolution state |
| `audit_logs` | Append-only business/security audit trail |

The composite foreign keys already prevent a request or quote from linking a customer/request from
another organization. Assignment columns still reference `auth.users` alone; see P0 schema gaps.

## 5. Existing event system

`events` contains `organization_id`, `type`, optional polymorphic `entity_type`/`entity_id`,
`source`, JSONB `payload` and `created_at`. Do not create another activity table.

- Creation/status triggers are PostgreSQL `SECURITY INVOKER` functions in the `private` schema.
- Trigger functions have execution revoked from public roles and write through the caller's RLS.
- Entity mutation and event insertion commit or fail together.
- `loadBusinessTimeline()` scopes every query by organization and entity IDs, resolves only actors
  who belong to the organization, then `buildBusinessTimeline()` applies a second organization and
  scope filter before producing client-facing French items.
- Unknown compatible event types fall back to `Activité enregistrée`; raw event names are not shown
  to customers.

### Event names emitted by current migrations

- `customer.created`
- `request.created`
- `request.status_changed`
- `quote.created`
- `quote.sent`
- `quote.replied`
- `quote.won`
- `quote.lost`
- `quote.status_changed`

`quote.sent` is emitted only when the stored status actually changes to `SENT`.

### Compatible names already understood by the timeline but not currently emitted

- `customer.updated`
- `request.received`
- `request.processed`
- `request.qualified`
- `request.needs_info`
- `request.ready`
- `message.received`
- `message.sent`

Add future workflow events to the existing vocabulary and architecture. Do not emit an event that
describes an action that did not happen; Shadow Mode must record a proposed/shadow decision, never
`quote.followup_sent`.

## 6. Existing attention system

`attention_items` supports priorities `LOW`, `NORMAL`, `HIGH`, `URGENT` and statuses `OPEN`,
`IN_PROGRESS`, `RESOLVED`, `DISMISSED`. The inbox displays open/resolved items, explanation,
suggested action, due date, assignee and related customer/request/quote.

Current mutations are manual:

- `createManualQuoteAttentionAction()` verifies the quote in the active organization, derives
  `organization_id`, creates an `OPEN` item and links it polymorphically to the quote.
- `closeAttentionItemAction()` resolves or dismisses only an open/in-progress tenant-owned item and
  uses a compare-and-set status predicate to reject concurrent duplicate decisions.
- No AI, email or automation creates attention items yet.
- There are no `attention.created`/`attention.resolved` triggers or workflow-run provenance fields.
  Workflow-generated attention must be deterministic, deduplicated and auditable.

## 7. Existing automation tables

`automation_configs` already provides:

- unique `(organization_id, template_key)`;
- `template_version`;
- `enabled`, default `false`;
- levels `OBSERVATION`, `SHADOW`, `APPROVAL`, `AUTOMATIC`;
- JSONB `config`.

`automation_runs` already provides:

- unique `(organization_id, idempotency_key)`;
- statuses `PENDING`, `RUNNING`, `SUCCEEDED`, `FAILED`, `CANCELLED`,
  `WAITING_FOR_APPROVAL`;
- tenant-safe links to `automation_configs` and triggering `events`;
- `attempt_count`, input/output summaries, error and start/completion timestamps.

Reuse these tables. They are foundations, not a complete scheduler: there is no due-time/retry-time
queue field or worker lease yet.

## 8. Existing AI runs table

`ai_runs` stores feature/entity context, provider, model, prompt version, sanitized input summary,
structured output, confidence, proposed action, latency, token/cost metrics, status
(`SUCCEEDED`, `FAILED`, `REJECTED`), error and creation time. Authenticated users have tenant-scoped
select/insert only. It is intentionally unused today and the demo seed does not pretend AI ran.

Core state transitions, scheduling, stop rules, retries and duplicate prevention must remain
deterministic. Do not introduce AI into the next objective.

## 9. Existing incidents table

`incidents` supports severities `P1`–`P4`, statuses `OPEN`, `INVESTIGATING`, `RESOLVED`, `IGNORED`,
category, title, description, polymorphic entity link and `resolved_at`. It is tenant-scoped and
indexed by organization/status/severity/date. No incident service or automatic failure escalation
exists yet.

## 10. Existing audit logs

`audit_logs` contains `actor_type`, optional `actor_id`, `action`, optional polymorphic entity link,
JSONB metadata and `created_at`. Authenticated tenant members have select/insert only; there is no
update/delete grant. It is documented as append-only. No reusable audit writer is implemented yet.

Never place credentials, raw message bodies or unnecessary personal data in audit metadata.

## 11. Exact Request statuses currently used

```text
NEW
PROCESSING
NEEDS_INFO
QUALIFIED
READY
ASSIGNED
CLOSED
SPAM
LOST
```

The existing application transition map is in `src/lib/requests/schema.ts`. It currently permits:

```text
NEW -> PROCESSING | NEEDS_INFO | QUALIFIED | SPAM | LOST
PROCESSING -> NEEDS_INFO | QUALIFIED | SPAM | LOST
NEEDS_INFO -> PROCESSING | QUALIFIED | LOST
QUALIFIED -> READY | NEEDS_INFO | LOST
READY -> CLOSED | LOST
ASSIGNED -> CLOSED | LOST
CLOSED | SPAM | LOST -> terminal
```

Important gap: no current transition enters `ASSIGNED`, although the database accepts that status.
The database check constraint validates membership in the status set but does not enforce this
transition graph.

## 12. Exact Quote statuses currently used

```text
DRAFT
SENT
FOLLOWING_UP
REPLIED
NEEDS_HUMAN
WON
LOST
EXPIRED
```

The existing application transition map is in `src/lib/quotes/schema.ts`:

```text
DRAFT -> SENT | WON | LOST
SENT -> FOLLOWING_UP | REPLIED | NEEDS_HUMAN | WON | LOST | EXPIRED
FOLLOWING_UP -> REPLIED | NEEDS_HUMAN | WON | LOST | EXPIRED
REPLIED -> NEEDS_HUMAN | WON | LOST | EXPIRED
NEEDS_HUMAN -> REPLIED | WON | LOST | EXPIRED
WON | LOST | EXPIRED -> terminal
```

The manual Server Action sets `sent_at` on the first transition to `SENT` and uses an optimistic
old-status predicate. Direct tenant-authorized table updates can still bypass the application
graph; that is a P0 workflow-integrity issue.

## 13. Schema limitations discovered

The authoritative prioritized backlog is `docs/SCHEMA_REQUESTS.md`. The immediate constraints are:

- P0: transition graphs are application-only and `ASSIGNED` is unreachable;
- P0: assignments are not database-constrained to an active member of the same organization;
- P0: follow-up pause, opt-out and stop reason are not first-class state;
- P0: workflow scheduling/retry leasing is not represented in `automation_runs`;
- P0: `automation_runs` has run idempotency, but external events, product creations and generated
  attention items still lack durable replay/duplicate keys;
- P1: quote source is not first-class;
- P1: incidents lack a deduplication fingerprint/occurrence tracking;
- P1: workflow-generated attention lacks a tenant-safe run reference;
- P2: request JSON needs a richer versioned contract and lifecycle/reporting fields remain derived.

Do not solve these by weakening RLS, adding a second workflow store or duplicating mutable state in
JSONB. Any migration must be focused, forward-only, tested and followed by regenerated database
types.

## 14. Tests already available

The JavaScript/TypeScript suite currently has 14 test files and 59 tests covering:

- customer, request, quote and attention validation;
- permitted and forbidden manual status transitions;
- invalid email, UUID, status, amount and date cases;
- external-action kill-switch behavior;
- unified timeline organization/scope filtering, ordering, multiple events and unknown fallback;
- attention sorting, relation mapping, empty/multiple-item rendering and decisions;
- complete manual Customer → Request → Quote → Timeline → Attention domain journey;
- empty/no-result/responsive list contracts, long customer names and large quote amounts;
- stable composite pagination cursors;
- route-protection policy;
- multi-tenant fictional seed contract.

`supabase/tests/core_product_rls.sql` is an offensive integration suite run through an
administrative connection inside `BEGIN … ROLLBACK`. It verifies RLS remains enabled, anon has no
customer table access, tenant A cannot read/update tenant B resources by known UUID, timelines are
isolated and core events are emitted exactly once. It leaves no fixtures behind.

There is no persistent browser E2E harness or automated worker/concurrency suite yet. The last
hardening pass manually verified logged-out redirects, a 390×844 viewport, production 404 for the
dev preview and a clean browser console.

Run the complete local gate with:

```bash
npm run verify
```

## 15. Tenant isolation architecture

- Supabase Auth claims establish the user identity.
- `organization_members` establishes tenant membership; `organization_id` is never trusted from
  FormData or URL query parameters.
- RLS is enabled on every exposed business table. Tenant policies call private membership helpers.
- Application reads and mutations also explicitly filter by the active organization.
- Composite `(id, organization_id)` relations protect customer/request/quote/message links.
- Profiles are visible only to the user or users who share an organization.
- Unknown and unauthorized detail UUIDs intentionally have the same not-found behavior.
- No application code uses `service_role`.
- `anon` has all public-table privileges revoked.

Known limitation: `getViewerContext()` takes the first active membership and does not implement an
organization switcher. Do not silently invent switching behavior during workflow work.

## 16. External action kill switch

`src/lib/automation/external-actions.ts` fails closed. An external side effect is allowed only when
both conditions are true:

```text
EXTERNAL_ACTIONS_ENABLED=true
VERCEL_ENV=production
```

`.env.example` defaults `EXTERNAL_ACTIONS_ENABLED=false`. Preview and development stay disabled
even if the flag is accidentally set to true. Every future external adapter must call
`assertExternalActionsEnabled()` immediately before the side effect. Shadow Mode must never pass
this guard or send email.

## 17. What Claude must NOT rewrite

- Do not rebuild Customers.
- Do not rebuild the Requests UI.
- Do not rebuild the Quotes UI.
- Do not redesign the application shell or Midnight Papyrus visual system.
- Do not create a second event/activity/timeline architecture.
- Do not replace Supabase RLS with application-only authorization.
- Do not introduce an ORM, separate API layer or generic visual workflow builder.
- Do not replace Server Components/Server Actions without a proven platform requirement.
- Do not add Growth yet.
- Do not add AI classification yet.
- Do not add email integrations yet.
- Do not send real external emails.
- Do not enable the external-action kill switch.
- Do not store `service_role` in application code.
- Do not trust client-supplied organization IDs.
- Do not perform a broad database redesign.
- Do not change status vocabulary casually; migrate and test any accepted contract change.
- Do not delete or rewrite existing migrations.

## CLAUDE NEXT OBJECTIVE

Implement the Core Workflow layer on top of the existing product and schema foundations:

- Request state machine;
- Quote state machine;
- deterministic follow-up scheduling;
- Shadow Mode;
- idempotency;
- duplicate prevention;
- attention creation from workflow decisions;
- incidents;
- retries;
- audit logging;
- offensive RLS tests.

### Required execution order

1. Re-run the current tests and the rollback-only RLS suite before changing behavior.
2. Define one reusable, deterministic transition contract for Request and Quote. Close the
   `ASSIGNED` gap and prevent direct invalid transitions at the database boundary without bypassing
   RLS.
3. Implement only the accepted P0 schema changes from `docs/SCHEMA_REQUESTS.md`; regenerate
   `src/types/database.ts` and add rollback-safe cross-tenant/concurrency tests.
4. Reuse `automation_configs`, `automation_runs` and `events` for scheduling and execution. Use
   compare-and-set claims or leases so two workers cannot perform the same decision.
5. Implement organization-specific deterministic follow-up dates (initial default J+3, J+7,
   J+14) and all stop guards: replied, won, lost, expired, opt-out, complaint and pause.
6. In Shadow Mode, persist what Sesira would have done, with no external action and no false
   `*.sent` event.
7. Create attention items only for explicit deterministic exceptions/approval decisions. Link and
   deduplicate them against their workflow run/entity.
8. Classify failures as transient/permanent. Retry only transient failures with bounded backoff;
   repeated exhaustion creates a deduplicated incident.
9. Append audit records for state transitions, workflow claims/outcomes, attention decisions,
   retries and incident resolution. Keep metadata minimal and non-sensitive.
10. Add offensive tests for cross-tenant reads/writes, forged organization IDs, cross-tenant
    assignments, illegal transitions, duplicate deliveries, concurrent claims and retry replay.
11. Finish with `npm run verify`; do not proceed to real communications.

### Exit condition for the next objective

- state machines have one tested source of truth and cannot be bypassed through normal tenant API
  privileges;
- identical inputs cannot create duplicate runs, attention items or effects;
- due follow-ups are deterministic and stop safely;
- Shadow Mode records proposed actions without external side effects;
- retry exhaustion creates a visible incident;
- important decisions are traceable in existing events/audit tables;
- RLS remains intact and offensive multi-tenant tests pass;
- Customers, existing product UIs and the application shell remain unchanged except for minimal
  integration hooks strictly required to expose workflow state.
