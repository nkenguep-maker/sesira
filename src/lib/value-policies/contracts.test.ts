import { describe, expect, it } from "vitest";

import { parseSoldNotScheduledPolicy } from "./contracts";

describe("parseSoldNotScheduledPolicy", () => {
  it("returns an explicitly unconfigured policy when the organization has no policy", () => {
    expect(parseSoldNotScheduledPolicy({})).toMatchObject({
      configured: false,
      enabled: false,
      graceHours: null,
      highValueAmount: null,
      humanRequired: true,
      automationEligible: false,
    });
  });

  it("maps an organization policy without inventing defaults", () => {
    const policy = parseSoldNotScheduledPolicy({
      value_policies: {
        sold_not_scheduled: {
          configured: true,
          enabled: true,
          grace_hours: 36,
          high_value_amount: 25000,
          currency: "EUR",
          note: "Priorité direction",
          updated_at: "2026-09-02T12:00:00Z",
        },
      },
    });
    expect(policy).toEqual({
      configured: true,
      enabled: true,
      graceHours: 36,
      highValueAmount: 25000,
      currency: "EUR",
      note: "Priorité direction",
      humanRequired: true,
      automationEligible: false,
      updatedAt: "2026-09-02T12:00:00Z",
    });
  });

  it("refuses malformed numeric values instead of silently coercing them", () => {
    const policy = parseSoldNotScheduledPolicy({
      value_policies: { sold_not_scheduled: { configured: true, enabled: true, grace_hours: "24", high_value_amount: -1 } },
    });
    expect(policy.graceHours).toBeNull();
    expect(policy.highValueAmount).toBeNull();
  });
});
