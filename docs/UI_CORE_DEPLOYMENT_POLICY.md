# SESIRA Aligned Deployment Policy

Production promotion is allowed only at a shared verified milestone.

Define:

* `CORE_LEVEL` = highest contiguous Core milestone whose implementation and acceptance boundary pass on the exact integration head.
* `UI_LEVEL` = highest contiguous Product/UI milestone whose relevant flows pass on the exact same integration head.
* `DEPLOYABLE_LEVEL = min(CORE_LEVEL, UI_LEVEL)`.

A production deployment may only promote an integration head when:

1. `CORE_LEVEL == UI_LEVEL` for the scope being promoted;
2. canonical verification is green on that exact head;
3. critical browser flows are green on that exact head;
4. no fake success state is present;
5. no tenant or permission invariant is weakened;
6. external actions remain governed by their canonical safety boundary;
7. unresolved P0/P1 technical defects relevant to that milestone are absent.

If Core advances ahead of Product/UI, keep the new Core work on its development/integration branch.

If Product/UI advances ahead of Core, keep the UI work on its development/integration branch and render unavailable states honestly.

Do not use production deployment as the integration test.
