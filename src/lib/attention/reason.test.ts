import { describe, expect, it } from "vitest";
import { ATTENTION_REASONS, ATTENTION_REASON_CATEGORY, ATTENTION_REASON_DEFAULT_PRIORITY, WORKFLOW_EMITTED_REASONS, isAttentionReason } from "./reason";

describe("attention reason vocabulary", () => {
  it("has category + default priority mapping for every reason", () => { for (const reason of ATTENTION_REASONS) { expect(ATTENTION_REASON_CATEGORY[reason]).toBeDefined(); expect(ATTENTION_REASON_DEFAULT_PRIORITY[reason]).toBeDefined(); } });
  it("workflow-emitted reasons never include MANUAL_REVIEW", () => { expect(WORKFLOW_EMITTED_REASONS as readonly string[]).not.toContain("MANUAL_REVIEW"); });
  it("workflow-emitted reasons are a strict subset", () => { for (const reason of WORKFLOW_EMITTED_REASONS) expect(ATTENTION_REASONS as readonly string[]).toContain(reason); });
  it("keeps sensitive priorities conservative", () => { expect(ATTENTION_REASON_DEFAULT_PRIORITY.COMPLAINT_HOLD).toBe("URGENT"); expect(ATTENTION_REASON_DEFAULT_PRIORITY.INTEGRATION_ISSUE).toBe("HIGH"); expect(ATTENTION_REASON_DEFAULT_PRIORITY.OBJECTION_NEEDS_REVIEW).toBe("HIGH"); });
  it("classifies sold-not-scheduled as operational", () => { expect(ATTENTION_REASON_CATEGORY.SOLD_NOT_SCHEDULED).toBe("OPERATIONS"); });
  it("accepts known values only", () => { expect(isAttentionReason("MANUAL_REVIEW")).toBe(true); expect(isAttentionReason("OBJECTION_NEEDS_REVIEW")).toBe(true); expect(isAttentionReason("UNKNOWN")).toBe(false); });
});
