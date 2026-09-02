import { describe, expect, it } from "vitest";

import { saveSoldNotScheduledPolicy, setOpportunityOperationalNextStep } from "./actions";

function fakeClient(result: { data?: unknown; error?: { message: string } | null } = { data: true, error: null }) {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  return {
    calls,
    client: {
      rpc(name: string, args: Record<string, unknown>) {
        calls.push({ name, args });
        return Promise.resolve({ data: result.data ?? null, error: result.error ?? null });
      },
    },
  };
}

describe("value policy actions", () => {
  it("persists an explicit organization policy without adding a hidden threshold", async () => {
    const fake = fakeClient();
    const result = await saveSoldNotScheduledPolicy({
      organizationId: "91000000-0000-4000-8000-000000000001",
      enabled: true,
      graceHours: 24,
      highValueAmount: null,
      note: null,
    }, { client: fake.client as never });
    expect(result).toEqual({ status: "APPLIED" });
    expect(fake.calls[0].args.target_high_value_amount).toBeNull();
    expect(fake.calls[0].args.target_grace_hours).toBe(24);
  });

  it("records the operational next step through the tenant RPC", async () => {
    const fake = fakeClient();
    const next = new Date("2026-09-15T12:00:00.000Z");
    const result = await setOpportunityOperationalNextStep({
      organizationId: "91000000-0000-4000-8000-000000000001",
      opportunityId: "92000000-0000-4000-8000-000000000001",
      nextStepAt: next,
      nextStepKind: "Intervention à planifier",
    }, { client: fake.client as never });
    expect(result).toEqual({ status: "APPLIED" });
    expect(fake.calls[0].args.target_next_step_at).toBe(next.toISOString());
    expect(fake.calls[0].args.target_source).toBe("MANUAL");
  });

  it("fails closed on RPC errors", async () => {
    const fake = fakeClient({ data: null, error: { message: "rls denied" } });
    const result = await saveSoldNotScheduledPolicy({
      organizationId: "91000000-0000-4000-8000-000000000001",
      enabled: false,
      graceHours: null,
      highValueAmount: null,
      note: null,
    }, { client: fake.client as never });
    expect(result.status).toBe("ERROR");
  });
});
