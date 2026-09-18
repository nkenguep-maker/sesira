import { beforeEach, describe, expect, it } from "vitest";

import {
  approveProposal,
  beginProposalBundleReview,
  beginProposalReview,
  markProposalReadyToSend,
  requestProposalChanges,
  requestProposalSend,
  retryFailedProposalSend,
  setProposalVariantPresentation,
  submitProposalBundle,
  submitProposalForReview,
} from "./actions";

const ORG = "91000000-0000-4000-8000-000000000001";
const QUOTE = "92000000-0000-4000-8000-000000000001";
const OPP = "93000000-0000-4000-8000-000000000001";

let calls: Array<{ name: string; args: Record<string, unknown> }>;
let data: Record<string, unknown>;
let errors: Record<string, string>;

function fakeClient() {
  return {
    rpc(name: string, args: Record<string, unknown>) {
      calls.push({ name, args });
      const message = errors[name];
      return Promise.resolve({
        data: data[name] ?? null,
        error: message ? { message } : null,
      });
    },
  };
}

beforeEach(() => {
  calls = [];
  data = {};
  errors = {};
});

describe("proposal review actions", () => {
  it("submits a draft proposal", async () => {
    data.submit_proposal_for_review = true;
    const result = await submitProposalForReview(ORG, QUOTE, {
      client: fakeClient() as never,
    });
    expect(result).toEqual({ status: "APPLIED" });
    expect(calls[0]).toEqual({
      name: "submit_proposal_for_review",
      args: { target_organization_id: ORG, target_quote_id: QUOTE },
    });
  });

  it("keeps manager review eligibility explicit", async () => {
    data.begin_proposal_review = false;
    const result = await beginProposalReview(ORG, QUOTE, {
      client: fakeClient() as never,
    });
    expect(result).toEqual({ status: "NOT_ELIGIBLE" });
  });

  it("passes requested changes as a human note", async () => {
    data.request_proposal_changes = true;
    await requestProposalChanges(ORG, QUOTE, "Revoir le prix.", {
      client: fakeClient() as never,
    });
    expect(calls[0].args.target_note).toBe("Revoir le prix.");
  });
});

describe("proposal bundle actions", () => {
  it("sets the presentation order and recommendation", async () => {
    data.set_proposal_variant_presentation = true;
    const result = await setProposalVariantPresentation(ORG, QUOTE, 2, true, {
      client: fakeClient() as never,
    });
    expect(result).toEqual({ status: "APPLIED" });
    expect(calls[0].args.target_order).toBe(2);
    expect(calls[0].args.target_recommended).toBe(true);
  });

  it("returns the submitted variant count", async () => {
    data.submit_opportunity_proposal_bundle = 3;
    expect(
      await submitProposalBundle(ORG, OPP, { client: fakeClient() as never }),
    ).toEqual({ status: "APPLIED", count: 3 });
  });

  it("rejects malformed count results", async () => {
    data.begin_opportunity_proposal_bundle_review = "3";
    const result = await beginProposalBundleReview(ORG, OPP, {
      client: fakeClient() as never,
    });
    expect(result.status).toBe("ERROR");
  });
});

describe("proposal approval and sending", () => {
  it("returns the immutable snapshot id on approval", async () => {
    data.approve_proposal = "snapshot-1";
    expect(
      await approveProposal(ORG, QUOTE, { client: fakeClient() as never }),
    ).toEqual({ status: "APPLIED", id: "snapshot-1" });
  });

  it("does not turn a null send request into success", async () => {
    data.request_proposal_send = null;
    expect(
      await requestProposalSend(ORG, QUOTE, { client: fakeClient() as never }),
    ).toEqual({ status: "NOT_ELIGIBLE" });
  });

  it("covers ready and retry gates", async () => {
    data.mark_proposal_ready_to_send = true;
    data.retry_failed_proposal_send = true;

    expect(
      await markProposalReadyToSend(ORG, QUOTE, {
        client: fakeClient() as never,
      }),
    ).toEqual({ status: "APPLIED" });
    expect(
      await retryFailedProposalSend(ORG, QUOTE, {
        client: fakeClient() as never,
      }),
    ).toEqual({ status: "APPLIED" });
  });

  it("surfaces RPC errors", async () => {
    errors.request_proposal_send = "manager role required";
    const result = await requestProposalSend(ORG, QUOTE, {
      client: fakeClient() as never,
    });
    expect(result.status).toBe("ERROR");
  });
});
