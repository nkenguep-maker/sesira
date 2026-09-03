/**
 * SESIRA validation labels — the honest surface for "how validated
 * is this system?".
 *
 * Doctrine invariant (roadmap C17, C21, C40): NEVER claim the system
 * is market-validated / ROI-proven / threshold-calibrated / conversion-
 * improved without real client data. The labels below encode that.
 *
 * `TECHNICALLY_VALIDATED` = the code paths pass their tests, the DB
 *   invariants hold, the offensive SQL suite passes. Emitted freely
 *   by CI + the ops screen.
 *
 * `REAL_WORLD_CALIBRATION_PENDING` = we lack production traffic to
 *   calibrate thresholds (approval rate cutoffs, retry back-offs,
 *   AI confidence floors). This label is the DEFAULT — an operator
 *   should not confuse a passing test suite with proven business
 *   value.
 *
 * `MARKET_VALIDATED` = withheld. There is no code path that emits
 *   this label. It can only be flipped by a human PR that documents
 *   the source of the claim (client contracts, revenue, retention).
 *
 * `AUTOMATIC_MODE_UNLOCKED` = withheld. Even if
 *   `getApprovalRateWindow` reports 100% approvals over 300 drafts,
 *   the operator MUST explicitly enable AUTOMATIC. AI confidence /
 *   approval rate is never the trigger.
 */

export const TECHNICALLY_VALIDATED = "TECHNICALLY_VALIDATED" as const;
export const REAL_WORLD_CALIBRATION_PENDING = "REAL_WORLD_CALIBRATION_PENDING" as const;

/**
 * The current default posture of the platform. The ops screen renders
 * both labels side-by-side so no one confuses "tests pass" with "it
 * works in production".
 */
export const PLATFORM_MATURITY_LABELS = [
  TECHNICALLY_VALIDATED,
  REAL_WORLD_CALIBRATION_PENDING,
] as const;

export type PlatformMaturityLabel = (typeof PLATFORM_MATURITY_LABELS)[number];
