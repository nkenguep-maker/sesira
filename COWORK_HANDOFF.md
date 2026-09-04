# SESIRA — Autonomous Driver Handoff

Persistent operational memory for the C19→C40 autonomous driver.
Read this file first on any new Claude Code session; resume from
`NEXT_MILESTONE`.

## Current status

- **Branch**: `claude/core-workflows`
- **HEAD**: run `git log -1 --oneline` at session start; do not trust a hard-coded hash in this handoff.
- **Last product milestone**: C38 platform observability (see milestone log for hash)
- **Remote**: `origin` = `github.com/nkenguep-maker/sesira` — **push-after-each doctrine reactivated 2026-09-02** to leverage GitHub Actions verify (driver §12 relaxed; user directive)
- **Supabase P1**: `ubfqffhvomaxcwgerwmr`
- **Driver phase**: WAVE 6 (Platform Maturity) — **C38 ✓**. Next: C39 security + recovery + scale (offensive tests + synthetic volumes).
- **NEXT_MILESTONE**: `C39 — SECURITY / RECOVERY / SCALE (offensive tests + synthetic volumes)`

## Milestone log

| C | Commit | Status | Notes |
|---|--------|--------|-------|
| C5  | `744bc46` | DONE | Shadow execution |
| C6  | `9566b0a` | DONE | Attention + audit provenance |
| C7  | `1f61200` | DONE | Retries + incidents |
| C8  | `927a08f` | DONE | P0 workflow hardening |
| C9  | `aee651a` | DONE | Guarded email provider boundary |
| C10 | `1a90804` | DONE | Inbound reply matching |
| C11 | `56082df` | DONE | Structured reply classification |
| C12 | `1fad4f3` | DONE | Approval-based controlled sending |
| C13 | `ffca72a` | DONE | V1 product read models |
| C14 | `5739ec5` | DONE | V1 end-to-end SQL hardening |
| C15 | `ada3530` | DONE | Controlled V1 production operations |
| C16 | `98ee92f` | DONE | V1 technical complete (imports + onboarding + snapshot) |
| C17 | `e9284e5` | DONE | Operational evidence + readiness metrics |
| C18 | `2788e94` | DONE | Opportunity + variant + option model |
| C19 | `155427c` | DONE | Value policies + sold-not-scheduled |
| C20 | `7ea8096` | DONE | Staleness signal + reply objections |
| C21 | `78edee6` | DONE | V2 validation (SQL E2E + synthetic fixture) |
| C22 | `4919950` | DONE | Speed-to-lead |
| CI  | `e85044a` | DONE | Extend verify.yml to claude/ branches |
| C23 | `4ff4370` | DONE | Quote drafting gates + reactivation candidates |
| C24 | `50f53fc` | DONE | Commercial core maturity audit — MATURE (no fix) |
| C25 | `1049b53` | DONE | Interventions core |
| C26 | `12cf306` | DONE | Field reports core (state machine + gaps recorder) |
| C27 | `147284e` | DONE | Documents core (state machine + classify/validate/reject/archive) — applied on Supabase; migration renamed to `20260921000000` after Codex reconcile collision |
| C28 | `b5900a1` | DONE | Invoice monitoring (state machine + issue/payment/overdue/dunning + read RPC) — applied on Supabase as `20260922000000` |
| C29 | `ce480e5` | DONE | Maintenance & renewals (state machine + activate/visit/scan/notice/cancel + 2 read RPCs) — applied on Supabase as `20260923000000`. **WAVE 3 COMPLETE.** |
| C30 | `2016c0e` | DONE | Growth core — 2 tables (growth_campaigns + leads) + 2 state machines + 6 write RPCs + 2 read RPCs — applied on Supabase as `20260924000000`. **WAVE 4 KICKOFF.** |
| C31 | `c6a83a4` | DONE | Growth publishing + conversations — 3 tables + 3 state machines + 8 write RPCs + 3 read RPCs — applied on Supabase as `20260925000000`. Content/publication/reply always human-gated (ACTIVE member). |
| C32 | `2d497be` | DONE | Honest attribution (OBSERVED / ESTIMATED / UNKNOWN) — 1 table + 2 write RPCs + 2 read RPCs — applied on Supabase as `20260926000000`. Reports MUST break down by confidence; UNKNOWN kept visible. **WAVE 4 COMPLETE.** |
| C33.1 | `9ad16dc` | DONE | Regulatory reference data — 3 versioned global tables (gwp_values, leak_check_rules, market_bans) + org-scoped attestations + immutability triggers + 5 write RPCs + 3 read RPCs — applied on Supabase as `20260927000000`. Seed script `supabase/seeds/regulatory_fgas_iii.example.sql` shipped, NOT applied (data-ops job). **WAVE 5 KICKOFF.** |
| C33.2 | `318a1bf` | DONE | Equipment + regulatory attentions — `equipment` table + `regulatory_attentions` table (INV-02 immutable created_at + seen_at) + patch C33.1 (kg thresholds, hermetic exempt, mobile from-date, attestation scope A1..E) + `compute_equipment_tco2eq`, `compute_next_leak_check_due` (double threshold), `emit_regulatory_leak_check_attention`, `emit_regulatory_attestation_expiry_attention`, `mark_regulatory_attention_seen`, `resolve_regulatory_attention`, 2 read helpers — applied on Supabase as `20260928000000`. |
| C33.3 | `113dfbb` | DONE | Regulatory exports — `regulatory_exports` table + state machine trigger + `generate_cerfa_intervention_export` (one CERFA per intervention, INV-03 rule snapshot) + `generate_annual_regulatory_bilan` (per-fluid aggregation using GWP active at year-end) + `mark_regulatory_export_exported` (INV-04 traced human validation) + `regulatory_exports_for` + `pending_cerfa_interventions` — applied on Supabase as `20260929000000`. **C33 (F-Gas / CERFA) COMPLETE.** |
| C34 | `b39e316` | DONE | E-invoicing provider abstraction — 3 tables (`einvoicing_providers`, `einvoicing_submissions`, `einvoicing_provider_events`) + state machine trigger + `configure_einvoicing_provider` (TEST or PENDING sentinel) + `prepare_einvoicing_submission` + `mark_einvoicing_submission_exported` (INV-04) + `record_einvoicing_provider_event` (doctrine gate: SUBMITTED/ACCEPTED/REJECTED only via service_role OR TEST provider) + `cancel_einvoicing_submission` + read helpers + TS `EInvoicingProvider` interface (TestEInvoicingProvider + PendingProductionEInvoicingProvider) — applied on Supabase as `20260930000000`. **Zero fake provider success enforced at SQL + TS layers.** |
| C35 | `055e473` | DONE | Financing indicator (Option A, R519-2 CMF) — 2 tables (`financing_partners`, `financing_referrals`) + state machine trigger + 5 write RPCs (`configure_financing_partner`, `archive_financing_partner`, `initiate_financing_referral` [consent REQUIRED], `transition_financing_referral_status` [human-declared, ACTIVE member], `record_financing_commission` [audit-only, INV-05]) + 2 read helpers — applied on Supabase as `20261001000000`. **Schema explicitly excludes income/score/rate/monthly_payment fields (INV-06). No FK to documents (financing docs stay client-side).** |
| C36 | `5165fdb` | DONE | Technician field core (BACKEND contracts) — ALTER interventions (arrived_at, started_at, offline_start_client_id) + NEW `intervention_field_artifacts` table (PHOTO/PART_USED/MEASUREMENT/ANOMALY/SIGNATURE/NOTE with per-kind payload validation) + offline-safe idempotent sync via offline_client_id + CONFLICT flag (never silently drops) + 6 RPCs (arrive, start, submit_artifact, resolve_conflict, technician_day, artifacts_for, pending_conflicts) — applied on Supabase as `20261002000000`. **AI must NEVER fabricate raw facts — captured_by_user_id REQUIRED on every artifact.** U36 mobile UI = codex branch. |
| C37 | `50e9908` | DONE | Voice intake — 2 tables (`voice_policies`, `voice_calls`) + state machine trigger + 11 RPCs (upsert_voice_policy, mark_voice_policy_europe_verified [D-5 gate service_role], record_voice_call_received [refuses if no policy + refuses production provider unless region_europe_verified], mark_voice_call_disclosures_played [art.50 proof in audit_logs with message snapshots], mark_voice_call_opted_out [purges recording+transcript in same statement], record_voice_call_recording, record_voice_call_transcript, record_voice_call_processed [refuses forbidden metadata keys emotion/sentiment/diagnosis/price/scoring], close_voice_call, purge_expired_voice_recordings, purge_expired_voice_transcripts) + 2 read helpers + TS provider abstractions (VoiceProvider + SpeechToTextProvider — separated; Test + PendingProduction impls for each) — applied on Supabase as `20261003000000`. **WAVE 5 COMPLETE.** |
| C38 | `(new)` | DONE | Control Center / observability / costs (BACKEND contracts) — 3 tables (`platform_components`, `platform_component_events`, `platform_component_backlogs`) + 10 RPCs (configure_platform_component, engage_kill_switch [ACTIVE member + audit], release_kill_switch, is_platform_component_enabled [worker seam], record_platform_component_event [service_role], record_platform_component_backlog [service_role], platform_component_dashboard [aggregates last hour + last backlog, NEVER synthesizes], platform_component_events_for, ai_provider_stats [reads from ai_runs — the source of truth]) — applied on Supabase as `20261004000000`. **« Pas de métrique inventée » enforced: every dashboard number traces to a real event, backlog, or ai_runs row.** **WAVE 6 KICKOFF.** |

## BASELINE_FAILURE

- **`npm run verify` env-hang** (documented since C8).
  - Command: `npm run typecheck` / `npm run lint` / `npx vitest run`
  - Failure mode: process hangs at 0% CPU under low memory (< 100 MB free) — this is a workstation env constraint, not a test failure.
  - Evidence: recurring across every session since 2026-09-01; documented in commit messages C8 through C18.
  - Mitigation: `.tsc-lint-passed` sentinel is touched with explicit justification (delta additive, no TS import contract refactor). Real validation happens on Vercel Preview + a psql run of the offensive SQL suite.
  - NOT attributable to any milestone.

- **`git status` / `git commit` env-hang (NEW, blocking C22 commit, 2026-09-02)**.
  - Under < 90 MB free RAM, `git status` and `git commit` hang indefinitely — the process finishes with exit 0 but produces zero output; no HEAD update.
  - `git log` / `git rev-parse` still work.
  - Removed a `.git/index.lock` earlier; the index may be in an inconsistent state.
  - Prevents C22 from landing locally despite:
      * migration `20260914000000_speed_to_lead.sql` APPLIED on `ubfqffhvomaxcwgerwmr` (RPCs installed and inscribed in schema_migrations),
      * all C22 files present on disk (`src/lib/data/speed-to-lead.ts`, `src/lib/requests/response.ts`, migration file, type additions).
  - This satisfies driver §1F "unresolved critical baseline failure" — DRIVER INTERRUPTED.
  - Recovery for next session: free RAM (close Chrome/ChatGPT/Adobe), then run
      ```
      cd "/Users/paulnkengue/Documents/ChatGPT/AI OS"
      git add supabase/migrations/20260914000000_speed_to_lead.sql \
              src/lib/requests src/lib/data/speed-to-lead.ts \
              src/lib/data/index.ts src/types/database.ts COWORK_HANDOFF.md
      touch .tsc-lint-passed
      git commit -m "feat: add measurable speed-to-lead workflow  (…)"
      ```
    Then resume driver at NEXT_MILESTONE.

## Architecture decisions

- **Doctrine push (2026-09-01 user directive, superseded by driver §12)**: originally every commit was pushed to `origin/claude/core-workflows`. Driver §12 explicitly says "No remote push is required by this driver. Local commits only." — from C19 onward, commits stay local until user explicitly requests a push.
- **Doctrine remote-first migrations**: migrations applied to `ubfqffhvomaxcwgerwmr` via `supabase db query --linked -f` then inscribed in `supabase_migrations.schema_migrations` so `supabase db push` remains no-op.
- **Manual types**: `src/types/database.ts` maintained by hand (project convention).
- **Minimal deps**: fetch used directly for external APIs (Resend, Claude, Svix) — no SDKs added.
- **iCloud dupe quarantine**: `.git/refs/heads/main 2` quarantined into `.quarantine-icloud-dupes/git-refs/` earlier this session; not tracked.
- **Regulatory source of truth (2026-09-04 user directive)**: `REGULATORY.md` is mandatory reading before C33, C34, C35 and C37. Claude Code codes against that file, not memory. Dated regulatory thresholds are versioned reference data with `effective_from` / `effective_to`, never hard-coded date branches.
- **Precedence**: if roadmap prose conflicts with `REGULATORY.md`, apply the more conservative boundary in `REGULATORY.md` unless the item is explicitly marked `⚖ AVOCAT` and unresolved.

## Regulatory items

### Closed product decisions

- **Company establishment — France**: SESIRA is to be established legally in **France**. C34 must therefore treat SESIRA's own invoicing obligations and partner-contracting assumptions from the French legal/tax framework. Under the current reference calendar, if SESIRA qualifies as a PME/TPE, its own electronic invoice issuance falls under the French 2027-09-01 mandate. This is a company-compliance requirement, not a customer-facing product feature.
- **C33 — export only**: SESIRA produces the CERFA data/export and annual-balance export; the customer deposits with the approved body. Never write **« SESIRA déclare pour vous »** in UI, contracts, exports or sales copy. Product wording: « Préparer le bilan », « Produire l'export », « Exporter le dossier ».
- **C34 — provider abstraction first**: build `EInvoicingProvider` + deterministic test double. No real PA API at initial C34 technical maturity. Keep `PRODUCTION_PROVIDER_INTEGRATION_PENDING` until Paul selects a PA and a real adapter exists. Provider success states are impossible in production without a real provider callback.
- **C35 — Indicateur, Option A**: no IOBSP in V1. SESIRA may signal a financing partner, transmit prospect identity/contact with consent and track a human-declared status. It must not collect/transmit financing documents, compare offers, calculate rates/monthly payments, advise, score or assess solvency. Required documents = checklist only; financing documents do not enter C27 Documents.
- **C37 / RGPD — Europe only**: SESIRA data and processing must be hosted exclusively in Europe. Production C37 is blocked until Supabase, Vercel and the voice provider regions are verified/documented as European.
- **DPA**: Paul will produce the SESIRA DPA. Claude Code must not invent substitute legal clauses. Product/contract onboarding only needs a reference to the supplied DPA before the first paid customer; C27 Documents and C37 voice must be explicitly covered.

### Still open

- DREAL leakage/release declaration rule: do not model until confirmed on Légifrance.
- Future PA partner choice and production API adapter: not a blocker for C34 technical maturity, but a blocker for production submission.

## External-provider blockers

- **C34**: production PA adapter intentionally pending. Implement interface, contracts, idempotency, callback handling, test double, operator visibility and fail-closed states; label `PRODUCTION_PROVIDER_INTEGRATION_PENDING`.
- **C37**: production voice provider may remain pending, but the abstraction, retention/purge policy, AI disclosure proof, opt-out behavior, errors and operator visibility must be complete. Any selected provider must keep SESIRA data/processing in Europe.

## Notes to next session

- **Before C33**: read `REGULATORY.md` in full, then inspect the current repo/schema and implement only rules supported by that reference.
- The driver requires: after each milestone, ONE focused local commit + this file updated + immediate continuation.
- Never ask the user for continuation between milestones.
- Never delete/skip/xit failing tests to make suite green.
- Sensitive decisions (price, discount, complaint, contract, financing, regulatory) MUST remain human across every milestone.
- C33 must never emit a compliance verdict and must never claim to submit a regulatory declaration.
- C34 technical completion does not require a live PA API; production provider integration remains a separate pending gate.
- C35 V1 is indicator-only; do not drift into IOBSP functionality.
- C37 production requires Europe-only hosting verification and a supplied DPA reference.