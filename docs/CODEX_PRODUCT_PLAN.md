# SESIRA Product Workflow Implementation Plan

> Prepared: 23 August 2026
> Branch: `codex/product-workflows`
> Scope: planning only; no feature or database change in this commit

## Sources reviewed

- the complete uploaded **SESIRA OS — Product & Engineering Specification v0.1** (the repository does not currently contain a file literally named `SESIRA_SPEC.md`);
- all files under `src/app`, the shared components and `src/lib` modules used by those routes;
- every migration and the current seed under `supabase`;
- the generated Supabase database types and the live read-only schema for the six requested tables;
- the current Vitest tests, CI workflow and `package.json`;
- `docs/architecture.md` and `SESIRA_OS_ETAT_IMPLEMENTATION.md`.

The implementation must extend the existing Next.js + Supabase application. It must not add a parallel API, ORM, state-management layer or alternative authorization model.

## Current state

### Product surface

- Authentication, organization bootstrap, protected `/app` routes and the Midnight Papyrus application shell are operational.
- `/app` reads real organization-scoped metrics from Supabase.
- `/app/customers`, `/app/customers/new` and `/app/customers/[customerId]` form the only complete product module. They provide server-side reads, filtering, cursor pagination, creation, related records and an event timeline.
- `/app/requests`, `/app/quotes` and `/app/attention` currently render reusable empty-state placeholders. There are no request or quote detail routes, creation routes or mutations.
- The database already contains generic multi-tenant tables for requests, quotes, messages, attention items, automation configuration/runs, AI runs, events and audit logs.
- External actions are disabled by default and require both production and an explicit feature flag. This remains the correct default while workflows are developed in shadow mode.
- The full Request → Quote → Follow-up → Reply → Attention workflow required by the specification is not implemented. The product is not commercially ready.

### Technical foundation

- Next.js 16 App Router, React 19, strict TypeScript, Tailwind CSS 4, Zod 4 and Vitest.
- Supabase Auth with SSR cookies, typed `supabase-js` clients and PostgreSQL RLS.
- `organization_id` is the tenant boundary. The server derives it from the authenticated user's active membership; it is never accepted from form input.
- Reads happen directly in async Server Components. UI mutations use Server Actions. Route Handlers are reserved for future webhooks or external APIs.
- Existing public tables have RLS, tenant policies and indexes for their primary query paths.
- Tests currently cover customer input validation and the external-action kill switch only. There are no request, quote, Server Action, RLS or end-to-end workflow tests.

## Existing reusable patterns

### Supabase and tenant isolation

- `src/lib/supabase/server.ts`: one cookie-aware typed server client per request.
- `src/lib/supabase/client.ts`: typed browser client for the few client-side flows that require it.
- `src/lib/auth/viewer.ts`: cached viewer lookup from verified Supabase claims, active organization membership and organization record.
- Every product query applies an explicit `.eq("organization_id", organizationId)` in addition to RLS.
- Queries project exact columns, use `maybeSingle()` for optional detail records and run independent reads with `Promise.all`.
- UUID route parameters are validated before querying; missing or cross-tenant records resolve to `notFound()`.

### Server Actions

- Action modules begin with `"use server"`.
- FormData is parsed with a shared Zod schema and returns a small serializable action state.
- Organization and user identifiers come from `getViewerContext()`, not from the browser.
- Mutations use the authenticated Supabase client, return explicit user-safe errors, revalidate affected paths and redirect only after the mutation block.
- Client forms use `useActionState`, visible pending states and disabled submit controls.
- The customer creation trigger is the existing pattern for writing a domain event in the same database transaction.

### UI and product language

- Server Components remain the default; Client Components are limited to interaction-heavy forms and navigation.
- Pages use the existing dark Midnight Papyrus tokens from `globals.css`, a `max-w-7xl` content area, compact cyan eyebrows, strong page titles, muted supporting copy and rounded bordered panels.
- Violet is the primary action color; cyan, emerald and amber communicate operational state.
- Existing list patterns include summary cards, server-side search/filtering, status badges, responsive rows, cursor pagination and distinct initial-empty versus no-results states.
- Existing detail patterns include an identity header, metrics, related-record panels, contact/context panels and a chronological event timeline.
- Customer-facing product labels remain concise French even when code identifiers and engineering documentation are English.

## Existing `requests` schema

| Field | Type | Null/default | Purpose |
|---|---|---|---|
| `id` | `uuid` | required, generated | Primary key |
| `organization_id` | `uuid` | required | Tenant boundary |
| `customer_id` | `uuid` | nullable | Tenant-safe relation to `customers` |
| `service_catalog_item_id` | `uuid` | nullable | Tenant-safe relation to the generic service catalog |
| `title` | `text` | required | Human-readable request title |
| `source` | `text` | required, `MANUAL` | Website/email/social/manual/CRM/growth source |
| `status` | `text` | required, `NEW` | `NEW`, `PROCESSING`, `NEEDS_INFO`, `QUALIFIED`, `READY`, `ASSIGNED`, `CLOSED`, `SPAM` or `LOST` |
| `qualification_score` | `numeric` | nullable | Score constrained from 0 to 100 |
| `assigned_user_id` | `uuid` | nullable | User assignment |
| `external_id` | `text` | nullable | Identifier in an external system |
| `external_provider` | `text` | nullable | External system name |
| `data` | `jsonb` | required, `{}` | Sector-neutral intake, extracted and qualification data |
| `created_at` | `timestamptz` | required, now | Creation timestamp |
| `updated_at` | `timestamptz` | required, now | Last update timestamp |

The current indexes support organization/status/date lists and customer, service and assignee lookups. RLS permits tenant members to read, insert and update; only `OWNER` and `ADMIN` may delete.

## Existing `quotes` schema

| Field | Type | Null/default | Purpose |
|---|---|---|---|
| `id` | `uuid` | required, generated | Primary key |
| `organization_id` | `uuid` | required | Tenant boundary |
| `customer_id` | `uuid` | required | Tenant-safe relation to `customers` |
| `request_id` | `uuid` | nullable | Tenant-safe relation to the originating request |
| `reference` | `text` | nullable | Human/external quote reference |
| `title` | `text` | required | Human-readable quote title |
| `amount` | `numeric` | nullable | Non-negative quote amount |
| `currency` | `text` | required, `EUR` | Three-character currency code |
| `status` | `text` | required, `DRAFT` | `DRAFT`, `SENT`, `FOLLOWING_UP`, `REPLIED`, `NEEDS_HUMAN`, `WON`, `LOST` or `EXPIRED` |
| `owner_user_id` | `uuid` | nullable | Commercial owner |
| `sent_at` | `timestamptz` | nullable | Time first sent |
| `expires_at` | `timestamptz` | nullable | Quote expiration |
| `next_action_at` | `timestamptz` | nullable | Next operational action |
| `external_id` | `text` | nullable | Identifier in CRM/quote system |
| `external_provider` | `text` | nullable | External system name |
| `metadata` | `jsonb` | required, `{}` | Non-core integration metadata |
| `created_at` | `timestamptz` | required, now | Creation timestamp |
| `updated_at` | `timestamptz` | required, now | Last update timestamp |

The current indexes support organization/status/next-action queues, customer/request/owner lookups and unique external identities. RLS uses the same tenant-member and privileged-delete model as requests.

## Missing fields and constraints that may become necessary

No migration is created in this planning step. The detailed requests are recorded in `docs/SCHEMA_REQUESTS.md`.

The only likely pre-workflow schema changes are:

1. enforce that request assignees, quote owners and attention assignees are active members of the same organization;
2. add a first-class quote `source`, because the specification requires it and it will be filtered/reported;
3. model explicit quote automation pause/opt-out state so a follow-up cannot resume accidentally;
4. add idempotency support before accepting duplicate-prone webhook or provider events;
5. emit request/quote lifecycle events atomically, following the existing `customer.created` trigger pattern.

Useful but deferrable values such as request intake time, lifecycle transition times, loss reasons, latest interaction and follow-up count can initially be derived from existing timestamps, statuses, messages and events. They should not be duplicated until a concrete query or reporting requirement justifies them. Structured sector-specific request attributes remain in `requests.data`, behind a versioned application schema.

## Routes to build

| Route | Change | Responsibility |
|---|---|---|
| `/app/requests` | Replace placeholder | Organization-scoped list, counts, search, status/source filters and cursor pagination |
| `/app/requests/new` | Add | Manual request intake linked to an existing or newly created customer |
| `/app/requests/[requestId]` | Add | Request context, qualification, assignment, related quote and event timeline |
| `/app/quotes` | Replace placeholder | Operational quote queue with status, owner, aging and next-action filters |
| `/app/quotes/new` | Add | Minimal manual quote creation, normally prefilled from a request |
| `/app/quotes/[quoteId]` | Add | Quote details, message/follow-up history, next action, controls and traceability |
| `/app/attention` | Replace placeholder | Human-decision queue with priority, reason, entity link and resolution actions |
| `/app/customers/[customerId]` | Extend | Add links and accurate summaries for newly implemented request/quote records |
| `/app` | Extend last | Surface the completed workflow metrics and actionable queue links |

No internal REST routes are planned. Future provider callbacks belong under narrowly scoped Route Handlers such as `/api/webhooks/...`, only when an integration is selected and signature verification is defined.

## Implementation order

Each visual slice should be complete, verified, committed and preview-deployed before the next one, in line with the project delivery convention.

1. **Schema decision gate.** Convert only accepted P0/P1 items from `SCHEMA_REQUESTS.md` into a focused future migration; regenerate database types and add RLS/integrity tests. No schema work occurs in this documentation commit.
2. **Shared request domain.** Add status/source constants, Zod input schemas, typed `requests.data` versioning and formatting helpers with unit tests.
3. **Requests list.** Implement the real server-rendered queue with loading, empty, filtered-empty and error behavior using the customer list conventions.
4. **Request creation and detail.** Add the Server Action, form, customer/service selection, assignment validation, qualification display and atomic event timeline.
5. **Shared quote domain.** Add status/transition rules, money/date formatting, stop-condition helpers and tests before UI mutations.
6. **Quotes list, creation and detail.** Build the quote queue, create-from-request flow, details, status actions and traceability.
7. **Attention workflow.** Replace the placeholder with a human-decision queue and audited resolve/dismiss actions linked back to requests or quotes.
8. **Deterministic shadow workflow.** Calculate due follow-ups and reply stop conditions without sending external messages; record proposed actions and attention items.
9. **End-to-end hardening.** Add RLS tests, Server Action/integration tests, browser tests for the complete flagship story, responsive/accessibility checks and failure-state coverage.
10. **Commercial-readiness review.** Only after the flagship workflow, security, observability, backups, environment separation and controlled external-action rehearsal pass should SESIRA be described as commercializable.

## Known risks

- **Canonical specification is not versioned.** `SESIRA_SPEC.md` is absent from the repository, so future engineering sessions could lose the product source of truth.
- **Membership selection is implicit.** `getViewerContext()` takes the first active membership; multi-organization switching is not yet modeled.
- **Assignment integrity is incomplete.** Current foreign keys point to `auth.users`, not an active membership in the row's organization.
- **Quote stop conditions are not first-class.** A status alone cannot safely distinguish a temporary pause, explicit opt-out or complaint hold.
- **Events lack provider idempotency.** Retries from email/CRM webhooks could create duplicate domain events or actions.
- **Request JSON can drift.** `requests.data` is flexible but currently has no application-level version discriminator or typed canonical shape.
- **Request/quote event writes are not implemented.** Writing an entity and its event in separate application calls would create partial histories on failure.
- **Test depth is low.** There are no automated RLS, workflow integration or browser tests, and no request/quote fixtures in the current seed.
- **Data environments are shared.** Local, preview and production currently target one Supabase project; they must be separated before real customer data or commercial use.
- **No Git remote exists.** Local commits cannot yet trigger the expected remote CI and preview deployment workflow.

## Files likely to be modified during implementation

Existing files:

- `src/app/app/requests/page.tsx`
- `src/app/app/quotes/page.tsx`
- `src/app/app/attention/page.tsx`
- `src/app/app/customers/[customerId]/page.tsx`
- `src/app/app/page.tsx`
- `src/components/app-navigation.tsx`
- `src/types/database.ts` after any approved migration
- `supabase/seed.sql`

Likely new files:

- `src/app/app/requests/actions.ts`
- `src/app/app/requests/new/page.tsx`
- `src/app/app/requests/[requestId]/page.tsx`
- `src/components/requests/*`
- `src/lib/requests/*`
- `src/app/app/quotes/actions.ts`
- `src/app/app/quotes/new/page.tsx`
- `src/app/app/quotes/[quoteId]/page.tsx`
- `src/components/quotes/*`
- `src/lib/quotes/*`
- `src/app/app/attention/actions.ts`
- `src/components/attention/*`
- `src/lib/attention/*`
- colocated `loading.tsx`, `error.tsx` and focused `*.test.ts` files for the new modules
- a new timestamped file under `supabase/migrations/` only after schema changes are approved for a later step

## Definition of ready for implementation

- The current architecture remains unchanged: Server Components for reads, Server Actions for UI mutations, Supabase RLS for tenant isolation and PostgreSQL events/audit for traceability.
- The first implementation slice is Requests, not automation or AI.
- Deterministic status transitions and stop rules are defined before any model-assisted interpretation.
- No external message can be sent until the shadow workflow is complete and the existing kill switch is deliberately enabled in a production-only release.
