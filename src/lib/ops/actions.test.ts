import { beforeEach, describe, expect, it } from "vitest";

import {
  armMessageForReclassification,
  dismissAttentionItem,
  resolveAttentionItem,
  resumeQuoteAutomation,
  retryFailedRunManual,
} from "./actions";

const ORG = "91000000-0000-4000-8000-000000000001";
const OPERATOR = "91100000-0000-4000-8000-000000000001";

interface FakeState {
  rpcCalls: Array<{ name: string; args: Record<string, unknown> }>;
  returnMap: Record<string, boolean | { error: string }>;
}

let state: FakeState;

function makeFakeClient() {
  return {
    rpc(name: string, args: Record<string, unknown>) {
      state.rpcCalls.push({ name, args });
      const returned = state.returnMap[name];
      if (typeof returned === "object" && returned !== null && "error" in returned) {
        return Promise.resolve({ data: null, error: { message: returned.error } });
      }
      return Promise.resolve({ data: returned ?? false, error: null });
    },
  };
}

beforeEach(() => {
  state = { rpcCalls: [], returnMap: {} };
});

describe("resolveAttentionItem", () => {
  it("returns APPLIED when the RPC returns true", async () => {
    state.returnMap.resolve_attention_item = true;
    const result = await resolveAttentionItem(
      { organizationId: ORG, attentionItemId: "att-1", operatorUserId: OPERATOR, note: "ok" },
      { client: makeFakeClient() as never },
    );
    expect(result).toEqual({ status: "APPLIED" });
    expect(state.rpcCalls[0].args.target_note).toBe("ok");
  });

  it("returns NOT_ELIGIBLE when the RPC returns false", async () => {
    state.returnMap.resolve_attention_item = false;
    const result = await resolveAttentionItem(
      { organizationId: ORG, attentionItemId: "att-1", operatorUserId: OPERATOR },
      { client: makeFakeClient() as never },
    );
    expect(result).toEqual({ status: "NOT_ELIGIBLE" });
  });

  it("returns ERROR when the RPC surfaces a message", async () => {
    state.returnMap.resolve_attention_item = { error: "42501: not authorized" };
    const result = await resolveAttentionItem(
      { organizationId: ORG, attentionItemId: "att-1", operatorUserId: OPERATOR },
      { client: makeFakeClient() as never },
    );
    expect(result).toEqual({
      status: "ERROR",
      reason: expect.stringContaining("42501"),
    });
  });
});

describe("dismissAttentionItem", () => {
  it("dispatches to dismiss_attention_item", async () => {
    state.returnMap.dismiss_attention_item = true;
    const result = await dismissAttentionItem(
      { organizationId: ORG, attentionItemId: "att-2", operatorUserId: OPERATOR, note: "irrelevant" },
      { client: makeFakeClient() as never },
    );
    expect(result).toEqual({ status: "APPLIED" });
    expect(state.rpcCalls[0].name).toBe("dismiss_attention_item");
    expect(state.rpcCalls[0].args.target_item_id).toBe("att-2");
  });
});

describe("armMessageForReclassification", () => {
  it("passes the reason through", async () => {
    state.returnMap.arm_message_for_reclassification = true;
    await armMessageForReclassification(
      { organizationId: ORG, messageId: "msg-1", operatorUserId: OPERATOR, reason: "bad intent" },
      { client: makeFakeClient() as never },
    );
    expect(state.rpcCalls[0].args.target_reason).toBe("bad intent");
  });

  it("returns NOT_ELIGIBLE when the message is not yet classified", async () => {
    state.returnMap.arm_message_for_reclassification = false;
    const result = await armMessageForReclassification(
      { organizationId: ORG, messageId: "msg-1", operatorUserId: OPERATOR },
      { client: makeFakeClient() as never },
    );
    expect(result).toEqual({ status: "NOT_ELIGIBLE" });
  });
});

describe("resumeQuoteAutomation", () => {
  it("dispatches to resume_quote_automation", async () => {
    state.returnMap.resume_quote_automation = true;
    const result = await resumeQuoteAutomation(
      { organizationId: ORG, quoteId: "quote-1", operatorUserId: OPERATOR, note: "customer confirmed" },
      { client: makeFakeClient() as never },
    );
    expect(result).toEqual({ status: "APPLIED" });
    expect(state.rpcCalls[0].name).toBe("resume_quote_automation");
    expect(state.rpcCalls[0].args.target_quote_id).toBe("quote-1");
  });

  it("returns NOT_ELIGIBLE when the quote is not paused", async () => {
    state.returnMap.resume_quote_automation = false;
    const result = await resumeQuoteAutomation(
      { organizationId: ORG, quoteId: "quote-1", operatorUserId: OPERATOR },
      { client: makeFakeClient() as never },
    );
    expect(result).toEqual({ status: "NOT_ELIGIBLE" });
  });
});

describe("retryFailedRunManual", () => {
  it("dispatches to retry_failed_run_manual", async () => {
    state.returnMap.retry_failed_run_manual = true;
    const result = await retryFailedRunManual(
      { organizationId: ORG, runId: "run-1", operatorUserId: OPERATOR, note: "network was flapping" },
      { client: makeFakeClient() as never },
    );
    expect(result).toEqual({ status: "APPLIED" });
    expect(state.rpcCalls[0].args.target_run_id).toBe("run-1");
  });
});
