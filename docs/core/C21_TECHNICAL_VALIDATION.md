# SESIRA C21/U21 Technical Validation

Status target: paired Core C21 and Product/UI U21 verification on the same Git head.

`REAL_WORLD_CALIBRATION=PENDING`

## What this milestone proves

C21/U21 is a technical validation milestone. It does not claim that synthetic data replaces CVC customers, production traffic or field calibration.

The automated corpus contains 3 organizations and 3,600 deterministic opportunities. It deliberately includes high value dossiers, aged opportunities, missing values, missing quotes, missing inbound replies, multiple variants, options, paused follow ups, opt outs, structured objections, sensitive objections and human corrected objections.

The test suite verifies that tenant projections remain isolated, explainability survives sparse data, email openings never become purchase interest, commercial factors do not expose a global score, replay identities remain stable under concurrent synthetic callers and the UI mounts the commercial snapshot on the real opportunity detail route.

U21 also hardens keyboard focus, long content wrapping and mobile form width. Static UI contracts verify that the opportunity detail mounts the C20 commercial signal panel, that human correction remains visible, that responsive CSS exists and that opportunity feed reads are bounded.

## What this milestone does not prove

The following remain deliberately outside the claim of C21/U21:

1. Real customer language calibration.
2. Real CVC workflow timing and organizational behavior.
3. Production latency under representative external provider traffic.
4. Browser matrix validation on physical devices.
5. Live PostgreSQL concurrency stress against a production sized database.
6. Pilot conversion or business impact.

Those items cannot be manufactured honestly from synthetic fixtures. They remain later calibration and pilot gates.

## Safety invariants retained

External actions remain governed by the existing production kill switch. AI confidence remains a signal and never an authorization. Sensitive objections remain human decisions. Human corrections are authoritative over later AI output. Email opens are not treated as commercial interest. Tenant isolation remains enforced by RLS and explicit organization scoping.

## Exit condition

C21/U21 may be marked PASS only when the canonical `npm run verify` workflow succeeds on the exact final branch head containing the stress corpus, UI mounting fix and hardening contracts.

Production promotion remains blocked after C21/U21. The next milestone may start from the green C21/U21 head, but no production deployment is implied by this document.
