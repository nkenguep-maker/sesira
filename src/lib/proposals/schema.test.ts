import { describe, expect, it } from "vitest";

import {
  canTransitionProposal,
  isProposalEditable,
  isProposalReviewState,
  isProposalSendRequestStatus,
  isProposalTerminal,
  PROPOSAL_REVIEW_STATES,
  PROPOSAL_SEND_REQUEST_STATUSES,
} from "./schema";

describe("proposal review state machine", () => {
  it("recognizes the canonical state vocabulary", () => {
    for (const state of PROPOSAL_REVIEW_STATES) {
      expect(isProposalReviewState(state)).toBe(true);
    }
    expect(isProposalReviewState("UNKNOWN")).toBe(false);
  });

  it("keeps editing limited to draft and requested changes", () => {
    expect(isProposalEditable("DRAFT")).toBe(true);
    expect(isProposalEditable("CHANGES_REQUESTED")).toBe(true);
    expect(isProposalEditable("SUBMITTED")).toBe(false);
    expect(isProposalEditable("APPROVED")).toBe(false);
  });

  it("enforces the happy review and send path", () => {
    expect(canTransitionProposal("DRAFT", "SUBMITTED")).toBe(true);
    expect(canTransitionProposal("SUBMITTED", "UNDER_REVIEW")).toBe(true);
    expect(canTransitionProposal("UNDER_REVIEW", "APPROVED")).toBe(true);
    expect(canTransitionProposal("APPROVED", "READY_TO_SEND")).toBe(true);
    expect(canTransitionProposal("READY_TO_SEND", "SEND_REQUESTED")).toBe(true);
    expect(canTransitionProposal("SEND_REQUESTED", "SENT")).toBe(true);
  });

  it("allows explicit human rework and controlled retry paths", () => {
    expect(canTransitionProposal("UNDER_REVIEW", "CHANGES_REQUESTED")).toBe(true);
    expect(canTransitionProposal("CHANGES_REQUESTED", "DRAFT")).toBe(true);
    expect(canTransitionProposal("APPROVED", "DRAFT")).toBe(true);
    expect(canTransitionProposal("SEND_REQUESTED", "FAILED")).toBe(true);
    expect(canTransitionProposal("FAILED", "READY_TO_SEND")).toBe(true);
    expect(canTransitionProposal("FAILED", "DRAFT")).toBe(true);
  });

  it("keeps sent and rejected proposals terminal", () => {
    expect(isProposalTerminal("SENT")).toBe(true);
    expect(isProposalTerminal("REJECTED")).toBe(true);
    for (const to of PROPOSAL_REVIEW_STATES) {
      expect(canTransitionProposal("SENT", to)).toBe(false);
      expect(canTransitionProposal("REJECTED", to)).toBe(false);
    }
  });
});

describe("proposal send request statuses", () => {
  it("recognizes every status", () => {
    for (const status of PROPOSAL_SEND_REQUEST_STATUSES) {
      expect(isProposalSendRequestStatus(status)).toBe(true);
    }
    expect(isProposalSendRequestStatus("QUEUED")).toBe(false);
  });
});
