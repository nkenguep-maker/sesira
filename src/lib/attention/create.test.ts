import { describe, expect, it } from "vitest";

import { createWorkflowAttention } from "./create";

const ORG = "91000000-0000-4000-8000-000000000001";
const QUOTE = "91500000-0000-4000-8000-000000000001";
const USER = "91100000-0000-4000-8000-000000000099";

interface RpcCall {
  name: string;
  args: Record<string, unknown>;
}

function makeFakeClient(returnRows: Array<{ id: string; created: boolean }>) {
  const calls: RpcCall[] = [];
  const client = {
    rpc(name: string, args: Record<string, unknown>) {
      calls.push({ name, args });
      const next = returnRows.shift();
      return Promise.resolve({ data: next ? [next] : [], error: null });
    },
    from() {
      throw new Error("fake client from() should not be called");
    },
  };
  return { client, calls };
}

describe("createWorkflowAttention", () => {
  it("passes typed reason + default category + default priority to the RPC", async () => {
    const { client, calls } = makeFakeClient([{ id: "att-1", created: true }]);
    const result = await createWorkflowAttention({
      organizationId: ORG,
      reason: "COMPLAINT_HOLD",
      sourceKind: "shadow_complaint_hold",
      sourceId: QUOTE,
      title: "Réclamation client",
      entity: { type: "quote", id: QUOTE },
      // deliberately no explicit priority / category — helper defaults
      client: client as never,
    });
    expect(result.created).toBe(true);
    expect(calls[0].name).toBe("insert_attention_once");
    expect(calls[0].args).toMatchObject({
      target_organization_id: ORG,
      target_reason: "COMPLAINT_HOLD",
      target_category: "COMPLIANCE",
      target_priority: "URGENT",
      target_entity_type: "quote",
      target_entity_id: QUOTE,
    });
  });

  it("derives a stable idempotency key from (sourceKind, sourceId)", async () => {
    const { client, calls } = makeFakeClient([
      { id: "att-1", created: true },
      { id: "att-1", created: false },
    ]);
    const first = await createWorkflowAttention({
      organizationId: ORG,
      reason: "COMPLAINT_HOLD",
      sourceKind: "shadow_complaint_hold",
      sourceId: QUOTE,
      title: "Réclamation client",
      entity: { type: "quote", id: QUOTE },
      client: client as never,
    });
    const second = await createWorkflowAttention({
      organizationId: ORG,
      reason: "COMPLAINT_HOLD",
      sourceKind: "shadow_complaint_hold",
      sourceId: QUOTE,
      // deliberately different title — must not defeat dedup
      title: "Nouvelle formulation",
      entity: { type: "quote", id: QUOTE },
      client: client as never,
    });
    expect(first.key).toBe(second.key);
    expect(first.key).toBe(`attention:shadow_complaint_hold:${QUOTE}`);
    expect(second.created).toBe(false);
    expect(calls[0].args.target_idempotency_key).toBe(calls[1].args.target_idempotency_key);
    // both calls carry different titles — proves title is never part of identity
    expect(calls[0].args.target_title).not.toBe(calls[1].args.target_title);
  });

  it("merges provenance fields into metadata alongside reason + source", async () => {
    const { client, calls } = makeFakeClient([{ id: "att-1", created: true }]);
    await createWorkflowAttention({
      organizationId: ORG,
      reason: "INTEGRATION_ISSUE",
      sourceKind: "shadow_integration_issue",
      sourceId: QUOTE,
      title: "Coordonnées manquantes",
      entity: { type: "quote", id: QUOTE },
      provenance: {
        automationRunId: "91800000-0000-4000-8000-000000000001",
        automationConfigId: "91700000-0000-4000-8000-000000000001",
      },
      metadata: { extra: "diag" },
      client: client as never,
    });
    const metadata = calls[0].args.target_metadata as Record<string, unknown>;
    expect(metadata.reason).toBe("INTEGRATION_ISSUE");
    expect(metadata.source_kind).toBe("shadow_integration_issue");
    expect(metadata.source_id).toBe(QUOTE);
    expect(metadata.automation_run_id).toBe("91800000-0000-4000-8000-000000000001");
    expect(metadata.automation_config_id).toBe("91700000-0000-4000-8000-000000000001");
    expect(metadata.extra).toBe("diag");
    expect(metadata.schema_version).toBe(1);
  });

  it("allows caller to override category and priority", async () => {
    const { client, calls } = makeFakeClient([{ id: "att-1", created: true }]);
    await createWorkflowAttention({
      organizationId: ORG,
      reason: "COMPLAINT_HOLD",
      sourceKind: "shadow_complaint_hold",
      sourceId: QUOTE,
      title: "Réclamation VIP",
      entity: { type: "quote", id: QUOTE },
      category: "SALES", // override default COMPLIANCE
      priority: "LOW",   // override default URGENT
      client: client as never,
    });
    expect(calls[0].args.target_category).toBe("SALES");
    expect(calls[0].args.target_priority).toBe("LOW");
  });

  it("passes explicit assignee and due date to the RPC", async () => {
    const { client, calls } = makeFakeClient([{ id: "att-1", created: true }]);
    const dueAt = new Date("2026-09-15T09:00:00.000Z");
    await createWorkflowAttention({
      organizationId: ORG,
      reason: "APPROVAL_REQUIRED",
      sourceKind: "shadow_approval_required",
      sourceId: QUOTE,
      title: "Approbation à traiter",
      entity: { type: "quote", id: QUOTE },
      assignedUserId: USER,
      dueAt,
      client: client as never,
    });
    expect(calls[0].args.target_assigned_user_id).toBe(USER);
    expect(calls[0].args.target_due_at).toBe(dueAt.toISOString());
  });
});
