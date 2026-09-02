import { beforeEach, describe, expect, it } from "vitest";

import {
  isSensitiveWorkflowMode,
  isWorkflowMode,
  resolveValuePolicy,
  WORKFLOW_MODES,
} from "./value";

const ORG = "91000000-0000-4000-8000-000000000001";

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

describe("workflow-mode helpers", () => {
  it("recognizes every mode as valid", () => {
    for (const m of WORKFLOW_MODES) expect(isWorkflowMode(m)).toBe(true);
    expect(isWorkflowMode("UNKNOWN")).toBe(false);
  });
  it("flags APPROVAL / HUMAN_FIRST as sensitive", () => {
    expect(isSensitiveWorkflowMode("APPROVAL")).toBe(true);
    expect(isSensitiveWorkflowMode("HUMAN_FIRST")).toBe(true);
    expect(isSensitiveWorkflowMode("AUTOMATIC")).toBe(false);
    expect(isSensitiveWorkflowMode("SHADOW")).toBe(false);
  });
});

describe("resolveValuePolicy", () => {
  it("returns MATCHED when RPC returns a row", async () => {
    state.returnMap.resolve_value_policy = [{
      policy_id: "pol-1",
      required_workflow_mode: "APPROVAL",
      reason: "value >= 5000 EUR",
    }];
    const r = await resolveValuePolicy({
      organizationId: ORG, appliesTo: "quote", amount: 7500, currency: "EUR",
      client: fakeClient() as never,
    });
    expect(r.status).toBe("MATCHED");
    if (r.status !== "MATCHED") return;
    expect(r.policyId).toBe("pol-1");
    expect(r.requiredWorkflowMode).toBe("APPROVAL");
    expect(r.reason).toBe("value >= 5000 EUR");
  });

  it("returns NO_POLICY when RPC returns empty", async () => {
    state.returnMap.resolve_value_policy = [];
    const r = await resolveValuePolicy({
      organizationId: ORG, appliesTo: "quote", amount: 500,
      client: fakeClient() as never,
    });
    expect(r).toEqual({ status: "NO_POLICY" });
  });

  it("returns ERROR on RPC error", async () => {
    state.errorMap.resolve_value_policy = "42501: unauthorized";
    const r = await resolveValuePolicy({
      organizationId: ORG, appliesTo: "opportunity", amount: 100,
      client: fakeClient() as never,
    });
    expect(r.status).toBe("ERROR");
  });

  it("returns ERROR on unknown workflow mode from RPC", async () => {
    state.returnMap.resolve_value_policy = [{
      policy_id: "pol-x", required_workflow_mode: "WHATEVER", reason: "x",
    }];
    const r = await resolveValuePolicy({
      organizationId: ORG, appliesTo: "quote", amount: 1,
      client: fakeClient() as never,
    });
    expect(r.status).toBe("ERROR");
  });

  it("defaults currency to EUR", async () => {
    state.returnMap.resolve_value_policy = [];
    await resolveValuePolicy({
      organizationId: ORG, appliesTo: "quote", amount: 1,
      client: fakeClient() as never,
    });
    expect(state.rpcCalls[0].args.target_currency).toBe("EUR");
  });
});
