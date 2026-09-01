import { describe, expect, it } from "vitest";

import { calculateDiagnostic } from "@/lib/diagnostic/calculator";
import type { DiagnosticInput } from "@/lib/diagnostic/contracts";

const cvcInput: DiagnosticInput = {
  sector: "CVC",
  employees: 12,
  technicians: 8,
  monthlyRequests: 40,
  monthlyQuotes: 24,
  averageQuoteAmount: 18_450,
  approximateMarginPercent: 30,
  weeklyAdminHours: 20,
};

describe("diagnostic calculator", () => {
  it("calculates scenarios only from declared inputs and visible rules", () => {
    const result = calculateDiagnostic(cvcInput);

    expect(result.monthlyAdminHours).toBe(86.7);
    expect(result.monthlyQuotedValue).toBe(442_800);
    expect(result.monthlyQuotedMarginPool).toBe(132_840);
    expect(result.scenarios).toEqual([
      expect.objectContaining({ key: "PRUDENT", recoveredHoursPerMonth: 13, marginPotentialPerMonth: 1_328 }),
      expect.objectContaining({ key: "PROBABLE", recoveredHoursPerMonth: 26, marginPotentialPerMonth: 3_985 }),
      expect.objectContaining({ key: "HIGH_POTENTIAL", recoveredHoursPerMonth: 39, marginPotentialPerMonth: 6_642 }),
    ]);
  });

  it("returns exactly three priorities with direct evidence", () => {
    const result = calculateDiagnostic(cvcInput);

    expect(result.priorities).toHaveLength(3);
    expect(result.priorities.map((priority) => priority.key)).toEqual(["REQUESTS", "QUOTES", "ADMIN"]);
    expect(result.priorities[0].evidence).toContain("16 demande");
  });

  it("keeps zero activity at zero without fabricating value", () => {
    const result = calculateDiagnostic({
      ...cvcInput,
      monthlyRequests: 0,
      monthlyQuotes: 0,
      averageQuoteAmount: 0,
      approximateMarginPercent: 0,
      weeklyAdminHours: 0,
    });

    expect(result.monthlyQuotedValue).toBe(0);
    expect(result.monthlyQuotedMarginPool).toBe(0);
    expect(result.scenarios.every((scenario) => scenario.marginPotentialPerMonth === 0)).toBe(true);
    expect(result.scenarios.every((scenario) => scenario.recoveredHoursPerMonth === 0)).toBe(true);
  });

  it("rejects inconsistent team and quote inputs", () => {
    expect(() => calculateDiagnostic({ ...cvcInput, technicians: 13 })).toThrow();
    expect(() => calculateDiagnostic({ ...cvcInput, averageQuoteAmount: 0 })).toThrow();
  });
});
