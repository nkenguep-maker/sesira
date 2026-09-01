import { describe, expect, it } from "vitest";

import { formatResultsEstimate, formatResultsMoney } from "@/lib/results/format";

describe("results formatting", () => {
  it("formats euros in French without losing large values or zero", () => {
    expect(formatResultsMoney(0).replace(/\s/g, " ")).toBe("0 €");
    expect(formatResultsMoney(1_234_567).replace(/\s/g, " ")).toBe("1 234 567 €");
  });

  it("formats hours and unavailable estimates explicitly", () => {
    expect(formatResultsEstimate({ value: 0, unit: "HOURS" })).toBe("0 h");
    expect(formatResultsEstimate({ value: 2.5, unit: "HOURS" })).toBe("2,5 h");
    expect(formatResultsEstimate({ value: null, unit: "CURRENCY", currency: "EUR" })).toBe(
      "À établir",
    );
  });
});
