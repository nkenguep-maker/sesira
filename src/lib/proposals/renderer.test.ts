import { describe, expect, it } from "vitest";

import { renderProposalEmail } from "./renderer";
import type { ProposalSnapshot } from "./snapshot";

const snapshot: ProposalSnapshot = {
  proposal: {
    anchor_quote_id: "10000000-0000-4000-8000-000000000001",
    opportunity_id: "30000000-0000-4000-8000-000000000001",
    reference: "D-001",
    title: "Remplacement installation",
  },
  customer: {
    id: "20000000-0000-4000-8000-000000000001",
    display_name: "Martin & Fils",
    company_name: "Martin & Fils",
    email: "contact@example.com",
    phone: null,
  },
  variants: [
    {
      quote_id: "10000000-0000-4000-8000-000000000001",
      reference: "D-001-A",
      title: "Essentiel",
      amount: 1200,
      currency: "EUR",
      variant_key: "essential",
      revision: 1,
      expires_at: null,
      order: 0,
      recommended: false,
      options: [],
    },
    {
      quote_id: "10000000-0000-4000-8000-000000000002",
      reference: "D-001-B",
      title: "Confort",
      amount: 1600,
      currency: "EUR",
      variant_key: "comfort",
      revision: 1,
      expires_at: null,
      order: 1,
      recommended: true,
      options: [
        {
          id: "40000000-0000-4000-8000-000000000001",
          option_key: "maintenance",
          name: "Maintenance annuelle",
          amount: 180,
          currency: "EUR",
          status: "PROPOSED",
          ordinal: 0,
          metadata: {},
        },
      ],
    },
  ],
  approved_at: "2026-09-18T12:00:00Z",
};

describe("renderProposalEmail", () => {
  it("renders all commercial variants from the approved snapshot", () => {
    const rendered = renderProposalEmail(snapshot);
    expect(rendered.to).toBe("contact@example.com");
    expect(rendered.subject).toContain("Remplacement installation");
    expect(rendered.text).toContain("Option 1 — Essentiel");
    expect(rendered.text).toContain("Option 2 — Confort — recommandée");
    expect(rendered.text).toContain("Maintenance annuelle");
  });

  it("escapes customer-controlled HTML", () => {
    const rendered = renderProposalEmail({
      ...snapshot,
      customer: { ...snapshot.customer, display_name: "<Client>" },
    });
    expect(rendered.html).toContain("&lt;Client&gt;");
    expect(rendered.html).not.toContain("<Client>");
  });

  it("refuses to render a sendable email without a recipient", () => {
    expect(() =>
      renderProposalEmail({
        ...snapshot,
        customer: { ...snapshot.customer, email: null },
      }),
    ).toThrow(/no customer email/);
  });
});
