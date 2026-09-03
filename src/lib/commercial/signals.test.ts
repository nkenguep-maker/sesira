import { describe, expect, it } from "vitest";

import { buildCommercialSignalFactors, type OpportunityCommercialSnapshot } from "./signals";

const SNAPSHOT: OpportunityCommercialSnapshot = {
  opportunity: { id: "o", openedAt: "2026-08-01T00:00:00Z", updatedAt: "2026-09-01T00:00:00Z", commercialState: "ACTIVE", estimatedValue: 20000, currency: "EUR" },
  latestQuote: { id: "q", status: "SENT", sentAt: "2026-08-28T00:00:00Z", updatedAt: "2026-08-28T00:00:00Z", nextActionAt: null, automationPausedAt: null, automationPauseReason: null, optedOutAt: null },
  lastInbound: { messageId: "m", receivedAt: "2026-08-30T00:00:00Z", intent: "PRICE_OBJECTION", confidence: 0.8 },
  objections: [],
  emailOpenSignalUsed: false,
};

describe("buildCommercialSignalFactors", () => {
  it("returns explainable factors without a composite score", () => {
    const factors = buildCommercialSignalFactors(SNAPSHOT, new Date("2026-09-02T00:00:00Z"));
    expect(factors.some((factor) => factor.key === "OPPORTUNITY_AGE")).toBe(true);
    expect(factors.some((factor) => factor.key === "LAST_REPLY")).toBe(true);
    expect((factors as unknown as Array<Record<string, unknown>>).every((factor) => !("score" in factor))).toBe(true);
  });

  it("explicitly refuses email opens as buying-interest evidence", () => {
    const factors = buildCommercialSignalFactors(SNAPSHOT);
    const opens = factors.find((factor) => factor.key === "EMAIL_OPENS");
    expect(opens?.value).toContain("Non utilisées");
    expect(opens?.caution).toContain("ne prouve pas");
  });
});
