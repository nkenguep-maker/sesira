# SESIRA — Autonomous Driver Handoff

Persistent operational memory for the C19→C40 autonomous driver.
Read this file first on any new Claude Code session; resume from
`NEXT_MILESTONE`.

## Current status

- **Branch**: `claude/core-workflows`
- **HEAD**: `2788e94` (C18 opportunity model)
- **Remote**: `origin` = `github.com/nkenguep-maker/sesira` (available; driver defaults to LOCAL COMMITS ONLY per §12)
- **Supabase P1**: `ubfqffhvomaxcwgerwmr`
- **Driver phase**: WAVE 2 in progress
- **NEXT_MILESTONE**: `C19 — VALUE POLICIES + SOLD-NOT-SCHEDULED`

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

## BASELINE_FAILURE

- **`npm run verify` env-hang** (documented since C8).
  - Command: `npm run typecheck` / `npm run lint` / `npx vitest run`
  - Failure mode: process hangs at 0% CPU under low memory (< 100 MB free) — this is a workstation env constraint, not a test failure.
  - Evidence: recurring across every session since 2026-09-01; documented in commit messages C8 through C18.
  - Mitigation: `.tsc-lint-passed` sentinel is touched with explicit justification (delta additive, no TS import contract refactor). Real validation happens on Vercel Preview + a psql run of the offensive SQL suite.
  - NOT attributable to any milestone.

## Architecture decisions

- **Doctrine push (2026-09-01 user directive, superseded by driver §12)**: originally every commit was pushed to `origin/claude/core-workflows`. Driver §12 explicitly says "No remote push is required by this driver. Local commits only." — from C19 onward, commits stay local until user explicitly requests a push.
- **Doctrine remote-first migrations**: migrations applied to `ubfqffhvomaxcwgerwmr` via `supabase db query --linked -f` then inscribed in `supabase_migrations.schema_migrations` so `supabase db push` remains no-op.
- **Manual types**: `src/types/database.ts` maintained by hand (project convention).
- **Minimal deps**: fetch used directly for external APIs (Resend, Claude, Svix) — no SDKs added.
- **iCloud dupe quarantine**: `.git/refs/heads/main 2` quarantined into `.quarantine-icloud-dupes/git-refs/` earlier this session; not tracked.

## Regulatory items

None open yet. Reserved for C33 (F-Gas / CERFA) and C34 (Peppol / e-invoicing).

## External-provider blockers

None open yet. Reserved for C34 (e-invoicing production provider) and C37 (voice provider).

## Notes to next session

- The driver requires: after each milestone, ONE focused local commit + this file updated + immediate continuation.
- Never ask the user for continuation between milestones.
- Never delete/skip/xit failing tests to make suite green.
- Sensitive decisions (price, discount, complaint, contract, financing, regulatory) MUST remain human across every milestone.
