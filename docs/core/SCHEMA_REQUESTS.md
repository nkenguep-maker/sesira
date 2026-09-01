# SESIRA Product Workflow Schema Requests

> Status: prioritized backend requirements
> Prepared: 23 August 2026
> Reprioritized: 24 August 2026

## Decision rule

Use the existing schema unless a gap affects tenant isolation, transition integrity, deterministic
workflow safety, idempotency or an operational query required by Core Workflow. Do not duplicate
derivable state. Do not weaken RLS. Flexible metadata stays in JSONB only when it does not need an
index, constraint, join or durable invariant.

Priority means:

- **P0** — required before Core Workflow can safely progress beyond local Shadow Mode;
- **P1** — required for traceability or operational quality before controlled production actions;
- **P2** — useful later and deliberately deferred until a measured query/reporting need exists.

## P0 — canonical and enforceable Request/Quote state machines

### Current gap

The database constrains status values but not status transitions. Current transition maps live in
`src/lib/requests/schema.ts` and `src/lib/quotes/schema.ts`; a tenant member with direct Data API
access can bypass those maps because authenticated members currently have table update grants.
Triggers would record that invalid transition rather than reject it.

`ASSIGNED` is a valid Request status but no current application transition enters it.
`quote.sent_at` is set by the manual Server Action, but a direct update can store `SENT` without the
same invariant.

### Required outcome

- Define one canonical transition graph per entity and explicitly decide the intended path into
  `ASSIGNED`.
- Enforce transitions and required side effects atomically at the database boundary using the
  smallest mechanism compatible with existing Server Actions and RLS.
- Preserve existing status names unless an explicit migration decision says otherwise.
- Use compare-and-set semantics so concurrent transitions cannot both succeed.
- Keep creation/status events atomic and emit an event only for a real stored transition.
- Add tests for every legal edge, illegal edge, terminal status, stale expected status and direct
  tenant API attempt.

## P0 — tenant-safe assignments

### Current gap

`requests.assigned_user_id`, `quotes.owner_user_id` and `attention_items.assigned_user_id` reference
`auth.users(id)` only. Application validation checks active membership in some flows, but the
database can still accept a known user UUID from another tenant.

### Required outcome

- Enforce every non-null assignment against `(organization_id, user_id)` in
  `organization_members`.
- Decide and document whether suspension prevents only new assignments or also invalidates stored
  assignments.
- Retain the existing nullable assignment columns and generic organization roles.
- Add offensive tests proving tenant A cannot assign a tenant B user by UUID.

## P0 — explicit follow-up safety state

### Current gap

Quote status alone cannot distinguish temporary pause, explicit opt-out, complaint hold or manual
review. These conditions must be queryable and must not depend only on mutable JSON metadata.

### Candidate fields

| Field | Type | Purpose |
|---|---|---|
| `quotes.automation_paused_at` | nullable `timestamptz` | Explicit workflow pause |
| `quotes.automation_pause_reason` | nullable constrained `text` | Stable reason such as `MANUAL`, `COMPLAINT`, `REVIEW` |
| `quotes.opted_out_at` | nullable `timestamptz` | Durable communication opt-out |

### Required invariants

- No follow-up decision is due when a quote is paused, opted out, replied, won, lost or expired.
- Complaint handling pauses external follow-up and creates a human decision.
- Clearing a pause is explicit and audited; routine status changes cannot clear opt-out.
- Shadow Mode evaluates the same guards as future production execution.

## P0 — deterministic scheduling, worker claims and retries

### Current gap

`quotes.next_action_at` can represent a business date and `automation_runs` stores status,
`attempt_count`, start/completion timestamps and a unique run idempotency key. It does not yet expose
a queryable due/retry time or a worker lease. Multiple workers need a safe claim boundary, and
transient retries need a deterministic next-attempt time.

### Candidate extension to `automation_runs`

- `scheduled_for timestamptz` or an equivalently explicit due timestamp;
- `next_attempt_at timestamptz` for bounded transient retries;
- `locked_at timestamptz` and `lock_expires_at timestamptz` (or an equivalent lease token);
- supporting organization/status/due index.

The implementation may use a smaller equivalent design if it proves concurrent safety with SQL
tests. Do not introduce a second jobs/runs table without demonstrating that the existing table
cannot satisfy the invariant.

### Acceptance criteria

- Two workers cannot claim the same due decision.
- Crashed work becomes recoverable after a bounded lease.
- Permanent errors are not retried.
- Transient retries use bounded backoff and preserve the original idempotency identity.
- Exhaustion creates one incident, not one incident per retry poll.

## P0 — durable idempotency and duplicate prevention

### Existing support

`automation_runs` already has unique `(organization_id, idempotency_key)`. Preserve and use it for
workflow execution identity.

### Remaining gaps

- `events` has no provider/delivery idempotency key.
- Customer, Request, Quote and manual Attention creation disable repeated browser submission while
  pending but cannot prevent a replay after a timeout or proxy/browser retry.
- Workflow-generated attention items have no durable decision/deduplication key.

### Required outcome

- External/provider events use a stable provider delivery ID with uniqueness scoped by
  organization and source.
- Product creation uses an opaque bounded replay key scoped by organization and operation; failed
  validation does not consume it.
- Workflow decisions derive deterministic run/effect keys from stable inputs and workflow version.
- Generated attention items have one stable deduplication key per decision/entity.
- A replay returns or observes the original result and emits no duplicate event, attention item,
  retry or future external effect.
- Never deduplicate on mutable customer data such as email, title or amount.

## P1 — workflow provenance for attention items

### Current gap

`attention_items.entity_type/entity_id` links the business subject but there is no tenant-safe link
to the workflow run that requested human judgment.

### Requested future change

Add an optional tenant-safe relation from a generated attention item to its `automation_run`, or an
equivalent constrained provenance mechanism. Manual attention items remain valid with a null run.
The same design should carry the P0 deduplication key without creating a second attention system.

## P1 — incident deduplication and recurrence

### Current gap

`incidents` can represent severity, state and an entity, but repeated workflow failures can create
many equivalent open incidents and there is no queryable recurrence/last-seen signal.

### Candidate extension

- nullable `deduplication_key`/`fingerprint`, unique for active incidents within an organization;
- `first_seen_at`, `last_seen_at` and/or `occurrence_count` if operational UI requires them;
- optional tenant-safe `automation_run_id` only if entity linkage cannot provide enough provenance.

Prefer the smallest version that proves one repeated failure family produces one actionable open
incident and preserves audit history.

## P1 — first-class quote source

### Current gap

`quotes.external_provider` and `external_id` identify an integration but do not describe whether a
quote came from manual entry, CRM, import or request conversion.

| Field | Proposed type | Proposed default |
|---|---|---|
| `quotes.source` | constrained `text not null` | `MANUAL` |

Define the values once in application code and mirror them in a database check constraint. Keep
provider identity separate.

## P1 — external transition/event boundary

Core customer/request/quote events are now atomic through security-invoker triggers. Before provider
callbacks are accepted, add one idempotent organization-aware boundary that validates the referenced
entity, applies a permitted transition, records the provider identity and emits the existing event
in one transaction. Do not implement a generic trigger that emits an event for every update.

## P2 — typed and versioned request data

`requests.data` currently stores `{ schema_version: 1, description? }` and tolerates extra keys. Keep
sector-neutral flexibility, but define a richer Zod-discriminated envelope before automated intake:

- `schema_version`;
- `summary`;
- `contact_preference`;
- `location`;
- `answers`;
- `missing_fields`;
- `raw_input` only when retention/privacy rules allow it.

Add a database version field only when multiple active versions or indexed JSON queries make it
necessary.

## P2 — lifecycle timestamps and reporting fields

| Candidate | Derive from today | Add a column only when |
|---|---|---|
| `requests.received_at` | `created_at`/event time | imports need source time distinct from ingestion |
| `requests.closed_at` | transition event | SLA queries cannot derive it efficiently |
| `requests.lost_reason` | event payload/typed `data` | loss filtering becomes a core report |
| `quotes.last_interaction_at` | messages/events | operational queues require measured performance |
| `quotes.followup_count` | automation runs/events | aggregate cost is proven material |
| `quotes.lost_reason` | transition event/metadata | structured reporting is implemented |
| `quotes.crm_url` | external provider identity | an adapter cannot derive a stable URL |

Do not add these speculatively.

## Implemented foundations — do not reopen without evidence

- Request statuses and Quote statuses already match the product specification.
- `customer.created`, `request.created`, `request.status_changed`, `quote.created` and quote status
  events commit atomically through the existing security-invoker trigger pattern.
- `quote.sent` occurs only on a real transition to `SENT`.
- `automation_runs` already provides organization-scoped run idempotency.
- Tenant-safe composite relations protect request/quote/message links to customer/request/catalog
  entities.
- Existing list and foreign-key indexes support current product screens.
- RLS is the authorization boundary; Server Actions also use explicit organization filters.
- `events.entity_type/entity_id` is deliberately polymorphic. Do not replace it with a second event
  model.
- `events`, `ai_runs` and `audit_logs` are append-oriented through select/insert-only grants.
- Organization roles remain `OWNER`, `ADMIN`, `MANAGER`, `MEMBER` for this phase.

## Migration gate

Before creating any migration:

1. map the change to one P0/P1 invariant above;
2. inspect live constraints, policies, grants and indexes;
3. create focused forward-only SQL using the repository migration convention;
4. preserve RLS, avoid `service_role` and prefer security-invoker code;
5. regenerate `src/types/database.ts` from the applied schema;
6. extend `supabase/tests/core_product_rls.sql` with rollback-safe offensive assertions;
7. test direct Data API attempts, concurrency, replay and cross-tenant UUIDs;
8. run Supabase security advisors and `npm run verify` before commit.
