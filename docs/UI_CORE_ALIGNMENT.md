# SESIRA Core ↔ Product/UI Alignment Gate

## Deployment rule

Production must not advance a Product/UI milestone beyond the highest Core milestone that has been technically validated and integrated into the deployment branch.

Before every production deployment:

1. determine the current Core milestone from repository evidence;
2. verify the Core acceptance boundary on the integration branch;
3. verify the corresponding Product/UI milestone;
4. run the canonical repository verification;
5. verify the browser critical path;
6. deploy only when Core level and Product/UI level are aligned.

A preview branch may be used for integration verification. It is not evidence of production readiness.

## Validation labels

Use separate verdicts:

* `TECHNICALLY_VALIDATED`
* `REAL_WORLD_CALIBRATION_PENDING`
* `COMMERCIAL_VALIDATION_PENDING`

Synthetic fixtures may establish technical validation. They must never be presented as customer validation, ROI proof, conversion proof or industry calibration.

## Current audit

Audit initiated from:

* production/main head: `e882a74668ab32d739f8c436e7b410c45add630f`
* Core branch: `claude/core-workflows`
* Core branch head observed: `2788e94b6285834fd9c63410de782f8d5c5f4b10`
* Core branch head identifies itself as C18.

C19 through C40 are therefore not treated as implemented until repository evidence proves otherwise.

The integration branch is the only working surface for Core/UI synchronization. Production `main` remains untouched until the alignment gate passes.
