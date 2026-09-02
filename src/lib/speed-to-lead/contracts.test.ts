import { describe, expect, it } from "vitest";

import { measureSpeedToLead, parseSpeedToLeadPolicy, parseSpeedToLeadSummary } from "./contracts";

const NOW = new Date("2026-09-03T10:00:00.000Z");

describe("C22 Speed to Lead contracts", () => {
  it("has no universal target when the organization has not configured one", () => {
    expect(parseSpeedToLeadPolicy({})).toMatchObject({
      configured: false,
      enabled: false,
      targetMinutes: null,
      measurement: "FIRST_INTERNAL_HANDLING",
      humanRequired: true,
      automationEligible: false,
    });
  });

  it("marks a new request overdue only after the organization target", () => {
    const policy = { enabled: true, targetMinutes: 60 };
    expect(measureSpeedToLead({ status: "NEW", createdAt: "2026-09-03T09:30:00.000Z", firstHandledAt: null }, policy, NOW).state).toBe("PENDING");
    const overdue = measureSpeedToLead({ status: "NEW", createdAt: "2026-09-03T08:00:00.000Z", firstHandledAt: null }, policy, NOW);
    expect(overdue.state).toBe("OVERDUE");
    expect(overdue.elapsedMinutes).toBe(120);
    expect(overdue.dueAt).toBe("2026-09-03T09:00:00.000Z");
  });

  it("measures the first internal handling without claiming a customer reply", () => {
    const measured = measureSpeedToLead(
      { status: "PROCESSING", createdAt: "2026-09-03T08:00:00.000Z", firstHandledAt: "2026-09-03T08:18:00.000Z" },
      { enabled: true, targetMinutes: 30 },
      NOW,
    );
    expect(measured).toMatchObject({ state: "HANDLED", handlingMinutes: 18 });
  });

  it("does not fabricate historical handling for a non NEW request without an observed timestamp", () => {
    const measured = measureSpeedToLead(
      { status: "QUALIFIED", createdAt: "2026-08-01T08:00:00.000Z", firstHandledAt: null },
      { enabled: true, targetMinutes: 30 },
      NOW,
    );
    expect(measured.state).toBe("UNMEASURABLE");
    expect(measured.handlingMinutes).toBeNull();
  });

  it("parses only measured summary values", () => {
    expect(parseSpeedToLeadSummary({
      configured: true,
      enabled: true,
      target_minutes: 45,
      pending_count: 7,
      overdue_count: 2,
      oldest_pending_minutes: 91.5,
      handled_sample_count: 18,
      average_handling_minutes: 22.4,
      measurement: "FIRST_INTERNAL_HANDLING",
      window_days: 30,
    })).toMatchObject({ targetMinutes: 45, pendingCount: 7, overdueCount: 2, handledSampleCount: 18, averageHandlingMinutes: 22.4 });

    expect(parseSpeedToLeadSummary({ measurement: "CUSTOMER_REPLY" })).toBeNull();
  });
});
