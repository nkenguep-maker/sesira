/**
 * SESIRA Attention — reason vocabulary.
 *
 * Every workflow-generated Attention MUST carry one of these reasons.
 * The vocabulary is intentionally small: a reason is a *class* of
 * human decision, not a free-text description. If a new class of
 * decision appears (e.g., a compliance flag introduced by a new
 * jurisdiction), extend this enum in a dedicated commit and update
 * the corresponding trigger logic.
 *
 * Categories with `stubForCFuture` = true are declared here so the
 * schema is stable for downstream code, but they are not emitted by
 * anything yet — they land in later C phases.
 */
export const ATTENTION_REASONS = [
  /**
   * A user opened the "New Attention" form and asked for a follow-up.
   * The only reason that pre-dates the workflow engine — kept for
   * back-compat with existing manual entries.
   */
  "MANUAL_REVIEW",

  /**
   * A quote is on automation pause because a complaint was recorded
   * against it. Follow-ups must not resume until a human has decided
   * whether to close the complaint or hold the quote.
   * Emitted by Shadow when it encounters a paused quote whose
   * `automation_pause_reason` is `'COMPLAINT'`.
   */
  "COMPLAINT_HOLD",

  /**
   * A follow-up decision could not proceed because operational data
   * is missing (e.g., customer has no email address, provider is
   * disconnected, credentials revoked). Requires a human to fix the
   * data or the integration.
   * Emitted by Shadow when a proposal is DUE but building the concrete
   * action fails (see `ShadowExecutionSuccess.outcome === 'PROPOSAL_UNAVAILABLE'`).
   */
  "INTEGRATION_ISSUE",

  /**
   * Reserved for C12 — a workflow-approved action is queued and needs
   * an operator to review/approve/reject before sending.
   */
  "APPROVAL_REQUIRED",

  /**
   * Reserved for C11 — a classifier returned a result below the
   * confidence threshold; the human should re-classify.
   */
  "LOW_AI_CONFIDENCE",

  /**
   * Reserved for C10/C11 — an inbound reply arrived that requires
   * human attention (price objection, unusual content, unmatched
   * thread). The reason is distinct from LOW_AI_CONFIDENCE because
   * the reply itself is the trigger, regardless of classification.
   */
  "REPLY_NEEDS_REVIEW",
] as const;

export type AttentionReason = (typeof ATTENTION_REASONS)[number];

export function isAttentionReason(value: string): value is AttentionReason {
  return (ATTENTION_REASONS as readonly string[]).includes(value);
}

/**
 * Reasons the workflow engine (as opposed to a human) is entitled to
 * emit. `MANUAL_REVIEW` is excluded — a system-generated
 * MANUAL_REVIEW would defeat the definition.
 */
export const WORKFLOW_EMITTED_REASONS = [
  "COMPLAINT_HOLD",
  "INTEGRATION_ISSUE",
  "APPROVAL_REQUIRED",
  "LOW_AI_CONFIDENCE",
  "REPLY_NEEDS_REVIEW",
] as const;

export type WorkflowEmittedReason = (typeof WORKFLOW_EMITTED_REASONS)[number];

/**
 * Category is the coarse dashboard grouping (SALES / OPERATIONS /
 * COMPLIANCE). The current DB has no enum constraint on `category`,
 * so we pin the vocabulary here so read-side code can group without
 * a lookup table.
 */
export const ATTENTION_REASON_CATEGORY: Record<AttentionReason, "SALES" | "OPERATIONS" | "COMPLIANCE"> = {
  MANUAL_REVIEW: "SALES",
  COMPLAINT_HOLD: "COMPLIANCE",
  INTEGRATION_ISSUE: "OPERATIONS",
  APPROVAL_REQUIRED: "SALES",
  LOW_AI_CONFIDENCE: "SALES",
  REPLY_NEEDS_REVIEW: "SALES",
};

/**
 * Default priority per reason. Callers can still override at the
 * emission site (a complaint from a very high-value customer might
 * bump to URGENT), but the defaults reflect the doctrine that a
 * complaint is inherently higher-priority than a missing email.
 */
export const ATTENTION_REASON_DEFAULT_PRIORITY: Record<AttentionReason, "LOW" | "NORMAL" | "HIGH" | "URGENT"> = {
  MANUAL_REVIEW: "NORMAL",
  COMPLAINT_HOLD: "URGENT",
  INTEGRATION_ISSUE: "HIGH",
  APPROVAL_REQUIRED: "NORMAL",
  LOW_AI_CONFIDENCE: "NORMAL",
  REPLY_NEEDS_REVIEW: "NORMAL",
};
