# SESIRA Product Workflow Schema Requests

> Status: proposal only
> Prepared: 23 August 2026
> This document does not authorize or include a database migration.

## Decision rule

The existing schema should be used as-is unless a gap affects tenant isolation, deterministic workflow safety, idempotency or a field explicitly required for operational filtering/reporting. Flexible or derivable values stay in existing JSON/events until a proven query requires a column.

## P0 — tenant-safe assignments

### Current gap

- `requests.assigned_user_id`, `quotes.owner_user_id` and `attention_items.assigned_user_id` reference `auth.users(id)` only.
- A tenant member with update permission could technically assign a known user UUID that is not a member of the same organization.
- Application validation will reduce the risk but cannot replace database-enforced tenant integrity.

### Requested future change

Enforce each non-null assignment against `(organization_id, user_id)` in `organization_members`, and decide whether an inactive membership should invalidate an existing assignment or only block new assignments. The implementation should retain the existing nullable fields and generic roles.

### Acceptance criteria

- A user from organization A cannot be assigned to a request, quote or attention item in organization B.
- Server Actions query active organization members before mutation and do not accept organization IDs from FormData.
- The relevant composite keys and supporting indexes are verified in the migration and tests.

## P1 — first-class quote source

### Current gap

The product specification requires quote source in quote details and operational analysis. `quotes` has `external_provider` and `external_id`, but no generic `source`. Those values answer integration identity, not whether the quote originated from manual entry, CRM, import or request conversion.

### Requested future field

| Field | Proposed type | Proposed default | Notes |
|---|---|---|---|
| `quotes.source` | `text not null` | `MANUAL` | Constrain to the smallest source set shared with the product; keep provider identity separate |

The exact allowed values should be defined once in the application and mirrored by a PostgreSQL check constraint. Existing rows can safely backfill to `MANUAL` because there is no production customer data.

## P1 — explicit follow-up safety state

### Current gap

The specification requires follow-ups to stop on reply, won, lost, expired, opt-out, complaint and manual pause. Quote status represents the commercial lifecycle but does not safely preserve every automation stop reason. Encoding these only in `metadata` would make queue filters, guards and audits fragile.

### Requested future fields

| Field | Proposed type | Nullability | Purpose |
|---|---|---|---|
| `quotes.automation_paused_at` | `timestamptz` | nullable | Explicit human/system pause timestamp |
| `quotes.automation_pause_reason` | `text` | nullable | Stable reason code such as `MANUAL`, `COMPLAINT` or `REVIEW` |
| `quotes.opted_out_at` | `timestamptz` | nullable | Irreversible customer communication opt-out signal for workflow guards |

The normal terminal statuses and `expires_at` remain the source for won/lost/expired stops. Reply detection remains traceable through messages/events; a separate `replied_at` field should only be added if performance measurements prove it necessary.

### Required invariants

- No due follow-up may be emitted when the quote is paused, opted out, replied, won, lost or expired.
- Clearing a manual pause must be an explicit audited action; opt-out must not be cleared by a routine status change.
- The guard is enforced in the deterministic workflow service, not only by hiding UI controls.

## P1 — atomic request and quote lifecycle events

### Requests implementation status

The Requests module now resolves the creation half of this gap with the focused migration
`20260823163433_emit_request_created_event.sql`. It adds security-invoker triggers for
`request.created` and `request.status_changed`, so the request mutation and its timeline event
commit or fail together under the authenticated user's existing RLS permissions. No request
field or authorization policy was changed. Quote lifecycle events remain an open request for
the future Quotes module.

### Current gap

Customer and request insertion now have atomic domain event triggers. Quotes still have no equivalent event creation or controlled transition function. Separate quote/event inserts from a Server Action could leave an entity without its required timeline event.

### Requested future change

Reuse the existing security-invoker trigger pattern for creation events and use a constrained database function or equally atomic database mechanism for important status transitions. Initial events should remain within the existing vocabulary:

- `request.received`
- `request.processed`
- `request.qualified`
- `request.needs_info`
- `request.ready`
- `quote.created`
- `quote.sent`
- `quote.replied`
- `quote.won`
- `quote.lost`

No generic trigger should emit an event for every update. Events must represent meaningful domain transitions and include only non-sensitive structured context.

## P1 — event idempotency before external integrations

### Current gap

`events` is append-only but has no provider event identifier or idempotency key. Email and CRM providers retry deliveries; duplicate events could schedule duplicate follow-ups or attention items.

### Requested future option

Add a nullable idempotency key scoped by organization and event source, with a partial unique constraint for non-null values. The final names can follow the integration adapter vocabulary, for example:

- `events.idempotency_key text null`
- unique `(organization_id, source, idempotency_key)` where the key is not null

Internal user actions may omit the key. Provider webhook handlers must supply a stable provider delivery/event ID.

## P2 — typed and versioned request data

### Current gap

`requests.data` correctly provides sector-neutral flexibility, but there is no declared canonical shape. Unversioned JSON can accumulate incompatible keys across forms, imports and future extraction pipelines.

### Requested application contract first

Do not add sector-specific columns. Define a Zod-discriminated application payload with a small stable envelope, for example:

- `schema_version`
- `summary`
- `contact_preference`
- `location`
- `answers`
- `missing_fields`
- `raw_input` only when retention and privacy rules permit it

Validate writes and tolerate older versions on reads. Consider a database-level version field only after multiple schema versions coexist or JSON filtering becomes operationally important.

## P2 — lifecycle timestamps and reasons

The following fields may become useful but are not requested for the first implementation migration:

| Candidate | Initial source | Add a column only when |
|---|---|---|
| `requests.received_at` | `created_at` or inbound event time | imported requests need a source timestamp distinct from ingestion |
| `requests.closed_at` | transition event | SLA/reporting queries cannot efficiently derive it |
| `requests.lost_reason` | event payload or typed `data` | loss-reason filtering becomes a core report |
| `quotes.last_interaction_at` | messages/events | quote queues require it at measured scale |
| `quotes.followup_count` | automation runs/events | aggregate query cost is proven material |
| `quotes.lost_reason` | transition event/metadata | structured pipeline reporting is implemented |
| `quotes.crm_url` | provider adapter derived from external identity | a provider cannot produce a stable URL |

These are deliberately deferred to avoid duplicated state and update drift.

## Existing schema that should remain unchanged

- Request statuses and quote statuses already match the specification.
- `requests.data` and `quotes.metadata` remain JSONB extension points, not substitutes for query-critical fields.
- Tenant-safe composite relations from requests/quotes to customers, catalog items and originating requests are already correct.
- Existing list and foreign-key indexes cover the first product screens.
- RLS remains the authorization boundary; Server Actions continue to add explicit organization filters.
- `events.entity_type`/`entity_id` remains a deliberate polymorphic reference. Application writes must validate that the referenced entity belongs to the same organization.
- Organization roles remain `OWNER`, `ADMIN`, `MANAGER` and `MEMBER` for this workflow. Sector job titles are configuration/display concerns, not a reason to redesign authorization.

## Migration gate for the next phase

Before creating any migration:

1. map each accepted item to a concrete workflow invariant or required query;
2. inspect current live constraints and indexes again;
3. write forward-only SQL using the repository migration convention;
4. preserve RLS and grants and avoid privileged application secrets;
5. regenerate `src/types/database.ts` from the applied schema;
6. add tests for cross-tenant assignment rejection, quote stop guards, atomic events and webhook idempotency;
7. run the full `npm run verify` gate before commit and preview deployment.
