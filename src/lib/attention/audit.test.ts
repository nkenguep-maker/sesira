import { describe, expect, it } from "vitest";

import { AUDIT_ACTIONS, isAuditAction, recordAudit } from "./audit";

const ORG = "91000000-0000-4000-8000-000000000001";
const ATTENTION = "91600000-0000-4000-8000-000000000001";

interface RpcCall {
  name: string;
  args: Record<string, unknown>;
}

function makeFakeClient(returnValue: string | null, error?: { message: string }) {
  const calls: RpcCall[] = [];
  const client = {
    rpc(name: string, args: Record<string, unknown>) {
      calls.push({ name, args });
      return Promise.resolve({ data: returnValue, error: error ?? null });
    },
  };
  return { client, calls };
}

describe("AUDIT_ACTIONS vocabulary", () => {
  it("contains the C6 lifecycle actions", () => {
    for (const expected of [
      "attention.created",
      "attention.assigned",
      "attention.unassigned",
      "attention.resolved",
      "attention.dismissed",
      "attention.reopened",
      "automation.paused",
      "automation.resumed",
      "workflow.resumed",
    ]) {
      expect(AUDIT_ACTIONS as readonly string[]).toContain(expected);
    }
  });

  it("isAuditAction validates known values", () => {
    expect(isAuditAction("attention.resolved")).toBe(true);
    expect(isAuditAction("random.string")).toBe(false);
  });
});

describe("recordAudit", () => {
  it("calls record_audit_log with the caller's inputs", async () => {
    const { client, calls } = makeFakeClient("audit-1");
    const result = await recordAudit({
      organizationId: ORG,
      action: "attention.resolved",
      entity: { type: "attention_item", id: ATTENTION },
      metadata: { previous_status: "OPEN", next_status: "RESOLVED" },
      client: client as never,
    });
    expect(result.id).toBe("audit-1");
    expect(calls[0].name).toBe("record_audit_log");
    expect(calls[0].args).toEqual({
      target_organization_id: ORG,
      target_action: "attention.resolved",
      target_entity_type: "attention_item",
      target_entity_id: ATTENTION,
      target_metadata: { previous_status: "OPEN", next_status: "RESOLVED" },
    });
  });

  it("accepts a free-form action string (no client-side enum check)", async () => {
    const { client, calls } = makeFakeClient("audit-2");
    await recordAudit({
      organizationId: ORG,
      action: "custom.integration_event",
      client: client as never,
    });
    expect(calls[0].args.target_action).toBe("custom.integration_event");
    expect(calls[0].args.target_entity_type).toBeNull();
    expect(calls[0].args.target_entity_id).toBeNull();
  });

  it("throws on RPC error", async () => {
    const { client } = makeFakeClient(null, { message: "boom" });
    await expect(
      recordAudit({ organizationId: ORG, action: "attention.reopened", client: client as never }),
    ).rejects.toThrow(/boom/);
  });

  it("throws when the RPC returned no id", async () => {
    const { client } = makeFakeClient(null);
    await expect(
      recordAudit({ organizationId: ORG, action: "attention.reopened", client: client as never }),
    ).rejects.toThrow(/no id/);
  });
});
