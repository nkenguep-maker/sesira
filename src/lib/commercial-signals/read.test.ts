import { beforeEach, describe, expect, it } from "vitest";

import { getCommercialSignalCountsBySeverity, getOpenCommercialSignals } from "./read";

const ORG = "91000000-0000-4000-8000-000000000001";
const OTHER_ORG = "91000000-0000-4000-8000-0000000000ff";
const SIG1 = "91300000-0000-4000-8000-000000000001";
const SIG2 = "91300000-0000-4000-8000-000000000002";
const SIG3 = "91300000-0000-4000-8000-000000000003";
const EQ1 = "91600000-0000-4000-8000-000000000001";
const EQ2 = "91600000-0000-4000-8000-000000000002";

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

const rowUrgent = {
  signal_id: SIG1,
  customer_id: "91400000-0000-4000-8000-000000000001",
  equipment_id: EQ1,
  signal_kind: "LEAK_CHECK_DUE",
  commercial_status: "DETECTED",
  severity: "URGENT",
  title: "Contrôle d'étanchéité — préparer avant le 15/12/2026",
  explanation: "Équipement EQ-001 (12 kg de R410A, ≈ 25.032 tCO₂eq).",
  facts: [
    { label: "Fluide", value: "R410A" },
    { label: "Charge", value: "12 kg" },
  ],
  next_action_hint: "À examiner — préparer un devis de contrôle en amont de l'échéance.",
  due_at: "2026-12-15T09:00:00.000Z",
  detected_at: "2026-11-01T09:00:00.000Z",
  snoozed_until: null,
  suggested_catalog_item_id: null,
  rule_snapshot: {
    matched_rule_id: "91800000-0000-4000-8000-000000000001",
    matched_rule_code: "LC-517-2024-A",
    rule_source_ref: "art.5 (UE) 2024/573",
    rule_effective_from: "2024-03-11",
    cadence_days: 180,
    tco2eq: 25.032,
    gwp_value_id: "91900000-0000-4000-8000-000000000001",
    next_due_at: "2026-12-15T09:00:00Z",
    detector_doubled: false,
    at_date: "2026-11-01",
  },
};

const rowNormal = {
  signal_id: SIG2,
  customer_id: null,
  equipment_id: EQ2,
  signal_kind: "LEAK_CHECK_DUE",
  commercial_status: "REVIEWED",
  severity: "NORMAL",
  title: "Contrôle d'étanchéité — préparer avant le 15/01/2027",
  explanation: null,
  facts: [],
  next_action_hint: null,
  due_at: "2027-01-15T09:00:00.000Z",
  detected_at: "2026-11-01T10:00:00.000Z",
  snoozed_until: null,
  suggested_catalog_item_id: null,
  rule_snapshot: {},
};

const rowHigh = {
  signal_id: SIG3,
  customer_id: null,
  equipment_id: EQ2,
  signal_kind: "LEAK_CHECK_DUE",
  commercial_status: "SNOOZED",
  severity: "HIGH",
  title: "Contrôle",
  explanation: null,
  facts: null,
  next_action_hint: null,
  due_at: null,
  detected_at: "2026-11-01T10:00:00.000Z",
  snoozed_until: "2027-02-01T00:00:00.000Z",
  suggested_catalog_item_id: null,
  rule_snapshot: null,
};

beforeEach(() => {
  state = { calls: [], returns: {}, errors: {} };
});

describe("getOpenCommercialSignals", () => {
  it("returns rows in the order the RPC provides (sort is server-side)", async () => {
    state.returns.open_commercial_signals = [rowUrgent, rowHigh, rowNormal];
    const result = await getOpenCommercialSignals(ORG, { client: fakeClient() as never });
    expect(result.map((r) => r.severity)).toEqual(["URGENT", "HIGH", "NORMAL"]);
    expect(state.calls[0]).toEqual({
      name: "open_commercial_signals",
      args: { target_organization_id: ORG },
    });
  });

  it("coerces facts safely (missing or non-object entries are dropped)", async () => {
    state.returns.open_commercial_signals = [rowHigh];
    const result = await getOpenCommercialSignals(ORG, { client: fakeClient() as never });
    expect(result[0].facts).toEqual([]);
  });

  it("coerces rule_snapshot to the empty shape when the row's snapshot is malformed", async () => {
    state.returns.open_commercial_signals = [rowHigh];
    const result = await getOpenCommercialSignals(ORG, { client: fakeClient() as never });
    expect(result[0].ruleSnapshot.matched_rule_code).toBeNull();
    expect(result[0].ruleSnapshot.cadence_days).toBeNull();
  });

  it("skips rows with unknown signal kind (defense against a schema drift)", async () => {
    state.returns.open_commercial_signals = [
      { ...rowUrgent, signal_kind: "SOMETHING_ELSE" },
      rowNormal,
    ];
    const result = await getOpenCommercialSignals(ORG, { client: fakeClient() as never });
    expect(result.map((r) => r.signalId)).toEqual([SIG2]);
  });

  it("skips rows with unknown status (defense against a schema drift)", async () => {
    state.returns.open_commercial_signals = [
      { ...rowUrgent, commercial_status: "OPEN" },
      rowNormal,
    ];
    const result = await getOpenCommercialSignals(ORG, { client: fakeClient() as never });
    expect(result.map((r) => r.signalId)).toEqual([SIG2]);
  });

  it("returns [] on cross-tenant / unauthorized 42501 (RPC error), never throws", async () => {
    state.errors.open_commercial_signals = "42501: caller is not a member";
    const result = await getOpenCommercialSignals(OTHER_ORG, { client: fakeClient() as never });
    expect(result).toEqual([]);
  });

  it("returns [] on a null response", async () => {
    state.returns.open_commercial_signals = null;
    const result = await getOpenCommercialSignals(ORG, { client: fakeClient() as never });
    expect(result).toEqual([]);
  });

  it("surfaces the customer_id, equipment_id, and snoozed_until fields", async () => {
    state.returns.open_commercial_signals = [rowUrgent, rowHigh];
    const rows = await getOpenCommercialSignals(ORG, { client: fakeClient() as never });
    const urgent = rows.find((r) => r.signalId === SIG1)!;
    expect(urgent.customerId).toBe("91400000-0000-4000-8000-000000000001");
    expect(urgent.equipmentId).toBe(EQ1);
    const snoozed = rows.find((r) => r.signalId === SIG3)!;
    expect(snoozed.snoozedUntil).toBe("2027-02-01T00:00:00.000Z");
    expect(snoozed.customerId).toBeNull();
  });
});

describe("getCommercialSignalCountsBySeverity", () => {
  it("aggregates counts and total", async () => {
    state.returns.open_commercial_signals = [rowUrgent, rowHigh, rowNormal];
    const result = await getCommercialSignalCountsBySeverity(ORG, {
      client: fakeClient() as never,
    });
    expect(result).toEqual({ URGENT: 1, HIGH: 1, NORMAL: 1, LOW: 0, total: 3 });
  });

  it("returns zeroed counts on error", async () => {
    state.errors.open_commercial_signals = "42501";
    const result = await getCommercialSignalCountsBySeverity(OTHER_ORG, {
      client: fakeClient() as never,
    });
    expect(result).toEqual({ URGENT: 0, HIGH: 0, NORMAL: 0, LOW: 0, total: 0 });
  });
});
