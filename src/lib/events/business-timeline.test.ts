import { describe, expect, it } from "vitest";

import { buildBusinessTimeline, type BusinessEvent } from "./business-timeline";

const organizationId = "10000000-0000-4000-8000-000000000001";
const otherOrganizationId = "20000000-0000-4000-8000-000000000002";
const customerId = "30000000-0000-4000-8000-000000000003";
const requestId = "40000000-0000-4000-8000-000000000004";
const quoteId = "50000000-0000-4000-8000-000000000005";
const actorId = "60000000-0000-4000-8000-000000000006";

const scopes = [
  { entityType: "customer", entityIds: [customerId] },
  { entityType: "request", entityIds: [requestId] },
  { entityType: "quote", entityIds: [quoteId] },
];

function event(overrides: Partial<BusinessEvent>): BusinessEvent {
  return {
    id: "70000000-0000-4000-8000-000000000007",
    organization_id: organizationId,
    type: "customer.created",
    entity_type: "customer",
    entity_id: customerId,
    source: "APP",
    payload: {},
    created_at: "2026-08-23T10:00:00.000Z",
    ...overrides,
  };
}

describe("unified business timeline", () => {
  it("keeps only the active organization's scoped events", () => {
    const items = buildBusinessTimeline(
      [
        event({ id: "a", type: "customer.created" }),
        event({ id: "b", organization_id: otherOrganizationId }),
        event({ id: "c", entity_id: "90000000-0000-4000-8000-000000000009" }),
      ],
      { organizationId, scopes },
    );

    expect(items.map((item) => item.id)).toEqual(["a"]);
  });

  it("sorts and translates multiple compatible events with actor, entity and metadata", () => {
    const items = buildBusinessTimeline(
      [
        event({ id: "customer", created_at: "2026-08-23T08:00:00.000Z" }),
        event({
          id: "request",
          type: "request.created",
          entity_type: "request",
          entity_id: requestId,
          payload: { actor_id: actorId, source: "WEBSITE", status: "NEW" },
          created_at: "2026-08-23T09:00:00.000Z",
        }),
        event({
          id: "quote",
          type: "quote.created",
          entity_type: "quote",
          entity_id: quoteId,
          payload: { actor_id: actorId, amount: 18450, currency: "EUR" },
          created_at: "2026-08-23T10:00:00.000Z",
        }),
      ],
      {
        organizationId,
        scopes,
        actorNames: { [actorId]: "Lina Martin" },
        entities: [{ type: "quote", id: quoteId, label: "Devis · Chauffage", href: `/app/quotes/${quoteId}` }],
      },
    );

    expect(items.map((item) => item.id)).toEqual(["quote", "request", "customer"]);
    expect(items[0]).toMatchObject({
      title: "Devis créé — 18 450 €",
      actor: "Lina Martin",
      entity: { label: "Devis · Chauffage", href: `/app/quotes/${quoteId}` },
    });
    expect(items[1].title).toBe("Nouvelle demande reçue");
    expect(items[1].metadata).toContain("Origine : Site internet");
  });

  it("uses a safe French fallback without exposing an unknown technical name", () => {
    const items = buildBusinessTimeline(
      [event({ type: "internal.unmapped_signal", source: "WEBHOOK_SECRET" })],
      { organizationId, scopes },
    );

    expect(items[0].title).toBe("Activité enregistrée");
    expect(items[0].source).toBe("Source externe");
    expect(JSON.stringify(items[0])).not.toContain("internal.unmapped_signal");
    expect(JSON.stringify(items[0])).not.toContain("WEBHOOK_SECRET");
  });
});
