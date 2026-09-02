# SESIRA Commercial Core — Maturity Audit (C24)

Date: 2026-09-02
HEAD reviewed: `4ff4370` (C23)

## Scope audited

| Subsystem | Anchor commits | Files inspected |
|-----------|----------------|-----------------|
| Requests | C7, C16, C22 | `src/lib/requests/response.ts`, `20260914_speed_to_lead.sql` |
| Quotes | C0, C8, C18, C23 | `src/lib/opportunities/*`, `20260826120100_enforce_quote_state_machine.sql`, `20260911_opportunities_variants_options.sql`, `20260915_quote_drafting_and_reactivation.sql` |
| Opportunities | C18 | `src/lib/opportunities/actions.ts`, `20260911_*.sql` |
| Variants + revisions | C18 | quotes ALTER + partial unique |
| Follow-up scheduling | C0, C7 | `20260827080000_deterministic_followup_scheduling.sql`, `src/lib/followups/worker.ts` |
| Shadow execution | C5 | `src/lib/shadow/*` |
| Approval | C12 | `src/lib/approval/{stage,resolve,dispatch}.ts`, `20260908_*.sql` |
| Outbound email | C9 | `src/lib/email/{guard,provider,send}.ts`, `20260905_*.sql` |
| Inbound reply | C10 | `src/lib/email/webhook/{verify,parse-resend,ingest}.ts`, `20260906_*.sql` |
| AI classification | C11 | `src/lib/ai/{provider,classify-reply}.ts`, `20260907_*.sql` |
| Reply objections | C20 | `src/lib/objections/*`, `20260913_*.sql` |
| Attention | C6, C15 | `src/lib/attention/create.ts`, `src/lib/ops/actions.ts`, `20260902_*.sql`, `20260909_*.sql` |
| Prioritization | C20 | `src/lib/prioritization/staleness.ts` |
| Value policies | C19 | `src/lib/policies/value.ts`, `20260912_*.sql` |
| Sold-not-scheduled | C19 | `sold_not_scheduled_opportunities` RPC |
| Speed-to-lead | C22 | `src/lib/data/speed-to-lead.ts` |
| Reactivation | C23 | `src/lib/data/reactivation.ts`, `dormant_opportunities` RPC |
| Results | C13, C16 | `src/lib/data/{results,weekly-report,ops-summary}.ts` |
| Costs | C16 | `src/lib/data/costs.ts` |
| Incidents + recovery | C7, C15 | `src/lib/retry/{runner,incident}.ts`, `retry_failed_run_manual` |

## Invariants verified

### Tenancy + RLS

- Every new table since C18 (`opportunities`, `quote_options`, `imports`, `import_rows`, `outbound_messages`, `ai_runs`, `value_policies`, `reply_objections`) carries `alter table … enable row level security` + a `SELECT policy` scoped to `private.is_organization_member(organization_id)`.
- Every SECURITY DEFINER RPC re-imposes `is_organization_member` at the top, so a service_role or bypass path still fails on cross-tenant access.
- `provider_delivery_receipts` + `outbound_messages` + `reply_objections` mutations restricted to `service_role` where the write path lives outside a tenant session (webhooks, classifier).
- Verdict: **PASS**.

### State machines

- `quotes.status` trigger `private.enforce_quote_state_transition` (C0) — invoker-role short-circuits, enforced for authenticated writes. `mark_quote_replied` (C10) re-imposes valid transitions for service_role callers.
- `opportunities.commercial_state` trigger (C18) — same pattern. `transition_opportunity_state` re-imposes for service_role.
- `automation_runs.status` (C7) — `release_automation_run` and `retry_failed_run` guard transitions; `approve_automation_run_pending_approval` / `reject_*` (C12) enforce WAITING_FOR_APPROVAL → RUNNING/CANCELLED with membership check.
- Verdict: **PASS**.

### Idempotency + provider effects

- `outbound_messages.idempotency_key` (C9) unique per org, replay short-circuits before touching provider.
- `messages.idempotency_key` (C10) partial-unique per org, replay of a webhook resolves to the same row.
- `ai_runs.idempotency_key` (C11) partial-unique per org, prompt-version bump gets a new key.
- `record_provider_delivery` (C7) unique on (org, provider, provider_event_id).
- `outbound_messages_intent → mark_sent` transitions QUEUED → SENT once; a replay on SENT returns FALSE.
- Verdict: **PASS**.

### AI safety

- `replyClassificationSchema` (Zod) enforces intent enum, confidence range, summary length. `record_message_classification` refuses when the row is already classified.
- Objection classification (C20) → sensitive classes (PRICE / COMPLAINT / LEGAL / FINANCING_DECLINED) auto-emit Attention at the DB level, never bypassed by the TS layer.
- Quote drafting (C23) — `analyzeRequestForDraft` ALWAYS emits an `amount` gap; pricing is unconditionally a human decision.
- Every AI helper returns a discriminated union with FAILED / ERROR branches; the runner persists an ai_runs row for FAILED provider outcomes; nothing silently retries.
- Verdict: **PASS**.

### Recovery + operator control

- `retry_failed_run` (C7) atomic; `retry_failed_run_manual` (C15) audit-logged wrapper.
- `resolve_attention_item` / `dismiss_attention_item` / `arm_message_for_reclassification` / `resume_quote_automation` (C15) all audit-logged, membership-enforced.
- `dispatchApprovedFollowup` (C12) reads run, validates proposal, sends, releases run — every branch (SENT / REPLAY / FAILED / CANCELLED_INVALID_PROPOSAL / LEASE_LOST) writes a terminal state.
- Verdict: **PASS**.

### Sensitive escalation

- `REPLY_NEEDS_REVIEW` Attention on every inbound reply (C10 ingest).
- Objection classes PRICE / COMPLAINT / LEGAL / FINANCING_DECLINED emit an Attention at the DB level (C20).
- Approval flow (C12) requires ACTIVE membership on the approver.
- Verdict: **PASS**.

## Blockers scanned (per driver §1)

| Blocker class | Present? | Notes |
|---------------|----------|-------|
| Tenant leak | NO | Every RPC re-imposes membership. |
| Broken RLS | NO | Every new table carries RLS + SELECT policy scoped to `is_organization_member`. |
| Duplicate external effect | NO | `outbound_messages.idempotency_key` unique + `mark_sent` atomic. |
| Uncontrolled provider replay | NO | Webhook signatures verified (Svix); message dedup on `inbound:{provider}:{event_id}`. |
| Unbounded retries | NO | `retry_failed_run` respects attempt_count + PERMANENT classification stops retries. |
| Uncontrolled sensitive AI action | NO | AI never invents pricing / technical / regulatory (schema + doctrine test in `analyzeRequestForDraft`). |
| Exposed secret | NO | `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET` all `serverEnv` only; `server-only` at the top of every consumer. |
| Irreversible action without audit | NO | `record_audit_log` called on every ops action + approval decision + import. |
| Critical unrecoverable operational gap | NO | Every failure branch releases the automation_run + records the incident/error. |

## Verdict

**COMMERCIAL_CORE_MATURE** (technical maturity only).

## Real-world calibration

**REAL_WORLD_CALIBRATION = PENDING**.

- Thresholds not calibrated against real customer traffic: approval-rate windowSize=30 (arbitrary), staleness band cutoffs (30/60/61+), retry back-offs, AI confidence floor 0.5, reactivation dormantSinceDays default 60, speed-to-lead p90 rendering guidance.
- The evidence layer (C17) is instrumented; a future calibration pass consumes real client data.

## Commercial validation

**COMMERCIAL_VALIDATION = PENDING**. No client contracts, no revenue, no retention data to substantiate.

## Fixes not required

No fix commits triggered by this audit. Commit hash of maturity gate:
