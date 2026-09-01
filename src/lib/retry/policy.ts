/**
 * SESIRA retry policy — deterministic backoff formula.
 *
 * A single formula is used across the workflow engine so operators
 * can reason about retry cadence without reading the code:
 *
 *   delayMs = min(baseDelayMs * 2^(attemptCount - 1), maxDelayMs)
 *   nextAttemptAt = now + delayMs
 *
 * `attemptCount` is the count of attempts already completed (the run
 * has been claimed and released N times); `1` therefore means "the
 * first attempt just failed — schedule the second." `attemptCount = 0`
 * (never attempted) is invalid input.
 *
 * Determinism: no `Math.random()`, no jitter. Jitter is a nice-to-have
 * for scale but is deferred until we have measured a herd. When
 * multiple workers claim the same run simultaneously, the lease CAS
 * already ensures only one wins — jitter is not required for
 * correctness.
 */

export const DEFAULT_MAX_ATTEMPTS = 5;
export const DEFAULT_BASE_DELAY_MS = 60_000; // 1 min
export const DEFAULT_MAX_DELAY_MS = 30 * 60_000; // 30 min

export interface RetryPolicy {
  /** Maximum number of ATTEMPTS (not retries). A policy with maxAttempts=5 allows the first try + up to 4 retries. */
  maxAttempts: number;
  /** Backoff base; applied to the exponential. */
  baseDelayMs: number;
  /** Cap on the computed delay. */
  maxDelayMs: number;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: DEFAULT_MAX_ATTEMPTS,
  baseDelayMs: DEFAULT_BASE_DELAY_MS,
  maxDelayMs: DEFAULT_MAX_DELAY_MS,
};

/**
 * Pure: given the current attempt count and the policy, compute the
 * absolute timestamp of the next attempt.
 *
 * @param now Reference clock — passed explicitly so callers stay
 *            deterministic in tests.
 * @param attemptCount Number of attempts already completed.
 *                    Must be >= 1 (the caller has just observed a
 *                    failure, therefore at least one attempt has
 *                    happened).
 */
export function computeNextAttemptAt(
  now: Date,
  attemptCount: number,
  policy: RetryPolicy = DEFAULT_RETRY_POLICY,
): Date {
  if (!Number.isInteger(attemptCount) || attemptCount < 1) {
    throw new RangeError(
      `computeNextAttemptAt: attemptCount must be a positive integer (got ${attemptCount})`,
    );
  }
  if (!Number.isFinite(policy.baseDelayMs) || policy.baseDelayMs <= 0) {
    throw new RangeError(
      `computeNextAttemptAt: baseDelayMs must be positive (got ${policy.baseDelayMs})`,
    );
  }
  if (!Number.isFinite(policy.maxDelayMs) || policy.maxDelayMs < policy.baseDelayMs) {
    throw new RangeError(
      `computeNextAttemptAt: maxDelayMs must be >= baseDelayMs (got ${policy.maxDelayMs} / ${policy.baseDelayMs})`,
    );
  }
  const exp = policy.baseDelayMs * Math.pow(2, attemptCount - 1);
  const capped = Math.min(exp, policy.maxDelayMs);
  return new Date(now.getTime() + capped);
}

/**
 * Predicate: given the count of completed attempts, is another
 * attempt allowed under the policy?
 */
export function canAttemptAgain(
  attemptCount: number,
  policy: RetryPolicy = DEFAULT_RETRY_POLICY,
): boolean {
  return attemptCount < policy.maxAttempts;
}
