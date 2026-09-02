# SESIRA Commercial Core — Maturity Audit C24

Date: 2026-09-03
HEAD reviewed before audit commit: `d21afbc90cfdf1ad4f0322770f8a3478185c1b60` C23/U23

## Scope

C24 is an audit gate. It does not add a new commercial feature.

The review covers Requests, Quotes, Opportunities, variants and revisions, deterministic follow up scheduling, Shadow execution, human approval, outbound email, inbound reply ingestion, AI classification, objections, Attention, prioritization, value policies, sold not scheduled, Speed to Lead, reactivation candidates, results, costs, incidents, retry and operator recovery.

The verdict below describes the technical maturity of the repository and its enforced contracts. It is not a claim that SESIRA has already been calibrated on customer traffic, commercially validated, or promoted safely to production.

## Invariants reviewed

### Tenant isolation and authorization

The base product tables use organization scoped foreign keys and RLS. C18 adds RLS to `opportunities` and `quote_options` with `private.is_organization_member(organization_id)`. Security definer RPCs that mutate commercial objects re impose organization membership before writing.

The workflow idempotency correction uses the JWT role claim `(select auth.role()) = 'service_role'` instead of `pg_has_role(session_user, 'service_role', 'MEMBER')`, avoiding the known Supabase authenticator membership trap.

C22 adds fields and RPCs on existing tenant scoped Requests and Organizations. Its public functions verify membership or an explicit OWNER, ADMIN or MANAGER role according to the operation.

C23 adds fields on the already tenant scoped Quotes table. `record_quote_draft_gaps`, `get_quote_draft_readiness` and `dormant_opportunities` re impose membership on the target organization.

Verdict: **PASS at repository contract level**.

### State machines and irreversible transitions

Request, Quote, Attention and Opportunity state transitions have database guards. C23 strengthens Quote readiness further: `DRAFT -> SENT` is refused if no deterministic draft analysis has been recorded or unresolved draft gaps remain.

The C23 analyzer does not invent price. Its deterministic output always leaves pricing as a human owned gap until a human resolves the commercial value.

Reactivation is read only. It does not change opportunity state and does not create an outbound message.

Verdict: **PASS**.

### External effects and idempotency

Outbound email has one guarded boundary. `assertGuardedEmailAllowed` runs before provider access and requires both `EXTERNAL_ACTIONS_ENABLED=true` and `VERCEL_ENV=production`.

Before the provider is called, SESIRA records an outbound message intent under a stable idempotency key. A replay returns the existing message row and does not call the provider again. Provider success or failure is persisted explicitly.

Provider delivery receipts use a unique organization, provider and provider event identity. Webhook ingestion verifies a Svix style HMAC with `timingSafeEqual`, rejects missing signatures and rejects timestamps outside a five minute acceptance window.

Verdict: **PASS**.

### Retry, failure and recovery

The retry runner distinguishes transient and permanent failure classes. Only transient failures can be retried, and only while `canAttemptAgain` permits another bounded attempt. Exhausted retries and permanent failures create or update a deduplicated incident and release the workflow run from its lease.

The approved follow up dispatcher validates the stored proposal, requires the expected worker lease, uses the guarded outbound boundary and resolves the automation run through explicit SENT, REPLAY, FAILED, invalid proposal or lease lost outcomes.

Verdict: **PASS**.

### AI and sensitive commercial decisions

Reply classification is schema constrained and idempotently recorded. A classification below the configured confidence floor creates `LOW_AI_CONFIDENCE` Attention and explicitly states that no automatic treatment may depend on it.

Sensitive commercial content creates `OBJECTION_NEEDS_REVIEW`. Price, complaint, legal and financing related situations remain under human control.

C23 quote drafting is deterministic and requires human pricing. It does not generate discounts, technical diagnosis, regulatory claims, warranty terms or delivery promises as authoritative values.

Verdict: **PASS**.

### Speed to Lead honesty

C22 records the first observed internal handling of a Request. The stored measurement is `FIRST_INTERNAL_HANDLING`. It does not claim a customer response was sent.

The target is owned by each organization. SESIRA does not hard code a universal sector benchmark. Future due Attention remains hidden until its due time under the existing Attention read contract.

Verdict: **PASS**.

### Reactivation safety

C23 returns dormant opportunities as candidates for human review only. Terminal opportunities are excluded. Any related quote with opt out or complaint pause excludes the opportunity, and an open commercial objection of type complaint also excludes it.

The current U23 sixty day window is a working threshold, not a validated benchmark.

Verdict: **PASS with calibration pending**.

## Blocker scan

| Blocker class | Repository audit |
| --- | --- |
| Tenant leak introduced through C22/C23 | Not found |
| Broken RLS on new C18 commercial tables | Not found |
| Duplicate external email effect | Guarded by durable idempotency |
| Uncontrolled provider replay | Not found |
| Unbounded retries | Not found |
| Sensitive AI action without human escalation | Not found |
| Quote sent with unresolved C23 draft gaps | Blocked in database trigger |
| Autonomous reactivation | Not present |
| Speed to Lead falsely presented as customer response time | Not present |
| Production send enabled in preview or development | Blocked by guard |

No new P0 or P1 blocker was identified by this repository audit.

## Verification evidence

The exact C23 head `d21afbc90cfdf1ad4f0322770f8a3478185c1b60` passed the canonical GitHub Actions verify pipeline with lint, TypeScript, 67 test files, 441 tests and a successful Next.js production build.

C24 adds a structural maturity regression suite that re checks the critical contracts above against the repository source. C24 itself is not PASS until that new suite and the full canonical verify succeed on the final C24 head.

Important limitation: the current GitHub verify pipeline does not execute a fresh migration against the live Supabase project or rerun the rollback SQL RLS suite against production data. Repository and TypeScript maturity therefore do not equal live database parity certification.

## Verdict

**COMMERCIAL_CORE_MATURE**

This verdict means technical commercial core maturity at the repository contract level through C23/U23. It does not mean calibrated, commercially proven or production promoted.

**REAL_WORLD_CALIBRATION = PENDING**

Thresholds still requiring real traffic calibration include AI confidence thresholds, retry timing, commercial staleness windows, reactivation timing and organization specific Speed to Lead targets.

**COMMERCIAL_VALIDATION = PENDING**

No conclusion about willingness to pay, conversion lift, retention, recovered revenue or customer ROI is supported by this technical audit alone.

**LIVE_DATABASE_PARITY = PENDING**

Before production promotion, migration parity and offensive SQL tenancy assertions must be revalidated against the intended Supabase environment.

**PRODUCTION_PROMOTION = LOCKED**

C24 does not authorize a production promotion or external action enablement. Promotion requires a separate explicit gate after database parity, environment review and product acceptance.
