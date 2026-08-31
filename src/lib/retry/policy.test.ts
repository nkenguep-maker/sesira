import { describe, expect, it } from "vitest";

import {
  DEFAULT_RETRY_POLICY,
  canAttemptAgain,
  computeNextAttemptAt,
} from "./policy";

const NOW = new Date("2026-09-05T09:00:00.000Z");

describe("computeNextAttemptAt", () => {
  it("returns now + baseDelayMs on the first retry (attempt 1)", () => {
    const next = computeNextAttemptAt(NOW, 1, DEFAULT_RETRY_POLICY);
    expect(next.getTime() - NOW.getTime()).toBe(DEFAULT_RETRY_POLICY.baseDelayMs);
  });

  it("doubles the delay on each subsequent attempt", () => {
    for (const [attempt, expectedMs] of [
      [1, 60_000],
      [2, 120_000],
      [3, 240_000],
      [4, 480_000],
      [5, 960_000],
    ] as const) {
      const next = computeNextAttemptAt(NOW, attempt, DEFAULT_RETRY_POLICY);
      expect(next.getTime() - NOW.getTime()).toBe(expectedMs);
    }
  });

  it("caps the delay at maxDelayMs", () => {
    for (const attempt of [10, 20, 100]) {
      const next = computeNextAttemptAt(NOW, attempt, DEFAULT_RETRY_POLICY);
      expect(next.getTime() - NOW.getTime()).toBe(DEFAULT_RETRY_POLICY.maxDelayMs);
    }
  });

  it("is deterministic (same inputs -> same output, no jitter)", () => {
    const a = computeNextAttemptAt(NOW, 3);
    const b = computeNextAttemptAt(NOW, 3);
    expect(a.getTime()).toBe(b.getTime());
  });

  it("respects a custom policy", () => {
    const next = computeNextAttemptAt(NOW, 2, {
      maxAttempts: 3,
      baseDelayMs: 10_000,
      maxDelayMs: 60_000,
    });
    // attempt 2 -> 10_000 * 2^1 = 20_000
    expect(next.getTime() - NOW.getTime()).toBe(20_000);
  });

  it("rejects attemptCount < 1", () => {
    expect(() => computeNextAttemptAt(NOW, 0)).toThrow(/positive integer/);
    expect(() => computeNextAttemptAt(NOW, -1)).toThrow(/positive integer/);
    expect(() => computeNextAttemptAt(NOW, 1.5)).toThrow(/positive integer/);
  });

  it("rejects nonsensical policy values", () => {
    expect(() =>
      computeNextAttemptAt(NOW, 1, { maxAttempts: 5, baseDelayMs: -1, maxDelayMs: 1000 }),
    ).toThrow(/baseDelayMs/);
    expect(() =>
      computeNextAttemptAt(NOW, 1, { maxAttempts: 5, baseDelayMs: 1000, maxDelayMs: 500 }),
    ).toThrow(/maxDelayMs/);
  });
});

describe("canAttemptAgain", () => {
  it("returns true while attempts remain in the budget", () => {
    expect(canAttemptAgain(1)).toBe(true);
    expect(canAttemptAgain(4)).toBe(true);
  });

  it("returns false at the budget limit", () => {
    expect(canAttemptAgain(5)).toBe(false);
    expect(canAttemptAgain(100)).toBe(false);
  });

  it("respects a custom policy", () => {
    const policy = { maxAttempts: 3, baseDelayMs: 1000, maxDelayMs: 10_000 };
    expect(canAttemptAgain(2, policy)).toBe(true);
    expect(canAttemptAgain(3, policy)).toBe(false);
  });
});
