import { describe, expect, it } from "vitest";

import { safeParseProposalSnapshot } from "./snapshot";

const UUID = {
  quote: "10000000-0000-4000-8000-000000000001",
  customer: "20000000-0000-4000-8000-000000000001",
  opportunity: "30000000-0000-4000-8000-000000000001",
  option: "40000000-0000-4000-8000-000000000001",
};

function fixture() {
  return {
    proposal: {
      anchor_quote_id: UUID.quote,
      opportunity_id: UUID.opportunity,
      reference: "D-2026-001",
      title: "Proposition",
    },
    customer: {
      id: UUID.customer,
      display_name: "Client Test",
      company_name: "Client SAS",
      email: "client@example.com",
      phone: null,
    },
    variants: [
      {
        quote_id: UUID.quote,
        reference: "D-2026-001",
        title: "Essentiel",
        amount: 1200,
        currency: "EUR",
        variant_key: "essential",
        revision: 1,
        expires_at: null,
        order: 0,
        recommended: true,
        options: [
          {
            id: UUID.option,
            option_key: "maintenance",
            name: "Maintenance",
            amount: "120.00",
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
}

describe("proposal snapshot", () => {
  it("accepts the immutable snapshot contract", () => {
    const parsed = safeParseProposalSnapshot(fixture());
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.variants[0].recommended).toBe(true);
      expect(parsed.data.customer.email).toBe("client@example.com");
    }
  });

  it("rejects a snapshot without variants", () => {
    const value = fixture();
    value.variants = [];
    expect(safeParseProposalSnapshot(value).success).toBe(false);
  });

  it("rejects an invalid customer email", () => {
    const value = fixture();
    value.customer.email = "not-an-email";
    expect(safeParseProposalSnapshot(value).success).toBe(false);
  });
});
