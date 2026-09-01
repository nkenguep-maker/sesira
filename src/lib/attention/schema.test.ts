import { describe, expect, it } from "vitest";

import {
  attentionResolutionSchema,
  canCloseAttentionItem,
  isAttentionPriority,
  isAttentionStatus,
} from "./schema";

describe("attention decisions", () => {
  it("accepts only a real terminal decision and a UUID", () => {
    expect(
      attentionResolutionSchema.parse({
        attentionId: "10000000-0000-4000-8000-000000000001",
        intent: "RESOLVED",
      }),
    ).toEqual({
      attentionId: "10000000-0000-4000-8000-000000000001",
      intent: "RESOLVED",
    });

    expect(attentionResolutionSchema.safeParse({ attentionId: "other-tenant", intent: "DELETED" }).success).toBe(false);
  });

  it("closes only open decisions", () => {
    expect(canCloseAttentionItem("OPEN")).toBe(true);
    expect(canCloseAttentionItem("IN_PROGRESS")).toBe(true);
    expect(canCloseAttentionItem("RESOLVED")).toBe(false);
    expect(canCloseAttentionItem("DISMISSED")).toBe(false);
  });

  it("recognizes stored priorities and statuses", () => {
    expect(isAttentionPriority("URGENT")).toBe(true);
    expect(isAttentionPriority("CRITICAL")).toBe(false);
    expect(isAttentionStatus("DISMISSED")).toBe(true);
    expect(isAttentionStatus("DELETED")).toBe(false);
  });
});
