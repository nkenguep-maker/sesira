import { describe, expect, it } from "vitest";

import {
  ATTENTION_REASONS,
  ATTENTION_REASON_CATEGORY,
  ATTENTION_REASON_DEFAULT_PRIORITY,
  WORKFLOW_EMITTED_REASONS,
  isAttentionReason,
} from "./reason";

describe("attention reason vocabulary", () => {
  it("has category + default priority mapping for every reason", () => {
    for (const reason of ATTENTION_REASONS) {
      expect(ATTENTION_REASON_CATEGORY[reason]).toBeDefined();
      expect(ATTENTION_REASON_DEFAULT_PRIORITY[reason]).toBeDefined();
    }
  });

  it("workflow-emitted reasons never include MANUAL_REVIEW", () => {
    expect(WORKFLOW_EMITTED_REASONS as readonly string[]).not.toContain("MANUAL_REVIEW");
  });

  it("workflow-emitted reasons are a strict subset of ATTENTION_REASONS", () => {
    for (const reason of WORKFLOW_EMITTED_REASONS) {
      expect(ATTENTION_REASONS as readonly string[]).toContain(reason);
    }
  });

  it("COMPLAINT_HOLD defaults to URGENT priority", () => {
    expect(ATTENTION_REASON_DEFAULT_PRIORITY.COMPLAINT_HOLD).toBe("URGENT");
  });

  it("INTEGRATION_ISSUE defaults to HIGH priority", () => {
    expect(ATTENTION_REASON_DEFAULT_PRIORITY.INTEGRATION_ISSUE).toBe("HIGH");
  });

  it("isAttentionReason accepts known values only", () => {
    expect(isAttentionReason("MANUAL_REVIEW")).toBe(true);
    expect(isAttentionReason("COMPLAINT_HOLD")).toBe(true);
    expect(isAttentionReason("UNKNOWN")).toBe(false);
    expect(isAttentionReason("")).toBe(false);
  });
});
