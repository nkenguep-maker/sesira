# SESIRA Core ↔ Product/UI Milestone Audit

Last audited: 2026-09-04.

This document is an evidence ledger. It separates backend contract maturity from Product/UI exposure and from real-world calibration.

## Status vocabulary

- `TECHNICALLY_VALIDATED`: contract/migration exists and has been validated against the live platform.
- `UI_ALIGNED`: the Product/UI exposes the contract without inventing state or authority.
- `UI_GAP`: backend capability exists but the Product/UI is missing or incomplete.
- `REAL_WORLD_CALIBRATION_PENDING`: technical behavior exists but customer-derived thresholds/cadences are not calibrated.
- `PROVIDER_PENDING`: external provider success is intentionally unavailable and must not be simulated in production.

## Core evidence

The Core branch `claude/core-workflows` reached C40. The live Supabase project contains the C33-C40 migrations through `20261005000000_platform_maturity_fixes`. The current integration branch restores those migration artifacts into the Product mainline so repository history matches the deployed schema.

| Milestones | Backend | Product/UI audit |
| --- | --- | --- |
| C0-C18 | TECHNICALLY_VALIDATED | UI_ALIGNED for current surfaced flows |
| C19-C24 | TECHNICALLY_VALIDATED | UI_ALIGNED with targeted wiring debt |
| C25-C32 | TECHNICALLY_VALIDATED | UI_ALIGNED; provider-truth and unknown-state gates present |
| C33 F-Gas / CERFA | TECHNICALLY_VALIDATED | UI_GAP |
| C34 E-invoicing | TECHNICALLY_VALIDATED / PROVIDER_PENDING for real PA | UI_GAP |
| C35 Financing indicator | TECHNICALLY_VALIDATED | UI_GAP |
| C36 Technician Field | TECHNICALLY_VALIDATED | UI_GAP |
| C37 Voice intake | TECHNICALLY_VALIDATED / PROVIDER_PENDING until production vendor + Europe gate | UI_GAP |
| C38 Observability / costs | TECHNICALLY_VALIDATED | UI_GAP |
| C39 Security / recovery | TECHNICALLY_VALIDATED | Mostly backend-only; no standalone customer UI required |
| C40 Platform maturity | TECHNICALLY_VALIDATED with follow-up gaps tracked in `full-platform-audit-c40.md` | UI catch-up in progress |

## Existing Product/UI debt to close before final C40 sign-off

1. Approval decisions are visible in `Suivi` but not yet operator-actionable from that surface.
2. The CSV import orchestrator exists, while the current import UI still leaves analysis disabled.
3. Open pipeline value must not aggregate mixed currencies into one amount.
4. Onboarding currently keeps several answers only in local UI state.
5. Connection management surfaces real state but several provider setup actions remain intentionally unavailable.
6. Engineering vocabulary must be translated to CVC operator language without weakening provider truth.

## C33-C40 Product target

- U33: equipment/fluid tracking, regulatory attentions, attestations, CERFA and annual export preparation.
- U34: separate accounting state from e-invoicing state and never fake PA feedback.
- U35: financing referral only in customer/opportunity context, no advice/rate/score surface.
- U36: role-specific technician experience, offline-first artifacts and visible conflicts.
- U37: voice policy/call activity with disclosure, opt-out, retention and Europe verification truth.
- U38: admin-only `État SESIRA` based on raw component events/backlogs, no invented health score.
- U39: security/recovery remains primarily an internal platform guarantee.
- U40: final Core↔UI verification, wording gate, provider-truth gate and deployment smoke.

## Calibration boundary

C40 technical validation does not establish market validation, ROI proof, benchmark quality, conversion uplift or customer-calibrated thresholds. Those remain `REAL_WORLD_CALIBRATION_PENDING` / `COMMERCIAL_VALIDATION_PENDING` until real customer data exists.
