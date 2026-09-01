import { describe, expect, it } from "vitest";

import {
  attentionDateToTimestamp,
  canCloseAttentionItem,
  manualQuoteAttentionInputSchema,
} from "@/lib/attention/schema";
import { customerInputSchema } from "@/lib/customers/schema";
import { buildBusinessTimeline, type BusinessEvent } from "@/lib/events/business-timeline";
import { canChangeQuoteStatus, quoteInputSchema } from "@/lib/quotes/schema";
import { requestInputSchema } from "@/lib/requests/schema";

const organizationId = "10000000-0000-4000-8000-000000000001";
const customerId = "20000000-0000-4000-8000-000000000002";
const requestId = "30000000-0000-4000-8000-000000000003";
const quoteId = "40000000-0000-4000-8000-000000000004";

describe("manual customer request quote journey", () => {
  it("keeps the same customer and request relationship through the manual flow", () => {
    const customer = customerInputSchema.parse({
      type: "COMPANY",
      displayName: "Lina Martin",
      companyName: "Maison Martin",
      email: "lina@example.fr",
      phone: "",
    });
    const request = requestInputSchema.parse({
      customerId,
      serviceCatalogItemId: "",
      title: "Remplacement du chauffage",
      source: "MANUAL",
      description: "Projet à chiffrer manuellement.",
    });
    const quote = quoteInputSchema.parse({
      customerId,
      requestId,
      ownerUserId: "",
      title: "Pompe à chaleur",
      reference: "DEV-2026-0042",
      amount: "18 450",
      expiresOn: "2099-09-30",
      nextActionOn: "2099-09-20",
    });

    expect(customer.companyName).toBe("Maison Martin");
    expect(request.customerId).toBe(customerId);
    expect(quote).toMatchObject({ customerId, requestId, amount: 18_450 });
    expect(canChangeQuoteStatus("DRAFT", "SENT")).toBe(true);
  });

  it("shows the real manual events in one customer timeline", () => {
    const events: BusinessEvent[] = [
      event("customer", customerId, "customer.created", "2026-08-23T08:00:00.000Z"),
      event("request", requestId, "request.created", "2026-08-23T09:00:00.000Z"),
      event("quote", quoteId, "quote.created", "2026-08-23T10:00:00.000Z", { amount: 18_450, currency: "EUR" }),
      event("quote", quoteId, "quote.sent", "2026-08-23T11:00:00.000Z"),
      { ...event("quote", quoteId, "quote.sent", "2026-08-23T12:00:00.000Z"), organization_id: "90000000-0000-4000-8000-000000000009" },
    ];
    const items = buildBusinessTimeline(events, {
      organizationId,
      scopes: [
        { entityType: "customer", entityIds: [customerId] },
        { entityType: "request", entityIds: [requestId] },
        { entityType: "quote", entityIds: [quoteId] },
      ],
    });

    expect(items.map((item) => item.title)).toEqual([
      "Devis envoyé",
      "Devis créé — 18 450 €",
      "Nouvelle demande reçue",
      "Client créé",
    ]);
  });

  it("creates and resolves a manual quote decision without automation fields", () => {
    const attention = manualQuoteAttentionInputSchema.parse({
      quoteId,
      title: "Le client demande un geste sur le prix.",
      explanation: "Une décision commerciale est nécessaire.",
      suggestedAction: "Appeler le client avant vendredi.",
      priority: "HIGH",
      dueOn: "2099-09-20",
    });

    expect(attention.quoteId).toBe(quoteId);
    expect(attentionDateToTimestamp(attention.dueOn)).toBe("2099-09-20T12:00:00.000Z");
    expect(canCloseAttentionItem("OPEN")).toBe(true);
    expect(canCloseAttentionItem("RESOLVED")).toBe(false);
  });
});

function event(
  entityType: string,
  entityId: string,
  type: string,
  createdAt: string,
  payload: BusinessEvent["payload"] = {},
): BusinessEvent {
  return {
    id: `${entityType}-${type}-${createdAt}`,
    organization_id: organizationId,
    type,
    entity_type: entityType,
    entity_id: entityId,
    source: "APP",
    payload,
    created_at: createdAt,
  };
}
