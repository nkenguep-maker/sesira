import { describe, expect, it } from "vitest";

import {
  DEFAULT_LOSS_ASSUMPTIONS,
  calculateLossDiagnostic,
  comparisonMessage,
  simulateFollowUpLoss,
} from "@/lib/diagnostic/loss-calculator";

const exampleInput = {
  monthlyQuotes: 25,
  averageQuoteAmount: 5_000,
  followUpHabit: 0.6 as const,
  unscheduledJobs: 4,
  overdueInvoices: 12_500,
};

describe("four-step loss diagnostic", () => {
  it("matches the reference example exactly", () => {
    const result = calculateLossDiagnostic(exampleInput);

    expect(result.annualQuotedVolume).toBe(1_500_000);
    expect(result.unansweredQuotesPerMonth).toBe(10);
    expect(result.neverFollowedUpPerMonth).toBe(6);
    expect(result.annualQuoteLoss).toBe(36_000);
    expect(result.annualQuoteLossLow).toBe(18_000);
    expect(result.annualQuoteLossHigh).toBe(54_000);
    expect(result.annualQuoteLossShare).toBe(0.024);
    expect(result.signedValueWaitingForDate).toBe(20_000);
    expect(result.unscheduledRisk).toBe(2_000);
    expect(result.overdueInvoices).toBe(12_500);
  });

  it("simulates a weekly follow-up without adding unrelated money", () => {
    const simulation = simulateFollowUpLoss(exampleInput, DEFAULT_LOSS_ASSUMPTIONS, 0.1);

    expect(simulation.simulatedLoss).toBe(6_000);
    expect(simulation.difference).toBe(30_000);
  });

  it("keeps all-zero inputs honest", () => {
    const result = calculateLossDiagnostic({
      monthlyQuotes: 0,
      averageQuoteAmount: 0,
      followUpHabit: 0.1,
      unscheduledJobs: 0,
      overdueInvoices: 0,
    });

    expect(result.annualQuoteLoss).toBe(0);
    expect(result.signedValueWaitingForDate).toBe(0);
    expect(result.overdueInvoices).toBe(0);
    expect(comparisonMessage(0, 0)).toContain("rien ne se perd");
  });

  it("describes estimate comparisons without claiming recovery", () => {
    expect(comparisonMessage(15_000, 36_000)).toContain("ne se voit pas");
    expect(comparisonMessage(34_000, 36_000)).toContain("Vous saviez déjà");
    expect(comparisonMessage(60_000, 36_000)).toContain("volontairement prudent");
  });

  it("rejects impossible percentages", () => {
    expect(() => calculateLossDiagnostic(exampleInput, {
      ...DEFAULT_LOSS_ASSUMPTIONS,
      additionalFollowUpConversionShare: 1.2,
    })).toThrow();
  });
});
