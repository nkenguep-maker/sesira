# SESIRA — Current Product State

> Updated: 24 August 2026
> Branch: `codex/product-workflows`
> Verified code baseline: `c29c155401e3d6de4368bb225accbb42060b6634`

## Product available today

SESIRA has a working manual, multi-tenant product journey:

```text
Customer -> Request -> Quote -> Timeline -> Attention
```

Users can create customers, create requests for existing customers, create customer/request-linked
quotes, move Requests and Quotes through safe application-level status transitions, mark a quote as
sent, see unified business activity, create a manual quote-related attention item and resolve it.
Lists include filters, search, stable cursor pagination and distinct loading, empty, no-result,
error and not-found behavior. The Midnight Papyrus shell is responsive and client-facing language
is simple French.

## Technical state

- Next.js 16 App Router, React 19, TypeScript, Tailwind, Zod and Vitest.
- Supabase Auth/SSR, PostgreSQL, generated types and RLS.
- Server Components for reads and Server Actions for mutations.
- Tenant authority derives from authenticated `organization_members`; FormData never supplies
  trusted `organization_id`.
- Detail queries use UUID validation, explicit organization scoping and not-found semantics.
- Customer, Request and Quote creation/status events use existing security-invoker database
  triggers and feed one reusable business timeline.
- Attention is a polished human decision inbox backed by `attention_items`.
- Fictional demo seed covers two organizations without weakening isolation.
- External actions fail closed unless both `EXTERNAL_ACTIONS_ENABLED=true` and
  `VERCEL_ENV=production`; no external email is sent.

## Verification state

- 14 Vitest files / 59 tests at the last hardening baseline.
- Rollback-only offensive Supabase suite verifies anon denial, RLS, known-UUID tenant attacks,
  event isolation and exact creation/send events.
- Last hardening pass: lint, typecheck, tests and production build green; logged-out and mobile
  browser behavior verified; Supabase security advisor returned no findings.

## Not implemented yet

- Enforceable database-level Request/Quote state machines.
- Deterministic follow-up scheduler and worker execution.
- Shadow Mode execution records.
- Full external-event/form/attention idempotency and duplicate prevention.
- Workflow-generated attention, retries, incidents and reusable audit writer.
- Email/CRM integrations, reply classification or real external communication.
- Growth, AI workflows and V2/V3 modules.

The product layer is stable enough for Core Workflow engineering, but SESIRA is not yet ready for
automatic customer communication or commercial production use.

## Next engineering objective

Follow `docs/HANDOFF_CLAUDE.md`: implement deterministic Request/Quote state machines, safe
follow-up scheduling, Shadow Mode, idempotency, attention decisions, incidents, retries, audit
logging and offensive RLS tests. Preserve the current Customers/Requests/Quotes UI, application
shell, event architecture and tenant boundary.
