import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ClassifyReplyResult, ReplyClassifierProvider } from "./provider";
import { classifyMessageReply } from "./classify-reply";

const ORG = "91000000-0000-4000-8000-000000000001";
const MESSAGE = "91600000-0000-4000-8000-c11c0000c11c";

interface FakeState {
  runCalls: Array<Record<string, unknown>>;
  runLedger: Map<string, string>;
  runNextId: number;
  denormCalls: Array<Record<string, unknown>>;
  denormReturns: boolean;
}

function makeState(): FakeState {
  return {
    runCalls: [],
    runLedger: new Map(),
    runNextId: 0,
    denormCalls: [],
    denormReturns: true,
  };
}

function makeFakeClient(state: FakeState) {
  return {
    rpc(name: string, args: Record<string, unknown>) {
      if (name === "insert_ai_run_once") {
        state.runCalls.push(args);
        const key = `${args.target_organization_id}|${args.target_idempotency_key}`;
        const existing = state.runLedger.get(key);
        if (existing) {
          return Promise.resolve({ data: [{ id: existing, created: false }], error: null });
        }
        state.runNextId += 1;
        const id = `run-${state.runNextId}`;
        state.runLedger.set(key, id);
        return Promise.resolve({ data: [{ id, created: true }], error: null });
      }
      if (name === "record_message_classification") {
        state.denormCalls.push(args);
        return Promise.resolve({ data: state.denormReturns, error: null });
      }
      return Promise.resolve({ data: null, error: { message: `unhandled rpc ${name}` } });
    },
  };
}

function makeProvider(returns: ClassifyReplyResult): ReplyClassifierProvider {
  return {
    name: "test",
    model: "test-model",
    classify: vi.fn(async () => returns),
  };
}

describe("classifyMessageReply", () => {
  let state: FakeState;
  let client: ReturnType<typeof makeFakeClient>;

  beforeEach(() => {
    state = makeState();
    client = makeFakeClient(state);
  });

  it("persists a SUCCEEDED ai_run and denormalizes when confidence >= threshold", async () => {
    const provider = makeProvider({
      status: "SUCCEEDED",
      classification: {
        intent: "ACCEPTED_QUOTE",
        confidence: 0.9,
        summary: "OK",
      },
      model: "test-model",
      inputTokens: 100,
      outputTokens: 20,
      latencyMs: 500,
    });
    const result = await classifyMessageReply(
      {
        organizationId: ORG,
        messageId: MESSAGE,
        subject: "Re: Devis",
        body: "OK",
        provider,
      },
      { client: client as never },
    );
    expect(result.status).toBe("CLASSIFIED");
    if (result.status !== "CLASSIFIED") return;
    expect(result.intent).toBe("ACCEPTED_QUOTE");
    expect(result.confidence).toBe(0.9);
    expect(result.denormalized).toBe(true);
    expect(state.runCalls).toHaveLength(1);
    expect(state.runCalls[0].target_status).toBe("SUCCEEDED");
    expect(state.denormCalls).toHaveLength(1);
  });

  it("records but does not denormalize when confidence is below threshold", async () => {
    const provider = makeProvider({
      status: "SUCCEEDED",
      classification: { intent: "OTHER", confidence: 0.3, summary: "meh" },
      model: "test-model",
      inputTokens: null,
      outputTokens: null,
      latencyMs: 100,
    });
    const result = await classifyMessageReply(
      { organizationId: ORG, messageId: MESSAGE, subject: "x", body: "y", provider },
      { client: client as never },
    );
    expect(result.status).toBe("CLASSIFIED");
    if (result.status !== "CLASSIFIED") return;
    expect(result.denormalized).toBe(false);
    expect(state.denormCalls).toHaveLength(0);
  });

  it("persists a FAILED ai_run when the provider returns TRANSIENT", async () => {
    const provider = makeProvider({
      status: "FAILED",
      errorClass: "TRANSIENT",
      errorMessage: "claude: HTTP 503",
      model: "test-model",
      latencyMs: 200,
    });
    const result = await classifyMessageReply(
      { organizationId: ORG, messageId: MESSAGE, subject: "x", body: "y", provider },
      { client: client as never },
    );
    expect(result.status).toBe("FAILED");
    if (result.status !== "FAILED") return;
    expect(result.errorClass).toBe("TRANSIENT");
    expect(state.runCalls[0].target_status).toBe("FAILED");
    expect((state.runCalls[0].target_error as string)).toContain("TRANSIENT");
    expect(state.denormCalls).toHaveLength(0);
  });

  it("flags the run as SUCCESS with sensitive=true for COMPLAINT / PRICE_OBJECTION", async () => {
    const provider = makeProvider({
      status: "SUCCEEDED",
      classification: {
        intent: "COMPLAINT",
        confidence: 0.85,
        summary: "Client se plaint",
      },
      model: "test-model",
      inputTokens: null,
      outputTokens: null,
      latencyMs: 100,
    });
    const result = await classifyMessageReply(
      { organizationId: ORG, messageId: MESSAGE, subject: "x", body: "y", provider },
      { client: client as never },
    );
    expect(result.status).toBe("CLASSIFIED");
    if (result.status !== "CLASSIFIED") return;
    expect(result.sensitive).toBe(true);
  });

  it("skips denormalization silently when the message was already classified (replay)", async () => {
    const provider = makeProvider({
      status: "SUCCEEDED",
      classification: { intent: "ACCEPTED_QUOTE", confidence: 0.9, summary: "OK" },
      model: "test-model",
      inputTokens: null,
      outputTokens: null,
      latencyMs: 100,
    });
    // First call succeeds and denormalizes.
    await classifyMessageReply(
      { organizationId: ORG, messageId: MESSAGE, subject: "x", body: "y", provider },
      { client: client as never },
    );
    // Second call: run is a replay (created=false) AND record_message_classification
    //   returns false (row already classified).
    state.denormReturns = false;
    const result = await classifyMessageReply(
      { organizationId: ORG, messageId: MESSAGE, subject: "x", body: "y", provider },
      { client: client as never },
    );
    expect(result.status).toBe("SKIPPED_ALREADY_CLASSIFIED");
  });
});
