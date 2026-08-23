import { describe, expect, it } from "vitest";

import type { Database } from "@/types/database";

import { attentionCategoryLabel, attentionReasonExplanation, isAttentionOverdue } from "./format";
import { buildAttentionInboxItems, entityKey } from "./view-model";

type AttentionRow = Database["public"]["Tables"]["attention_items"]["Row"];

const organizationId = "10000000-0000-4000-8000-000000000001";
const otherOrganizationId = "20000000-0000-4000-8000-000000000002";
const quoteId = "30000000-0000-4000-8000-000000000003";
const assigneeId = "40000000-0000-4000-8000-000000000004";

function row(overrides: Partial<AttentionRow>): AttentionRow {
  return {
    id: "50000000-0000-4000-8000-000000000005",
    organization_id: organizationId,
    category: "SALES",
    priority: "NORMAL",
    status: "OPEN",
    reason: "PRICE_OBJECTION",
    title: "Le client demande un geste sur le prix.",
    explanation: null,
    entity_type: "quote",
    entity_id: quoteId,
    suggested_action: "Rappelez le client avant demain.",
    assigned_user_id: assigneeId,
    due_at: "2026-08-24T09:00:00.000Z",
    resolved_at: null,
    metadata: {},
    created_at: "2026-08-23T09:00:00.000Z",
    updated_at: "2026-08-23T09:00:00.000Z",
    ...overrides,
  };
}

describe("attention inbox view model", () => {
  it("keeps only the active organization and resolves safe human context", () => {
    const items = buildAttentionInboxItems(
      [row({}), row({ id: "other", organization_id: otherOrganizationId })],
      {
        organizationId,
        entities: {
          [entityKey("quote", quoteId)]: {
            type: "quote",
            label: "Pompe à chaleur",
            amount: "18 450 €",
            href: `/app/quotes/${quoteId}`,
          },
        },
        assignees: { [assigneeId]: "Lina Martin" },
      },
    );

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      explanation: "Le client souhaite revoir le prix proposé.",
      suggested_action: "Rappelez le client avant demain.",
      assigneeName: "Lina Martin",
      entity: { type: "quote", amount: "18 450 €" },
    });
  });

  it("sorts urgent and due items first", () => {
    const items = buildAttentionInboxItems(
      [
        row({ id: "normal", due_at: null, created_at: "2026-08-23T10:00:00.000Z" }),
        row({ id: "high-later", priority: "HIGH", due_at: "2026-08-25T09:00:00.000Z" }),
        row({ id: "urgent", priority: "URGENT", due_at: null }),
        row({ id: "high-sooner", priority: "HIGH", due_at: "2026-08-24T09:00:00.000Z" }),
      ],
      { organizationId },
    );

    expect(items.map((item) => item.id)).toEqual(["urgent", "high-sooner", "high-later", "normal"]);
  });

  it("uses neutral fallbacks without exposing unknown codes", () => {
    expect(attentionCategoryLabel("PRIVATE_CATEGORY")).toBe("Autre");
    expect(attentionReasonExplanation("private.internal_reason")).toBe(
      "Cette situation demande votre vérification avant de poursuivre.",
    );
  });

  it("marks only unresolved past due items as overdue", () => {
    const now = new Date("2026-08-25T00:00:00.000Z");
    expect(isAttentionOverdue("2026-08-24T09:00:00.000Z", "OPEN", now)).toBe(true);
    expect(isAttentionOverdue("2026-08-24T09:00:00.000Z", "RESOLVED", now)).toBe(false);
    expect(isAttentionOverdue(null, "OPEN", now)).toBe(false);
  });
});
