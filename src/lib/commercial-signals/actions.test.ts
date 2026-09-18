import { beforeEach, describe, expect, it } from "vitest";

import {
  convertCommercialSignalToProposal,
  dismissCommercialSignal,
  markCommercialSignalPlanned,
  markCommercialSignalReviewed,
  snoozeCommercialSignal,
} from "./actions";

const ORG = "91000000-0000-4000-8000-000000000001";
const OTHER_ORG = "91000000-0000-4000-8000-0000000000ff";
const SIGNAL = "91300000-0000-4000-8000-000000000001";
const CUSTOMER = "91400000-0000-4000-8000-000000000001";
const OWNER = "91700000-0000-4000-8000-000000000001";

interface FakeState {
  calls: Array<{ name: string; args: Record<string, unknown> }>;
  returns: Record<string, unknown>;
  errors: Record<string, string>;
}

let state: FakeState;

function fakeClient() {
  return {
    rpc(name: string, args: Record<string, unknown>) {
      state.calls.push({ name, args });
      const err = state.errors[name];
      if (err) return Promise.resolve({ data: null, error: { message: err } });
      return Promise.resolve({ data: state.returns[name] ?? null, error: null });
    },
  };
}

beforeEach(() => {
  state = { calls: [], returns: {}, errors: {} };
});

// -----------------------------------------------------------------------
// markCommercialSignalReviewed
// -----------------------------------------------------------------------
describe("markCommercialSignalReviewed", () => {
  it("returns APPLIED when the RPC returns true", async () => {
    state.returns.mark_commercial_signal_reviewed = true;
    const result = await markCommercialSignalReviewed(
      { organizationId: ORG, signalId: SIGNAL },
      { client: fakeClient() as never },
    );
    expect(result).toEqual({ status: "APPLIED" });
    expect(state.calls[0]).toEqual({
      name: "mark_commercial_signal_reviewed",
      args: { target_organization_id: ORG, target_signal_id: SIGNAL },
    });
  });

  it("returns NOT_ELIGIBLE when the RPC returns false (already reviewed / terminal)", async () => {
    state.returns.mark_commercial_signal_reviewed = false;
    const result = await markCommercialSignalReviewed(
      { organizationId: ORG, signalId: SIGNAL },
      { client: fakeClient() as never },
    );
    expect(result).toEqual({ status: "NOT_ELIGIBLE" });
  });

  it("returns ERROR on cross-tenant 42501", async () => {
    state.errors.mark_commercial_signal_reviewed = "42501: caller is not a member";
    const result = await markCommercialSignalReviewed(
      { organizationId: OTHER_ORG, signalId: SIGNAL },
      { client: fakeClient() as never },
    );
    expect(result.status).toBe("ERROR");
  });
});

// -----------------------------------------------------------------------
// markCommercialSignalPlanned
// -----------------------------------------------------------------------
describe("markCommercialSignalPlanned", () => {
  it("passes the note through when provided", async () => {
    state.returns.mark_commercial_signal_planned = true;
    await markCommercialSignalPlanned(
      { organizationId: ORG, signalId: SIGNAL, note: "attend retour client" },
      { client: fakeClient() as never },
    );
    expect(state.calls[0].args).toEqual({
      target_organization_id: ORG,
      target_signal_id: SIGNAL,
      target_note: "attend retour client",
    });
  });

  it("sends null when no note is provided", async () => {
    state.returns.mark_commercial_signal_planned = true;
    await markCommercialSignalPlanned(
      { organizationId: ORG, signalId: SIGNAL },
      { client: fakeClient() as never },
    );
    expect(state.calls[0].args.target_note).toBeNull();
  });
});

// -----------------------------------------------------------------------
// snoozeCommercialSignal
// -----------------------------------------------------------------------
describe("snoozeCommercialSignal", () => {
  it("passes snoozed_until and null reason correctly", async () => {
    state.returns.snooze_commercial_signal = true;
    const until = "2027-01-01T10:00:00.000Z";
    await snoozeCommercialSignal(
      { organizationId: ORG, signalId: SIGNAL, snoozedUntil: until },
      { client: fakeClient() as never },
    );
    expect(state.calls[0].args).toEqual({
      target_organization_id: ORG,
      target_signal_id: SIGNAL,
      target_until: until,
      target_reason: null,
    });
  });

  it("returns NOT_ELIGIBLE when the signal is terminal (RPC returns false)", async () => {
    state.returns.snooze_commercial_signal = false;
    const result = await snoozeCommercialSignal(
      {
        organizationId: ORG,
        signalId: SIGNAL,
        snoozedUntil: "2027-01-01T10:00:00.000Z",
        reason: "wait Q1",
      },
      { client: fakeClient() as never },
    );
    expect(result).toEqual({ status: "NOT_ELIGIBLE" });
  });
});

// -----------------------------------------------------------------------
// dismissCommercialSignal
// -----------------------------------------------------------------------
describe("dismissCommercialSignal", () => {
  it("forwards the required reason", async () => {
    state.returns.dismiss_commercial_signal = true;
    await dismissCommercialSignal(
      { organizationId: ORG, signalId: SIGNAL, reason: "customer decommissioned equipment" },
      { client: fakeClient() as never },
    );
    expect(state.calls[0].args.target_reason).toBe("customer decommissioned equipment");
  });
});

// -----------------------------------------------------------------------
// convertCommercialSignalToProposal — the critical path (INV-04)
// -----------------------------------------------------------------------
describe("convertCommercialSignalToProposal", () => {
  it("returns OK with all ids when the RPC succeeds", async () => {
    state.returns.convert_commercial_signal_to_proposal = [
      {
        opportunity_id: "91800000-0000-4000-8000-000000000001",
        quote_id: "91900000-0000-4000-8000-000000000001",
        signal_id: SIGNAL,
        catalog_applied: false,
      },
    ];
    const result = await convertCommercialSignalToProposal(
      {
        organizationId: ORG,
        signalId: SIGNAL,
        quoteTitle: "Contrôle d'étanchéité",
        variantKey: "default",
        estimatedValue: 900,
        currency: "EUR",
        ownerUserId: OWNER,
        overrideCustomerId: CUSTOMER,
      },
      { client: fakeClient() as never },
    );
    expect(result.status).toBe("OK");
    if (result.status === "OK") {
      expect(result.catalogApplied).toBe(false);
      expect(result.opportunityId).toBe("91800000-0000-4000-8000-000000000001");
      expect(result.quoteId).toBe("91900000-0000-4000-8000-000000000001");
    }
    expect(state.calls[0].args).toMatchObject({
      target_organization_id: ORG,
      target_signal_id: SIGNAL,
      target_quote_title: "Contrôle d'étanchéité",
      target_variant_key: "default",
      target_estimated_value: 900,
      target_currency: "EUR",
      target_owner_user_id: OWNER,
      target_override_customer_id: CUSTOMER,
      target_catalog_item_id: null,
    });
  });

  it("returns NOT_ELIGIBLE when the RPC returns an empty result set (double conversion / terminal)", async () => {
    state.returns.convert_commercial_signal_to_proposal = [];
    const result = await convertCommercialSignalToProposal(
      { organizationId: ORG, signalId: SIGNAL, quoteTitle: "Contrôle" },
      { client: fakeClient() as never },
    );
    expect(result).toEqual({ status: "NOT_ELIGIBLE" });
  });

  it("returns NOT_ELIGIBLE when the RPC returns null", async () => {
    state.returns.convert_commercial_signal_to_proposal = null;
    const result = await convertCommercialSignalToProposal(
      { organizationId: ORG, signalId: SIGNAL, quoteTitle: "Contrôle" },
      { client: fakeClient() as never },
    );
    expect(result).toEqual({ status: "NOT_ELIGIBLE" });
  });

  it("returns ERROR on a DB exception (e.g. no customer + no override)", async () => {
    state.errors.convert_commercial_signal_to_proposal =
      "22023: signal X has no customer and no override provided";
    const result = await convertCommercialSignalToProposal(
      { organizationId: ORG, signalId: SIGNAL, quoteTitle: "Contrôle" },
      { client: fakeClient() as never },
    );
    expect(result.status).toBe("ERROR");
  });

  it("defaults variant_key to 'default' and currency to 'EUR' when omitted", async () => {
    state.returns.convert_commercial_signal_to_proposal = [
      {
        opportunity_id: "91800000-0000-4000-8000-000000000002",
        quote_id: "91900000-0000-4000-8000-000000000002",
        signal_id: SIGNAL,
        catalog_applied: false,
      },
    ];
    await convertCommercialSignalToProposal(
      { organizationId: ORG, signalId: SIGNAL, quoteTitle: "Contrôle" },
      { client: fakeClient() as never },
    );
    expect(state.calls[0].args).toMatchObject({
      target_variant_key: "default",
      target_currency: "EUR",
      target_catalog_item_id: null,
    });
  });

  it("returns ERROR when the row is malformed (missing fields)", async () => {
    state.returns.convert_commercial_signal_to_proposal = [
      { opportunity_id: "91800000-0000-4000-8000-000000000003" }, // missing quote_id, signal_id, catalog_applied
    ];
    const result = await convertCommercialSignalToProposal(
      { organizationId: ORG, signalId: SIGNAL, quoteTitle: "Contrôle" },
      { client: fakeClient() as never },
    );
    expect(result.status).toBe("ERROR");
  });

  it("does not touch any other RPC (single atomic call to the SECURITY DEFINER RPC)", async () => {
    state.returns.convert_commercial_signal_to_proposal = [
      {
        opportunity_id: "91800000-0000-4000-8000-000000000004",
        quote_id: "91900000-0000-4000-8000-000000000004",
        signal_id: SIGNAL,
        catalog_applied: false,
      },
    ];
    await convertCommercialSignalToProposal(
      { organizationId: ORG, signalId: SIGNAL, quoteTitle: "Contrôle" },
      { client: fakeClient() as never },
    );
    expect(state.calls).toHaveLength(1);
    expect(state.calls[0].name).toBe("convert_commercial_signal_to_proposal");
  });
});
