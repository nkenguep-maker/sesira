export const PROPOSAL_REVIEW_STATES = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "CHANGES_REQUESTED",
  "APPROVED",
  "READY_TO_SEND",
  "SEND_REQUESTED",
  "SENT",
  "FAILED",
  "REJECTED",
] as const;

export type ProposalReviewState = (typeof PROPOSAL_REVIEW_STATES)[number];

export const PROPOSAL_SEND_REQUEST_STATUSES = [
  "REQUESTED",
  "SENDING",
  "SENT",
  "FAILED",
  "CANCELLED",
  "MANUAL_REVIEW",
] as const;

export type ProposalSendRequestStatus =
  (typeof PROPOSAL_SEND_REQUEST_STATUSES)[number];

const VALID_TRANSITIONS: Record<
  ProposalReviewState,
  readonly ProposalReviewState[]
> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["UNDER_REVIEW"],
  UNDER_REVIEW: ["CHANGES_REQUESTED", "APPROVED", "REJECTED"],
  CHANGES_REQUESTED: ["DRAFT"],
  APPROVED: ["READY_TO_SEND", "DRAFT"],
  READY_TO_SEND: ["SEND_REQUESTED", "DRAFT"],
  SEND_REQUESTED: ["SENT", "FAILED"],
  SENT: [],
  FAILED: ["READY_TO_SEND", "DRAFT"],
  REJECTED: [],
};

export function isProposalReviewState(
  value: string,
): value is ProposalReviewState {
  return (PROPOSAL_REVIEW_STATES as readonly string[]).includes(value);
}

export function canTransitionProposal(
  from: ProposalReviewState,
  to: ProposalReviewState,
): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

export function isProposalEditable(state: ProposalReviewState): boolean {
  return state === "DRAFT" || state === "CHANGES_REQUESTED";
}

export function isProposalTerminal(state: ProposalReviewState): boolean {
  return state === "SENT" || state === "REJECTED";
}

export function isProposalSendRequestStatus(
  value: string,
): value is ProposalSendRequestStatus {
  return (PROPOSAL_SEND_REQUEST_STATUSES as readonly string[]).includes(value);
}
