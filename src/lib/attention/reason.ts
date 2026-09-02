/**
 * SESIRA Attention — reason vocabulary.
 * A reason is a class of human decision, not free text.
 */
export const ATTENTION_REASONS = [
  "MANUAL_REVIEW",
  "COMPLAINT_HOLD",
  "INTEGRATION_ISSUE",
  "APPROVAL_REQUIRED",
  "LOW_AI_CONFIDENCE",
  "REPLY_NEEDS_REVIEW",
  "SOLD_NOT_SCHEDULED",
] as const;

export type AttentionReason = (typeof ATTENTION_REASONS)[number];

export function isAttentionReason(value: string): value is AttentionReason {
  return (ATTENTION_REASONS as readonly string[]).includes(value);
}

export const WORKFLOW_EMITTED_REASONS = [
  "COMPLAINT_HOLD",
  "INTEGRATION_ISSUE",
  "APPROVAL_REQUIRED",
  "LOW_AI_CONFIDENCE",
  "REPLY_NEEDS_REVIEW",
  "SOLD_NOT_SCHEDULED",
] as const;

export type WorkflowEmittedReason = (typeof WORKFLOW_EMITTED_REASONS)[number];

export const ATTENTION_REASON_CATEGORY: Record<AttentionReason, "SALES" | "OPERATIONS" | "COMPLIANCE"> = {
  MANUAL_REVIEW: "SALES",
  COMPLAINT_HOLD: "COMPLIANCE",
  INTEGRATION_ISSUE: "OPERATIONS",
  APPROVAL_REQUIRED: "SALES",
  LOW_AI_CONFIDENCE: "SALES",
  REPLY_NEEDS_REVIEW: "SALES",
  SOLD_NOT_SCHEDULED: "OPERATIONS",
};

export const ATTENTION_REASON_DEFAULT_PRIORITY: Record<AttentionReason, "LOW" | "NORMAL" | "HIGH" | "URGENT"> = {
  MANUAL_REVIEW: "NORMAL",
  COMPLAINT_HOLD: "URGENT",
  INTEGRATION_ISSUE: "HIGH",
  APPROVAL_REQUIRED: "NORMAL",
  LOW_AI_CONFIDENCE: "NORMAL",
  REPLY_NEEDS_REVIEW: "NORMAL",
  SOLD_NOT_SCHEDULED: "NORMAL",
};
