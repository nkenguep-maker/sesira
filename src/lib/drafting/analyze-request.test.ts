import { describe, expect, it } from "vitest";

import { analyzeRequestForDraft } from "./analyze-request";

describe("C23 deterministic quote draft analyzer", () => {
  it("always leaves pricing to a human even with complete contact data", () => {
    const result = analyzeRequestForDraft({
      request: { id: "request-1", title: "Pompe à chaleur", dataSummary: "Demande complète" },
      customer: { id: "customer-1", displayName: "Société Martin", email: "contact@example.com", hasConfirmedContact: true },
      currency: "EUR",
    });
    expect(result.gaps).toEqual([{ field: "amount", reason: expect.stringContaining("décision humaine") }]);
    expect(result).not.toHaveProperty("amount");
    expect(result).not.toHaveProperty("discount");
  });

  it("surfaces missing stable contact facts instead of inventing them", () => {
    const result = analyzeRequestForDraft({
      request: { id: "request-2", title: "Installation CVC" },
      customer: { id: "customer-2", displayName: null, email: null, hasConfirmedContact: false },
      currency: "CHF",
    });
    expect(result.gaps.map((gap) => gap.field)).toEqual([
      "customer_display_name",
      "recipient_email",
      "customer_confirmation",
      "amount",
    ]);
    expect(result.currency).toBe("CHF");
  });
});
