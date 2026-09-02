import { beforeEach, describe, expect, it } from "vitest";

import {
  addQuoteVariantToOpportunity,
  createOpportunityWithQuote,
  createQuoteRevision,
  selectQuoteOption,
  transitionOpportunityState,
} from "./actions";

const ORG = "91000000-0000-4000-8000-000000000001";
const CUSTOMER = "91300000-0000-4000-8000-000000000001";
const OWNER = "91100000-0000-4000-8000-000000000001";

interface FakeState {
  rpcCalls: Array<{ name: string; args: Record<string, unknown> }>;
  returnMap: Record<string, unknown>;
  errorMap: Record<string, string>;
}

let state: FakeState;

function fakeClient() {
  return {
    rpc(name: string, args: Record<string, unknown>) {
      state.rpcCalls.push({ name, args });
      const err = state.errorMap[name];
      if (err) return Promise.resolve({ data: null, error: { message: err } });
      return Promise.resolve({ data: state.returnMap[name] ?? null, error: null });
    },
  };
}

beforeEach(() => {
  state = { rpcCalls: [], returnMap: {}, errorMap: {} };
});

describe("createOpportunityWithQuote", () => {
  it("returns OK with both ids", async () => {
    state.returnMap.create_opportunity_with_quote = [
      { opportunity_id: "opp-1", quote_id: "quote-1" },
    ];
    const r = await createOpportunityWithQuote(
      { organizationId: ORG, customerId: CUSTOMER, ownerUserId: OWNER, quoteTitle: "Devis A" },
      { client: fakeClient() as never },
    );
    expect(r).toEqual({ status: "OK", opportunityId: "opp-1", quoteId: "quote-1" });
    expect(state.rpcCalls[0].args.target_variant_key).toBe("default");
    expect(state.rpcCalls[0].args.target_currency).toBe("EUR");
  });

  it("returns ERROR on RPC error", async () => {
    state.errorMap.create_opportunity_with_quote = "42501: unauthorized";
    const r = await createOpportunityWithQuote(
      { organizationId: ORG, customerId: CUSTOMER, quoteTitle: "x" },
      { client: fakeClient() as never },
    );
    expect(r.status).toBe("ERROR");
  });

  it("returns ERROR on malformed row", async () => {
    state.returnMap.create_opportunity_with_quote = [{ not_an_id: true }];
    const r = await createOpportunityWithQuote(
      { organizationId: ORG, customerId: CUSTOMER, quoteTitle: "x" },
      { client: fakeClient() as never },
    );
    expect(r.status).toBe("ERROR");
  });
});

describe("addQuoteVariantToOpportunity", () => {
  it("returns OK with the new quote id", async () => {
    state.returnMap.add_quote_variant_to_opportunity = "quote-variant-1";
    const r = await addQuoteVariantToOpportunity(
      { organizationId: ORG, opportunityId: "opp-1", variantKey: "premium",
        quoteTitle: "Devis premium", amount: 1500 },
      { client: fakeClient() as never },
    );
    expect(r).toEqual({ status: "OK", quoteId: "quote-variant-1" });
  });
});

describe("createQuoteRevision", () => {
  it("returns OK with the new revision id", async () => {
    state.returnMap.create_quote_revision = "quote-rev-2";
    const r = await createQuoteRevision(
      { organizationId: ORG, previousQuoteId: "quote-1", quoteTitle: "Rev 2", amount: 1600 },
      { client: fakeClient() as never },
    );
    expect(r).toEqual({ status: "OK", quoteId: "quote-rev-2" });
  });
});

describe("selectQuoteOption", () => {
  it("returns APPLIED on true", async () => {
    state.returnMap.select_quote_option = true;
    const r = await selectQuoteOption(
      { organizationId: ORG, optionId: "opt-1", newStatus: "INCLUDED" },
      { client: fakeClient() as never },
    );
    expect(r).toEqual({ status: "APPLIED" });
  });

  it("returns NOT_ELIGIBLE on false", async () => {
    state.returnMap.select_quote_option = false;
    const r = await selectQuoteOption(
      { organizationId: ORG, optionId: "opt-1", newStatus: "REJECTED" },
      { client: fakeClient() as never },
    );
    expect(r).toEqual({ status: "NOT_ELIGIBLE" });
  });
});

describe("transitionOpportunityState", () => {
  it("returns APPLIED on true", async () => {
    state.returnMap.transition_opportunity_state = true;
    const r = await transitionOpportunityState(
      { organizationId: ORG, opportunityId: "opp-1", newState: "ACTIVE" },
      { client: fakeClient() as never },
    );
    expect(r).toEqual({ status: "APPLIED" });
  });

  it("returns NOT_ELIGIBLE when RPC returns false", async () => {
    state.returnMap.transition_opportunity_state = false;
    const r = await transitionOpportunityState(
      { organizationId: ORG, opportunityId: "opp-1", newState: "WON", closedReason: "signed" },
      { client: fakeClient() as never },
    );
    expect(r).toEqual({ status: "NOT_ELIGIBLE" });
    expect(state.rpcCalls[0].args.target_closed_reason).toBe("signed");
  });
});
