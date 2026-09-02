import { describe, expect, it } from "vitest";

import {
  isReplyObjectionClass,
  isSensitiveObjectionClass,
  replyObjectionSchema,
  REPLY_OBJECTION_CLASSES,
} from "./schema";

describe("reply objection classes", () => {
  it("recognizes every class", () => {
    for (const c of REPLY_OBJECTION_CLASSES) expect(isReplyObjectionClass(c)).toBe(true);
    expect(isReplyObjectionClass("UNKNOWN")).toBe(false);
  });

  it("flags PRICE / COMPLAINT / LEGAL / FINANCING_DECLINED as sensitive", () => {
    expect(isSensitiveObjectionClass("PRICE")).toBe(true);
    expect(isSensitiveObjectionClass("COMPLAINT")).toBe(true);
    expect(isSensitiveObjectionClass("LEGAL")).toBe(true);
    expect(isSensitiveObjectionClass("FINANCING_DECLINED")).toBe(true);
    expect(isSensitiveObjectionClass("TIMING")).toBe(false);
    expect(isSensitiveObjectionClass("COMPETITOR")).toBe(false);
    expect(isSensitiveObjectionClass("OTHER")).toBe(false);
  });
});

describe("replyObjectionSchema", () => {
  it("parses a minimal valid input", () => {
    const r = replyObjectionSchema.safeParse({ class: "TIMING" });
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.severity).toBe("NORMAL");
  });

  it("rejects a bad class", () => {
    const r = replyObjectionSchema.safeParse({ class: "WHATEVER" });
    expect(r.success).toBe(false);
  });

  it("rejects a bad severity", () => {
    const r = replyObjectionSchema.safeParse({ class: "TIMING", severity: "MAX" });
    expect(r.success).toBe(false);
  });

  it("rejects a confidence outside [0, 1]", () => {
    const r = replyObjectionSchema.safeParse({ class: "PRICE", confidence: 1.5 });
    expect(r.success).toBe(false);
  });

  it("accepts an extracted amount + 3-letter currency", () => {
    const r = replyObjectionSchema.safeParse({
      class: "PRICE", extractedAmount: 1500, extractedCurrency: "EUR",
    });
    expect(r.success).toBe(true);
  });

  it("rejects a non-3-letter currency", () => {
    const r = replyObjectionSchema.safeParse({ class: "PRICE", extractedCurrency: "€" });
    expect(r.success).toBe(false);
  });
});
