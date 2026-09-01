# SESIRA Core Workflow — Claude Baseline

> Prepared: 26 August 2026
> Author: Claude Core Workflow Engineer
> Purpose: freeze the environment, code and schema baseline before implementing the P0 Core
> Workflow layer.

This document records only what is verifiable today. It does not modify application behavior,
schema or remote infrastructure.

## 1. Git

| Field | Value |
|---|---|
| Working branch | `claude/core-workflows` |
| Base branch | `codex/product-workflows` |
| HEAD (both) | `07dcb00b6922fdc44446199071a58c2cf5960aeb` |
| HEAD subject | `refactor: restore premium midnight papyrus landing` (2026-08-25) |
| Local `main` | 3 commits, historical only, does not contain product journey |
| Remotes | none configured locally (`git remote -v` empty) |

`claude/core-workflows` was created from the current tip of `codex/product-workflows`. Codex has
committed 14 commits beyond the handoff base `c29c155` referenced in `SESIRA_SPEC.md` and
`docs/HANDOFF_CLAUDE.md`; per operating instructions the actual `HEAD` is authoritative:

```text
07dcb00 refactor: restore premium midnight papyrus landing
89f2aa0 feat: simplify sesira value and roi
1f0015f feat: redesign sesira public website
7c23b9d feat: build sesira public website
b3f2a4b fix: complete pre-core product qa
8063991 refactor: consolidate sesira design system
56c9b64 feat: add growth product foundation
4917a68 feat: add control center frontend foundation
d1d1ef1 feat: build premium public diagnostic
7f181d5 feat: complete organization settings
a133e93 feat: complete automations product experience
70e440c feat: implement results experience
479b31e docs: add master product specification
ddce845 docs: prepare core workflow handoff
c29c155 test: harden core product workflows   <-- documented handoff base
```

### Working-tree observations

- `.codex-recovery/timeline-20260823/` is untracked (Codex crash-recovery snapshot). Not touched.
- `refs/heads/main 2` is a broken loose ref (`git branch -a` warning). Not touched.
- `next build` regenerated `next-env.d.ts` and `tsconfig.json` in place — these are Next-owned
  files, not part of this baseline change, and are left unstaged.

## 2. Supabase target

| Field | Expected | Verified in repo |
|---|---|---|
| Project name | `sesira-os` | matches |
| Project ref | `ubfqffhvomaxcwgerwmr` | matches (URL host in `.env.local`) |
| Region | `eu-central-1` | not independently verified without CLI link |

- `.env.local` and `.env.development.local` both reference
  `https://ubfqffhvomaxcwgerwmr.supabase.co`.
- Env keys used by application code: `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (both safe on the client). No
  `SUPABASE_SERVICE_ROLE_KEY` present, no `service_role` reference in application code (the only
  hit is a negative assertion in a UI test).
- Supabase CLI (`node_modules/.bin/supabase`, v2.115.0) is available; `~/.supabase/access-token`
  is absent and `supabase/.temp/project-ref` is absent, so **no active project link exists** at
  the CLI layer. `supabase status` errors on missing Docker/Podman.
- **BLOCKED_EXTERNAL_CREDENTIAL** — remote schema inspection (applied migrations, live policies,
  live grants, live indexes, Security Advisor) requires either an admin/service_role connection,
  a `supabase link` with an access token, or Docker for a local `supabase start`. None are
  currently available to me. Remote schema is not modified; local migration files are treated as
  the source of truth below.

## 3. Vercel target

Verified via `.vercel/project.json`:

```json
{"projectId":"prj_FSe1mx64X3Hi2UJN41LhVyR484CL","orgId":"team_6ZiRYhxncKVWrpQVApm3SV1V","projectName":"sesira-os"}
```

All three fields match the expected `yema/sesira-os` project. No deploy attempted.

## 4. Local verification results

### `npm ci`
`added 473 packages, and audited 474 packages in 37s` — one deprecation warning for
`eslint@9.39.5`, zero vulnerabilities. Node runtime `v24.15.0` (matches `engines.node` = `24.x`).

### `npm run verify` (lint → typecheck → test → build)
```text
Test Files  42 passed (42)
Tests       130 passed (130)
Duration    4.59s

Next.js 16.3.2 (webpack)
✓ Compiled successfully in 19.1s
✓ TypeScript ready
✓ Generating static pages (7/7) in 168ms
31 routes (Static + Dynamic + Proxy middleware) produced
```

Exit code 0. Lint, typecheck, all 130 tests and the production build are green.

The current documented count (`docs/CURRENT_STATE.md` §Verification state) is 14 test files / 59
tests. The gate has grown to 42 files / 130 tests since the handoff base; this reflects the
Codex product work committed above the handoff commit (Growth, Control Center, Diagnostic,
Results, Settings, Automations product surfaces).

### Rollback-only offensive Supabase RLS suite
`supabase/tests/core_product_rls.sql` requires an administrative Postgres connection (creates
`auth.users` rows, sets `set local role authenticated` and drives cross-tenant probes, all inside
`BEGIN … ROLLBACK`). It is not executable in the current environment:

- no `postgres://` / service-role URL exposed to me,
- no `supabase link` on the repository,
- no Docker or Podman on the host for `supabase start`.

**BLOCKED_EXTERNAL_CREDENTIAL.** Task deferred to the next step where the operator provides
either a scoped admin DB URL for a rollback-only run, or Docker/Supabase CLI access to a
migrated local database. No mitigation attempted (introducing `service_role` into application
code is explicitly forbidden).

## 5. Preserved / do-not-touch surfaces (verified present)

Confirmed by directory inspection of `src/app/`, `src/lib/` and `src/components/`:

- Customers, Requests, Quotes UI (`src/app/app/{customers,requests,quotes}/**`).
- Attention inbox and manual actions (`src/app/app/attention/**`, `src/lib/attention/`).
- Unified business timeline (`src/lib/events/` + `src/components/sesira/`).
- Midnight Papyrus shell (`src/app/app/layout.tsx`, design tokens).
- Server Components / Server Actions architecture, no ORM, no second API layer.
- Existing RLS + `private.*` helper functions in migration
  `20260823115600_initial_multi_tenant_foundation.sql`.
- Existing security-invoker event triggers on `customers`, `requests`, `quotes` in migrations
  `20260823125831`, `20260823165256`, `20260823180507`.
- `assertExternalActionsEnabled()` kill switch in `src/lib/automation/external-actions.ts`.
- `src/proxy.ts` (Next 16 convention for `src/` layout — validated against
  `~/.claude/rules/nextjs-16-breaking.md`).
- `src/lib/supabase/{server,client,proxy}.ts` clients built on `@supabase/ssr` v0.12.4 and only
  use `NEXT_PUBLIC_*` env keys.

## 6. Applied migrations (local `supabase/migrations/`)

```text
20260823115600_initial_multi_tenant_foundation.sql
20260823115710_add_foreign_key_indexes.sql
20260823115916_bootstrap_new_user_organization.sql
20260823124508_add_customer_event_trigger.sql
20260823125831_make_customer_event_trigger_security_invoker.sql
20260823165256_emit_request_created_event.sql
20260823180507_emit_quote_events.sql
```

Foundation observations relevant to Core Workflow:

- All 16 exposed tables enable RLS. `anon` has been revoked from all tables in `public`.
- `authenticated` currently holds `select, insert, update, delete` on `requests`, `quotes`,
  `attention_items`, `automation_runs` and `automation_configs` (via `OWNER/ADMIN` policies for
  the last two). This is the direct-write surface Core state machines must constrain.
- Composite `unique (id, organization_id)` on `service_catalog_items`, `customers`, `requests`,
  `quotes`, `automation_configs`, `events` already prevents cross-tenant FK re-linking.
- `automation_runs` has `unique (organization_id, idempotency_key)` and can reference
  `automation_configs` and triggering `events` via `(id, organization_id)` composite FKs.
- Assignment columns (`requests.assigned_user_id`, `quotes.owner_user_id`,
  `attention_items.assigned_user_id`) currently reference only `auth.users(id)`, not
  `organization_members` — cross-tenant assignment via a known UUID is not prevented at the DB
  boundary (P0 gap).
- Quote follow-up "pause / opt-out" is not first-class state (no
  `automation_paused_at` / `opted_out_at`).
- `automation_runs` has no `scheduled_for` / `next_attempt_at` / lease columns for worker
  claims.
- `events` has no provider delivery idempotency key.
- `incidents` has no `deduplication_key` / fingerprint / recurrence field.
- `attention_items` has no `automation_run_id` provenance link.
- `quotes` has no first-class `source` (only `external_provider`/`external_id`).

Event vocabulary emitted by current triggers:
`customer.created`, `request.created`, `request.status_changed`, `quote.created`, `quote.sent`,
`quote.replied`, `quote.won`, `quote.lost`, `quote.status_changed`. Timeline understands
additional compatible names (`customer.updated`, `request.received/processed/qualified/needs_info/ready`,
`message.received/sent`) but they are not yet emitted.

## 7. Current P0 gaps (verified against `docs/SCHEMA_REQUESTS.md` P0 list)

1. **Enforceable Request/Quote transition graphs.** Application maps in
   `src/lib/{requests,quotes}/schema.ts` define legal edges. The DB `check` constraints only
   validate that status values are in the allowed set. Any authenticated tenant member can bypass
   the application maps via a direct Data API `update`. `ASSIGNED` is a legal status but the
   application graph never enters it (`READY → ASSIGNED` missing). `quotes.sent_at` is written
   only by the Server Action; a direct SQL `update` to `status = 'SENT'` will emit `quote.sent`
   without setting `sent_at`.
2. **Tenant-safe assignments.** `requests.assigned_user_id` / `quotes.owner_user_id` /
   `attention_items.assigned_user_id` accept any `auth.users.id`, including a user who belongs
   only to a different organization.
3. **Follow-up safety state.** No `automation_paused_at` / `automation_pause_reason` /
   `opted_out_at` on `quotes`. Pause/opt-out has to be inferred from mutable JSON metadata.
4. **Deterministic scheduling / worker leases.** `automation_runs` has no due timestamp, no
   `next_attempt_at`, no lock. Two workers could claim the same due decision.
5. **Durable idempotency beyond `automation_runs`.** `events` has no provider delivery key,
   product creation has no bounded replay key, generated attention has no dedup key.

## 8. Migrations likely required (order-of-magnitude)

Each is forward-only, RLS-preserving, security-invoker where a helper is added. Numbers are
placeholders — exact stamps assigned at implementation.

| # | Migration | Addresses |
|---|---|---|
| 1 | `enforce_request_state_machine.sql` — private transition helper + `BEFORE UPDATE OF status` trigger on `requests`, compare-and-set check, ASSIGNED edge (`READY → ASSIGNED`), terminal protection | P0 §22 / §7.1 |
| 2 | `enforce_quote_state_machine.sql` — mirror for `quotes`, ensures `sent_at` is set only on real `→ SENT`, protects terminals, blocks direct writes that bypass the graph | P0 §22 / §7.1 |
| 3 | `tenant_safe_assignments.sql` — composite `(organization_id, assigned_user_id)` / `(organization_id, owner_user_id)` FKs to `organization_members(organization_id, user_id)` (generated column or check helper), offensive tests | P0 §23 / §7.2 |
| 4 | `quote_followup_safety_state.sql` — add `automation_paused_at`, `automation_pause_reason` (constrained), `opted_out_at`, index for pending scheduler, guard trigger preventing routine transitions from clearing opt-out | P0 §24 / §7.3 |
| 5 | `automation_run_scheduling.sql` — add `scheduled_for`, `next_attempt_at`, `locked_at`, `lock_expires_at` (or lease token equivalent), supporting composite index for due-queue | P0 §25 / §7.4 |
| 6 | `event_provider_idempotency.sql` — add provider delivery uniqueness for external events, keep append-only grants intact | P0 §26 / §7.5 |
| 7 | `attention_workflow_provenance.sql` — add optional tenant-safe `automation_run_id` on `attention_items` with dedup key (P1, but folded early because it drops out of §7 naturally) | P1 §18 |

`src/types/database.ts` regenerated after each migration.
`supabase/tests/core_product_rls.sql` extended with offensive assertions for every migration
(cross-tenant Data API attempts, illegal edges, terminal blocks, concurrent CAS, replay).

## 9. Implementation order

The order below is chosen so each step lands on top of an already-safer schema and so tests
compound rather than regress:

1. **Preflight (this document).** Baseline verified, tests green.
2. **State machines — Requests + Quotes** (`Migration 1` + `Migration 2`). Close the ASSIGNED
   gap. Compare-and-set + terminal protection at DB boundary. Direct-tenant-API bypass rejected.
   Event-once invariant re-tested.
3. **Tenant-safe assignments** (`Migration 3`). Cross-tenant assignment offensive tests.
4. **Follow-up safety state** (`Migration 4`). Pause / opt-out become queryable and stable.
5. **Automation-run scheduling + leases** (`Migration 5`). Worker claim safety, retry timing.
6. **Provider event / product / attention idempotency** (`Migration 6`, then Attention dedup key
   with `Migration 7`).
7. **Shadow Mode + Attention creation from workflow decisions.** No new schema — reuses
   `automation_runs` + `attention_items` + `events`.
8. **Retry classification + incident deduplication.** (Incident dedup key is a follow-up P1
   migration once §7 stabilises.)
9. **Audit writer reuse.** Append-only writes into existing `audit_logs`.

Real communications, email adapters, AI classification and the external-action kill switch stay
**off** through this entire block, per §21 and §45 of `SESIRA_SPEC.md`.

## 10. Known risks

- **Remote schema drift.** Without CLI link / admin access, I cannot confirm that every local
  migration has been applied to `ubfqffhvomaxcwgerwmr`, or that no ad-hoc changes exist beyond
  local migrations. Mitigation: before pushing any new migration, request a schema diff /
  `supabase db diff` from an authorised operator; do not use `db reset` or destructive commands.
- **Broken loose ref `refs/heads/main 2`.** Cosmetic; `git branch -a` warns but does not fail.
  Untouched. Can be cleaned only by an explicit user request.
- **`.codex-recovery/` snapshot.** Untracked leftover from a Codex crash recovery. Untouched.
- **`next-env.d.ts` / `tsconfig.json` auto-writes.** Next 16 rewrites these during `next build`.
  Left unstaged; will not be included in commits from this branch unless a subsequent Product
  change intentionally captures them.
- **Test suite documentation lag.** `docs/CURRENT_STATE.md` still says 14 files / 59 tests; the
  actual gate is 42 / 130 (Codex work above handoff base). Not fixed here — this baseline
  documents the fact rather than editing Codex-owned copy.
- **`SESIRA_SPEC.md` verified baseline hash is stale** (`c29c155…` vs actual tip `07dcb00…`).
  Handoff documentation not modified here; downstream Core work will follow the actual HEAD.

## 11. Ready state

- Environment: green.
- Codebase: unchanged.
- Schema: unchanged.
- Remote: untouched.
- Next objective: enforce canonical Request/Quote state machines at the database boundary
  (§9 step 2 above), then progress through the P0 backlog in order.
