import { describe, expect, it } from "vitest";

import { commercialSignalSeverityFromDue } from "./severity";

const NOW = new Date("2026-11-01T12:00:00.000Z");
const day = 24 * 60 * 60 * 1000;

describe("commercialSignalSeverityFromDue", () => {
  it("returns LOW when dueAt is null", () => {
    expect(commercialSignalSeverityFromDue(null, NOW)).toBe("LOW");
  });

  it("returns LOW when dueAt is an unparseable string", () => {
    expect(commercialSignalSeverityFromDue("not-a-date", NOW)).toBe("LOW");
  });

  it("returns URGENT when overdue", () => {
    expect(commercialSignalSeverityFromDue(new Date(NOW.getTime() - day), NOW)).toBe("URGENT");
  });

  it("returns URGENT at the boundary (due right now)", () => {
    expect(commercialSignalSeverityFromDue(new Date(NOW.getTime()), NOW)).toBe("URGENT");
  });

  it("returns URGENT when due in <=7 days", () => {
    expect(commercialSignalSeverityFromDue(new Date(NOW.getTime() + 7 * day), NOW)).toBe("URGENT");
    expect(commercialSignalSeverityFromDue(new Date(NOW.getTime() + 1 * day), NOW)).toBe("URGENT");
  });

  it("returns HIGH when due within 8-30 days", () => {
    expect(commercialSignalSeverityFromDue(new Date(NOW.getTime() + 8 * day), NOW)).toBe("HIGH");
    expect(commercialSignalSeverityFromDue(new Date(NOW.getTime() + 30 * day), NOW)).toBe("HIGH");
  });

  it("returns NORMAL when due within 31-90 days", () => {
    expect(commercialSignalSeverityFromDue(new Date(NOW.getTime() + 31 * day), NOW)).toBe("NORMAL");
    expect(commercialSignalSeverityFromDue(new Date(NOW.getTime() + 90 * day), NOW)).toBe("NORMAL");
  });

  it("returns LOW when due beyond 90 days", () => {
    expect(commercialSignalSeverityFromDue(new Date(NOW.getTime() + 91 * day), NOW)).toBe("LOW");
    expect(commercialSignalSeverityFromDue(new Date(NOW.getTime() + 365 * day), NOW)).toBe("LOW");
  });

  it("accepts an ISO string as input", () => {
    const dueIso = new Date(NOW.getTime() + 15 * day).toISOString();
    expect(commercialSignalSeverityFromDue(dueIso, NOW)).toBe("HIGH");
  });
});
