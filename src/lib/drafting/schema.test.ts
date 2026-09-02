import { describe, expect, it } from "vitest";

import { isDraftSendEligible, quoteDraftGapsSchema } from "./schema";

describe("C23 quote draft gaps", () => {
  it("requires a recorded analysis and zero gaps before send eligibility", () => {
    expect(isDraftSendEligible({ analyzedAt: null, gaps: [] })).toBe(false);
    expect(isDraftSendEligible({ analyzedAt: "2026-09-03T00:00:00.000Z", gaps: [{ field: "amount", reason: "human pricing" }] })).toBe(false);
    expect(isDraftSendEligible({ analyzedAt: "2026-09-03T00:00:00.000Z", gaps: [] })).toBe(true);
  });

  it("rejects unknown gap vocabulary and empty reasons", () => {
    expect(quoteDraftGapsSchema.safeParse([{ field: "discount", reason: "x" }]).success).toBe(false);
    expect(quoteDraftGapsSchema.safeParse([{ field: "amount", reason: "" }]).success).toBe(false);
  });
});
