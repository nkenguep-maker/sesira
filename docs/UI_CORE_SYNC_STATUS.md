# Core / Product UI synchronization status

Last audited: 2026-09-04.

## Current truth

- Live Supabase schema: Core C40 migrations are applied through `20261005000000_platform_maturity_fixes`.
- Core source branch: `claude/core-workflows` at `8c55ebd47ede8533901095aec469b11ae175fb44`.
- Product mainline audited before integration: `main` at `41a9f9b72315a0b57d831fc8e08f0da9f5845239`.
- Integration branch: `integration/c40-core-ui`.
- Product/UI is materially aligned through U32, with a small backlog of older UI wiring gaps (approvals, imports, onboarding, connection management and mixed-currency presentation).
- U33 through U40 are the current Product/UI catch-up target.

## Validation labels

- Core C40 backend contracts: `TECHNICALLY_VALIDATED`.
- Product/UI C40: `INTEGRATION_IN_PROGRESS` until U33-U40 and the older UI gaps pass canonical verification.
- Real-world threshold/cadence calibration: `REAL_WORLD_CALIBRATION_PENDING`.
- Commercial/ROI validation: `COMMERCIAL_VALIDATION_PENDING`.

## Production gate

Production is promoted only from a head where:

1. the repository contains the migration/contracts corresponding to the live schema;
2. the Product/UI only exposes capabilities supported by those contracts;
3. `npm run verify` passes, including wording checks;
4. provider-backed terminal states remain evidence-backed;
5. regulatory wording preserves `REGULATORY.md` invariants;
6. the deployment is successful;
7. a browser smoke is completed when browser access is available, otherwise the limitation is recorded explicitly.

No UI milestone may invent a provider success, compliance verdict, causal ROI claim or benchmark that the Core does not establish.
