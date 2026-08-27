import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { BusinessTimeline } from "./business-timeline";

const organizationId = "10000000-0000-4000-8000-000000000001";
const customerId = "30000000-0000-4000-8000-000000000003";
const scopes = [{ entityType: "customer", entityIds: [customerId] }];

describe("BusinessTimeline", () => {
  it("renders its empty state", () => {
    const html = renderToStaticMarkup(
      <BusinessTimeline
        events={[]}
        organizationId={organizationId}
        scopes={scopes}
        empty="Aucune activité pour le moment."
      />,
    );

    expect(html).toContain("Aucune activité pour le moment.");
    expect(html).not.toContain("<ol");
  });

  it("renders multiple items with responsive wrapping and no raw event names", () => {
    const html = renderToStaticMarkup(
      <BusinessTimeline
        events={[
          {
            id: "one",
            organization_id: organizationId,
            type: "customer.created",
            entity_type: "customer",
            entity_id: customerId,
            source: "APP",
            payload: {},
            created_at: "2026-08-23T08:00:00.000Z",
          },
          {
            id: "two",
            organization_id: organizationId,
            type: "unknown.private_event",
            entity_type: "customer",
            entity_id: customerId,
            source: "APP",
            payload: {},
            created_at: "2026-08-23T09:00:00.000Z",
          },
        ]}
        organizationId={organizationId}
        scopes={scopes}
        entities={[{ type: "customer", id: customerId, label: "Client · Maison Martin" }]}
        empty="Aucune activité"
      />,
    );

    expect(html).toContain("Client créé");
    expect(html).toContain("Activité enregistrée");
    expect(html).toContain("sm:grid-cols-[96px_minmax(0,1fr)]");
    expect(html).toContain("border-[var(--line-soft)]");
    expect(html).not.toContain("unknown.private_event");
  });
});
