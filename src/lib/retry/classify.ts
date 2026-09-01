/**
 * SESIRA retry classifier — deterministic mapping from an unknown
 * failure to a `TRANSIENT` vs `PERMANENT` category.
 *
 * The classifier is deliberately conservative: an unknown error class
 * defaults to TRANSIENT so a mislabeled failure retries within its
 * bounded budget rather than immediately failing permanently. A
 * PERMANENT verdict is only reached when the caller (a) throws an
 * explicit `PermanentError`, or (b) the failure carries an
 * unambiguously non-retriable signal (4xx HTTP status other than 408
 * or 429, or a SQLSTATE that indicates malformed input / permission
 * denied / not-null violation).
 *
 * Adding a new classification rule is a business decision — do it in
 * a dedicated commit and update the tests below in lock-step.
 */

export type FailureCategory = "TRANSIENT" | "PERMANENT";

/**
 * A failure the caller has classified explicitly. Instantiate this
 * class in your work function when you know an error must NOT be
 * retried (invalid recipient, revoked authorization, unsupported
 * payload, hand-detected data corruption).
 */
export class PermanentError extends Error {
  readonly errorClass: string;
  readonly cause?: unknown;
  constructor(errorClass: string, message: string, cause?: unknown) {
    super(message);
    this.name = "PermanentError";
    this.errorClass = errorClass;
    this.cause = cause;
  }
}

/**
 * A failure the caller has classified explicitly as retriable — used
 * when a heuristic in the runner would misclassify (e.g., a domain
 * error that carries no HTTP status but is known to be transient).
 */
export class TransientError extends Error {
  readonly errorClass: string;
  readonly cause?: unknown;
  constructor(errorClass: string, message: string, cause?: unknown) {
    super(message);
    this.name = "TransientError";
    this.errorClass = errorClass;
    this.cause = cause;
  }
}

/**
 * HTTP status codes that are conclusively non-retriable. 408 (request
 * timeout) and 429 (too many requests) are excluded — those are
 * transient by design.
 */
const PERMANENT_HTTP_STATUSES = new Set<number>([
  400, // bad request
  401, // unauthorized (revoked credentials — human must reconnect)
  403, // forbidden (policy denial — no retry will fix)
  404, // not found (identity or endpoint is wrong)
  405, // method not allowed
  409, // conflict — usually a state issue only a human resolves
  410, // gone
  413, // payload too large
  415, // unsupported media type
  422, // unprocessable entity
  451, // unavailable for legal reasons
]);

/**
 * Postgres SQLSTATE codes that classify PERMANENT. Any other SQLSTATE
 * falls through to TRANSIENT (safer default: retry and let the budget
 * bound rather than permanently fail on an unrecognised class).
 */
const PERMANENT_SQLSTATES = new Set<string>([
  "22023", // invalid_parameter_value — caller passed bad input
  "22P02", // invalid_text_representation — bad cast / bad UUID
  "23502", // not_null_violation — schema constraint hit
  "23503", // foreign_key_violation — dangling reference (usually a data issue)
  "23505", // unique_violation — insert conflict beyond ON CONFLICT
  "23514", // check_violation — tenant safety trigger, state machine
  "42501", // insufficient_privilege — auth / RLS
  "42P01", // undefined_table
  "42703", // undefined_column
  "42883", // undefined_function — signature drift
  "P0001", // raise_exception — application-level rejection
]);

function extractHttpStatus(value: unknown): number | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const candidates = [v.status, v.statusCode, v.httpStatus];
  for (const c of candidates) {
    if (typeof c === "number" && Number.isFinite(c) && c >= 100 && c < 600) return c;
  }
  // Nested response.status (fetch-style)
  const response = v.response as Record<string, unknown> | undefined;
  if (response && typeof response.status === "number") return response.status;
  return null;
}

function extractSqlState(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.code === "string" && /^[0-9A-Z]{5}$/.test(v.code)) return v.code;
  if (typeof v.sqlstate === "string" && /^[0-9A-Z]{5}$/.test(v.sqlstate)) return v.sqlstate;
  return null;
}

/**
 * Classify an unknown failure. Rules, in order:
 *
 *   1. `PermanentError` → PERMANENT.
 *   2. `TransientError` → TRANSIENT.
 *   3. HTTP status in PERMANENT_HTTP_STATUSES → PERMANENT.
 *   4. SQLSTATE in PERMANENT_SQLSTATES → PERMANENT.
 *   5. Everything else → TRANSIENT.
 */
export function classifyFailure(error: unknown): FailureCategory {
  if (error instanceof PermanentError) return "PERMANENT";
  if (error instanceof TransientError) return "TRANSIENT";
  const status = extractHttpStatus(error);
  if (status !== null && PERMANENT_HTTP_STATUSES.has(status)) return "PERMANENT";
  const sqlstate = extractSqlState(error);
  if (sqlstate !== null && PERMANENT_SQLSTATES.has(sqlstate)) return "PERMANENT";
  return "TRANSIENT";
}

/**
 * Extract a short, stable identifier of the error class for the
 * incident fingerprint. Prefers explicit `errorClass` (typed errors),
 * then `code` / `name`, then falls back to a hash of the message.
 */
export function extractErrorClass(error: unknown): string {
  if (error instanceof PermanentError || error instanceof TransientError) {
    return error.errorClass;
  }
  if (error && typeof error === "object") {
    const v = error as Record<string, unknown>;
    if (typeof v.code === "string" && v.code.length > 0 && v.code.length <= 64) return v.code;
    if (typeof v.name === "string" && v.name.length > 0 && v.name !== "Error") return v.name;
  }
  return "unknown_error";
}

export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error).slice(0, 500);
  } catch {
    return "unrepresentable_error";
  }
}
