export {
  PermanentError,
  TransientError,
  classifyFailure,
  extractErrorClass,
  extractErrorMessage,
} from "./classify";
export type { FailureCategory } from "./classify";

export {
  DEFAULT_BASE_DELAY_MS,
  DEFAULT_MAX_ATTEMPTS,
  DEFAULT_MAX_DELAY_MS,
  DEFAULT_RETRY_POLICY,
  canAttemptAgain,
  computeNextAttemptAt,
} from "./policy";
export type { RetryPolicy } from "./policy";

export { incidentFingerprint, recordIncidentOnce } from "./incident";
export type {
  IncidentSeverity,
  RecordIncidentOnceInput,
  RecordIncidentOnceResult,
} from "./incident";

export { runWithRetry } from "./runner";
export type { RunnerContext, RunnerOutcome, WorkResult } from "./runner";
