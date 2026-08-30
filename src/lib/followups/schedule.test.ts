import { describe, expect, it } from "vitest";

import {
  DEFAULT_QUOTE_FOLLOWUP_OFFSETS_DAYS,
  MILLIS_PER_DAY,
  QUOTE_FOLLOWUP_TEMPLATE_KEY,
  computeQuoteFollowupSchedule,
  decideQuoteFollowup,
  nextQuoteFollowupStep,
  quoteFollowupConfigSchema,
  quoteFollowupIdempotencyKey,
} from "./schedule";

const QUOTE_ID = "01234567-89ab-cdef-0123-456789abcdef";

// A fixed reference instant in UTC (2026-03-01 09:00Z) — every test
// uses this so failures are easy to reason about across timezones.
const SENT_AT = new Date(Date.UTC(2026, 2, 1, 9, 0, 0));

describe("default schedule constants", () => {
  it("is J+3, J+7, J+14 in that order", () => {
    expect(DEFAULT_QUOTE_FOLLOWUP_OFFSETS_DAYS).toEqual([3, 7, 14]);
  });

  it("uses the stable template key", () => {
    expect(QUOTE_FOLLOWUP_TEMPLATE_KEY).toBe("quote_followup_schedule");
  });
});

describe("computeQuoteFollowupSchedule", () => {
  it("returns exact J+3 / J+7 / J+14 timestamps in UTC", () => {
    const schedule = computeQuoteFollowupSchedule(SENT_AT);
    expect(schedule).toEqual([
      { step: 1, scheduledFor: new Date(Date.UTC(2026, 2, 4, 9, 0, 0)) },
      { step: 2, scheduledFor: new Date(Date.UTC(2026, 2, 8, 9, 0, 0)) },
      { step: 3, scheduledFor: new Date(Date.UTC(2026, 2, 15, 9, 0, 0)) },
    ]);
  });

  it("keeps hour/minute/second stable across a DST boundary (Europe/Paris changes but UTC does not)", () => {
    // 2026-03-27 12:00Z is right before the EU DST spring-forward on
    // 2026-03-29. J+3 lands after DST but the UTC instant is
    // unchanged — the presentation layer handles Paris local time.
    const sentAt = new Date(Date.UTC(2026, 2, 27, 12, 0, 0));
    const [first] = computeQuoteFollowupSchedule(sentAt);
    expect(first.scheduledFor.toISOString()).toBe("2026-03-30T12:00:00.000Z");
  });

  it("honours custom offsets from org config", () => {
    const schedule = computeQuoteFollowupSchedule(SENT_AT, [1, 4]);
    expect(schedule).toHaveLength(2);
    expect(schedule[0].scheduledFor.getTime() - SENT_AT.getTime()).toBe(1 * MILLIS_PER_DAY);
    expect(schedule[1].scheduledFor.getTime() - SENT_AT.getTime()).toBe(4 * MILLIS_PER_DAY);
  });

  it("returns an empty array for an empty offsets list", () => {
    expect(computeQuoteFollowupSchedule(SENT_AT, [])).toEqual([]);
  });
});

describe("nextQuoteFollowupStep", () => {
  it("skips already-fired steps and returns the next one regardless of time", () => {
    const next = nextQuoteFollowupStep(SENT_AT, DEFAULT_QUOTE_FOLLOWUP_OFFSETS_DAYS, new Set([1, 2]));
    expect(next?.step).toBe(3);
  });

  it("returns null when every step has been fired", () => {
    const next = nextQuoteFollowupStep(SENT_AT, DEFAULT_QUOTE_FOLLOWUP_OFFSETS_DAYS, new Set([1, 2, 3]));
    expect(next).toBeNull();
  });

  it("returns the first step when nothing has fired yet", () => {
    const next = nextQuoteFollowupStep(SENT_AT);
    expect(next?.step).toBe(1);
  });
});

describe("quoteFollowupIdempotencyKey", () => {
  it("formats as quote_followup:{id}:step:{n}", () => {
    expect(quoteFollowupIdempotencyKey(QUOTE_ID, 2)).toBe(
      `quote_followup:${QUOTE_ID}:step:2`,
    );
  });

  it("rejects non-positive step numbers", () => {
    expect(() => quoteFollowupIdempotencyKey(QUOTE_ID, 0)).toThrow();
    expect(() => quoteFollowupIdempotencyKey(QUOTE_ID, -1)).toThrow();
    expect(() => quoteFollowupIdempotencyKey(QUOTE_ID, 1.5)).toThrow();
  });
});

describe("quoteFollowupConfigSchema", () => {
  it("accepts a canonical org override", () => {
    const parsed = quoteFollowupConfigSchema.parse({ offsets_days: [2, 5, 10] });
    expect(parsed.offsets_days).toEqual([2, 5, 10]);
  });

  it("rejects negative, decimal, or absurd offsets", () => {
    expect(quoteFollowupConfigSchema.safeParse({ offsets_days: [-1] }).success).toBe(false);
    expect(quoteFollowupConfigSchema.safeParse({ offsets_days: [1.5] }).success).toBe(false);
    expect(quoteFollowupConfigSchema.safeParse({ offsets_days: [400] }).success).toBe(false);
  });

  it("rejects empty or oversized schedules", () => {
    expect(quoteFollowupConfigSchema.safeParse({ offsets_days: [] }).success).toBe(false);
    expect(
      quoteFollowupConfigSchema.safeParse({
        offsets_days: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      }).success,
    ).toBe(false);
  });
});

describe("decideQuoteFollowup", () => {
  const baseInputs = {
    sentAt: SENT_AT,
    status: "SENT" as const,
    automationPausedAt: null,
    optedOutAt: null,
    automationEnabled: true,
  };

  const midStep1 = new Date(Date.UTC(2026, 2, 4, 12, 0, 0)); // 3h after step 1
  const beforeStep1 = new Date(Date.UTC(2026, 2, 2, 9, 0, 0)); // 1 day before

  it("fires DUE with step 1 exactly at the scheduled instant", () => {
    const result = decideQuoteFollowup(midStep1, baseInputs);
    expect(result).toEqual({
      kind: "DUE",
      step: {
        step: 1,
        scheduledFor: new Date(Date.UTC(2026, 2, 4, 9, 0, 0)),
      },
    });
  });

  it("returns NOT_YET_DUE before step 1", () => {
    expect(decideQuoteFollowup(beforeStep1, baseInputs)).toEqual({
      kind: "STOP",
      reason: "NOT_YET_DUE",
    });
  });

  it("returns OPTED_OUT before every other guard", () => {
    const result = decideQuoteFollowup(midStep1, {
      ...baseInputs,
      optedOutAt: new Date(),
      automationPausedAt: new Date(),
      automationEnabled: false,
      status: "REPLIED",
    });
    expect(result).toEqual({ kind: "STOP", reason: "OPTED_OUT" });
  });

  it("returns AUTOMATION_PAUSED when paused (and not opted out)", () => {
    expect(
      decideQuoteFollowup(midStep1, { ...baseInputs, automationPausedAt: new Date() }),
    ).toEqual({ kind: "STOP", reason: "AUTOMATION_PAUSED" });
  });

  it("returns AUTOMATION_DISABLED when the config toggle is off", () => {
    expect(
      decideQuoteFollowup(midStep1, { ...baseInputs, automationEnabled: false }),
    ).toEqual({ kind: "STOP", reason: "AUTOMATION_DISABLED" });
  });

  it("returns QUOTE_TERMINAL for WON / LOST / EXPIRED", () => {
    for (const status of ["WON", "LOST", "EXPIRED"] as const) {
      expect(decideQuoteFollowup(midStep1, { ...baseInputs, status })).toEqual({
        kind: "STOP",
        reason: "QUOTE_TERMINAL",
      });
    }
  });

  it("returns QUOTE_REPLIED for REPLIED", () => {
    expect(decideQuoteFollowup(midStep1, { ...baseInputs, status: "REPLIED" })).toEqual({
      kind: "STOP",
      reason: "QUOTE_REPLIED",
    });
  });

  it("returns NOT_YET_DUE for a DRAFT quote (never mind sent_at)", () => {
    expect(decideQuoteFollowup(midStep1, { ...baseInputs, status: "DRAFT" })).toEqual({
      kind: "STOP",
      reason: "NOT_YET_DUE",
    });
  });

  it("returns NOT_YET_DUE when sent_at is null", () => {
    expect(decideQuoteFollowup(midStep1, { ...baseInputs, sentAt: null })).toEqual({
      kind: "STOP",
      reason: "NOT_YET_DUE",
    });
  });

  it("returns SCHEDULE_EXHAUSTED after every step has fired", () => {
    expect(
      decideQuoteFollowup(midStep1, {
        ...baseInputs,
        alreadyFiredSteps: new Set([1, 2, 3]),
      }),
    ).toEqual({ kind: "STOP", reason: "SCHEDULE_EXHAUSTED" });
  });

  it("advances to the next unfired step once earlier ones have fired", () => {
    const midStep2 = new Date(Date.UTC(2026, 2, 8, 12, 0, 0));
    const result = decideQuoteFollowup(midStep2, {
      ...baseInputs,
      alreadyFiredSteps: new Set([1]),
    });
    expect(result).toEqual({
      kind: "DUE",
      step: {
        step: 2,
        scheduledFor: new Date(Date.UTC(2026, 2, 8, 9, 0, 0)),
      },
    });
  });
});
