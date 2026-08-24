import { describe, expect, it } from "vitest";

import { buildResultsPeriod, parseResultsPeriod } from "@/lib/results/period";

describe("results period", () => {
  it("selects supported periods and falls back safely", () => {
    expect(parseResultsPeriod("90d")).toBe("90d");
    expect(parseResultsPeriod("12m")).toBe("12m");
    expect(parseResultsPeriod("invalid")).toBe("30d");
    expect(parseResultsPeriod(undefined)).toBe("30d");
  });

  it("builds deterministic UTC boundaries", () => {
    const now = new Date("2026-08-24T10:00:00.000Z");

    expect(buildResultsPeriod("30d", now)).toEqual({
      key: "30d",
      label: "30 jours",
      startAt: "2026-07-25T10:00:00.000Z",
      endAt: "2026-08-24T10:00:00.000Z",
    });
    expect(buildResultsPeriod("12m", now).startAt).toBe("2025-08-24T10:00:00.000Z");
  });
});
