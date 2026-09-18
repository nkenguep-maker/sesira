import { beforeEach, describe, expect, it } from "vitest";

import { resumeExpiredCommercialSignals, scanCommercialEquipmentSignals } from "./scan";

const ORG = "91000000-0000-4000-8000-000000000001";
const OTHER_ORG = "91000000-0000-4000-8000-0000000000ff";

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

describe("scanCommercialEquipmentSignals", () => {
  it("returns OK with the three counters when the RPC succeeds", async () => {
    state.returns.scan_commercial_equipment_signals = [
      { detected_new: 3, updated: 2, resolved_by_scan: 1 },
    ];
    const result = await scanCommercialEquipmentSignals(ORG, { client: fakeClient() as never });
    expect(result).toEqual({ status: "OK", detectedNew: 3, updated: 2, resolvedByScan: 1 });
    expect(state.calls[0]).toEqual({
      name: "scan_commercial_equipment_signals",
      args: { target_organization_id: ORG },
    });
  });

  it("accepts a scalar row (Supabase can return a single row not wrapped in an array)", async () => {
    state.returns.scan_commercial_equipment_signals = {
      detected_new: 0,
      updated: 0,
      resolved_by_scan: 0,
    };
    const result = await scanCommercialEquipmentSignals(ORG, { client: fakeClient() as never });
    expect(result).toEqual({ status: "OK", detectedNew: 0, updated: 0, resolvedByScan: 0 });
  });

  it("returns ERROR on cross-tenant / unauthorized 42501", async () => {
    state.errors.scan_commercial_equipment_signals = "42501: caller not authorized";
    const result = await scanCommercialEquipmentSignals(OTHER_ORG, {
      client: fakeClient() as never,
    });
    expect(result.status).toBe("ERROR");
    if (result.status === "ERROR") expect(result.reason).toContain("42501");
  });

  it("returns ERROR when the RPC returns null", async () => {
    state.returns.scan_commercial_equipment_signals = null;
    const result = await scanCommercialEquipmentSignals(ORG, { client: fakeClient() as never });
    expect(result.status).toBe("ERROR");
  });

  it("returns ERROR when the RPC returns malformed counters", async () => {
    state.returns.scan_commercial_equipment_signals = [{ detected_new: "not a number" }];
    const result = await scanCommercialEquipmentSignals(ORG, { client: fakeClient() as never });
    expect(result.status).toBe("ERROR");
  });

  it("does not create an opportunity — only counters are exposed (INV-04)", async () => {
    state.returns.scan_commercial_equipment_signals = [
      { detected_new: 5, updated: 0, resolved_by_scan: 0 },
    ];
    const result = await scanCommercialEquipmentSignals(ORG, { client: fakeClient() as never });
    expect(result.status).toBe("OK");
    // No call to create_opportunity_with_quote — even implicitly.
    expect(state.calls.some((c) => c.name.includes("opportunity"))).toBe(false);
  });

  it("is idempotent from the caller's perspective — running twice with unchanged data returns the same shape", async () => {
    state.returns.scan_commercial_equipment_signals = [
      { detected_new: 0, updated: 4, resolved_by_scan: 0 },
    ];
    const r1 = await scanCommercialEquipmentSignals(ORG, { client: fakeClient() as never });
    const r2 = await scanCommercialEquipmentSignals(ORG, { client: fakeClient() as never });
    expect(r1).toEqual(r2);
  });
});

describe("resumeExpiredCommercialSignals", () => {
  it("returns the number of signals resumed", async () => {
    state.returns.resume_expired_commercial_signals = 4;
    const result = await resumeExpiredCommercialSignals(ORG, { client: fakeClient() as never });
    expect(result).toEqual({ status: "OK", resumed: 4 });
  });

  it("returns ERROR when the RPC fails", async () => {
    state.errors.resume_expired_commercial_signals = "connection reset";
    const result = await resumeExpiredCommercialSignals(ORG, { client: fakeClient() as never });
    expect(result.status).toBe("ERROR");
  });

  it("returns ERROR when the RPC returns a non-numeric value", async () => {
    state.returns.resume_expired_commercial_signals = "four";
    const result = await resumeExpiredCommercialSignals(ORG, { client: fakeClient() as never });
    expect(result.status).toBe("ERROR");
  });
});
