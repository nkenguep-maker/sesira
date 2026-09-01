import { beforeEach, describe, expect, it, vi } from "vitest";

import type { EmailProvider, EmailSendResult } from "./provider";

const ORG = "91000000-0000-4000-8000-000000000001";
const INTEGRATION = "91600000-0000-4000-8000-000000000001";

interface FakeState {
  intentCalls: Array<Record<string, unknown>>;
  intentLedger: Map<string, { id: string; row: Record<string, unknown> }>;
  intentNextId: number;
  sentCalls: Array<Record<string, unknown>>;
  failedCalls: Array<Record<string, unknown>>;
  providerCalls: Array<Parameters<EmailProvider["send"]>[0]>;
}

function makeState(): FakeState {
  return {
    intentCalls: [],
    intentLedger: new Map(),
    intentNextId: 0,
    sentCalls: [],
    failedCalls: [],
    providerCalls: [],
  };
}

function makeFakeClient(state: FakeState) {
  return {
    rpc(name: string, args: Record<string, unknown>) {
      if (name === "record_outbound_message_intent") {
        state.intentCalls.push(args);
        const key = `${args.target_organization_id}|${args.target_idempotency_key}`;
        const existing = state.intentLedger.get(key);
        if (existing) {
          return Promise.resolve({ data: [{ id: existing.id, created: false }], error: null });
        }
        state.intentNextId += 1;
        const id = `msg-${state.intentNextId}`;
        state.intentLedger.set(key, { id, row: args });
        return Promise.resolve({ data: [{ id, created: true }], error: null });
      }
      if (name === "mark_outbound_message_sent") {
        state.sentCalls.push(args);
        return Promise.resolve({ data: true, error: null });
      }
      if (name === "mark_outbound_message_failed") {
        state.failedCalls.push(args);
        return Promise.resolve({ data: true, error: null });
      }
      return Promise.resolve({ data: null, error: { message: `unhandled rpc ${name}` } });
    },
  };
}

let currentState: FakeState = makeState();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => currentState as never),
}));

// Import AFTER the mock — vitest hoists vi.mock calls to the top so
// this order is safe, but keeping the imports below the mock makes the
// dependency graph explicit for a human reader.
import { sendGuardedEmail } from "./send";

function makeProvider(returns: EmailSendResult): EmailProvider {
  return {
    name: "test",
    send: vi.fn(async (input) => {
      currentState.providerCalls.push(input);
      return returns;
    }),
  };
}

const ALLOW_POLICY = { configuredValue: "true" as const, deploymentEnvironment: "production" as const };

describe("sendGuardedEmail", () => {
  beforeEach(() => {
    currentState = makeState();
    (currentState as unknown as ReturnType<typeof makeFakeClient>).rpc = makeFakeClient(currentState).rpc;
  });

  it("throws when the guard is off and NEVER touches the provider or the DB", async () => {
    const provider = makeProvider({ status: "SENT", providerMessageId: "should_not_be_used" });
    await expect(
      sendGuardedEmail({
        organizationId: ORG,
        integrationId: INTEGRATION,
        provider,
        to: "to@example.com",
        from: "from@example.com",
        subject: "Hi",
        text: "body",
        idempotencyKey: "outbound:quote_followup:11111111-1111-1111-1111-111111111111:step:1",
        policy: { configuredValue: "false", deploymentEnvironment: "preview" },
      }),
    ).rejects.toThrow(/Guarded email disabled/);
    expect(currentState.intentCalls).toHaveLength(0);
    expect(currentState.providerCalls).toHaveLength(0);
    expect(provider.send).not.toHaveBeenCalled();
  });

  it("sends once, records intent, marks SENT with providerMessageId", async () => {
    const provider = makeProvider({ status: "SENT", providerMessageId: "prov_xyz" });
    const result = await sendGuardedEmail({
      organizationId: ORG,
      integrationId: INTEGRATION,
      provider,
      to: "to@example.com",
      from: "from@example.com",
      subject: "Hi",
      text: "body",
      idempotencyKey: "outbound:quote_followup:22222222-2222-2222-2222-222222222222:step:1",
      policy: ALLOW_POLICY,
    });
    expect(result).toMatchObject({ status: "SENT", providerMessageId: "prov_xyz" });
    expect((result as { messageId: string }).messageId).toMatch(/^msg-/);
    expect(currentState.intentCalls).toHaveLength(1);
    expect(currentState.intentCalls[0].target_provider).toBe("test");
    expect(currentState.providerCalls).toHaveLength(1);
    expect(currentState.sentCalls).toHaveLength(1);
    expect(currentState.sentCalls[0].target_provider_message_id).toBe("prov_xyz");
    expect(currentState.failedCalls).toHaveLength(0);
  });

  it("replays: same idempotency_key returns REPLAY without touching the provider", async () => {
    const provider = makeProvider({ status: "SENT", providerMessageId: "prov_1" });
    const key = "outbound:quote_followup:33333333-3333-3333-3333-333333333333:step:1";
    const first = await sendGuardedEmail({
      organizationId: ORG,
      integrationId: INTEGRATION,
      provider,
      to: "to@example.com",
      from: "from@example.com",
      subject: "Hi",
      text: "body",
      idempotencyKey: key,
      policy: ALLOW_POLICY,
    });
    expect(first.status).toBe("SENT");
    expect(currentState.providerCalls).toHaveLength(1);

    // Replay with different body but same idempotency_key — provider MUST NOT be called again.
    const second = await sendGuardedEmail({
      organizationId: ORG,
      integrationId: INTEGRATION,
      provider,
      to: "to@example.com",
      from: "from@example.com",
      subject: "different subject",
      text: "different body",
      idempotencyKey: key,
      policy: ALLOW_POLICY,
    });
    expect(second.status).toBe("REPLAY");
    expect((second as { messageId: string }).messageId).toBe((first as { messageId: string }).messageId);
    expect(currentState.providerCalls).toHaveLength(1); // still 1
    expect(currentState.sentCalls).toHaveLength(1); // still 1
  });

  it("marks FAILED with TRANSIENT when the adapter returns TRANSIENT", async () => {
    const provider = makeProvider({ status: "FAILED", errorClass: "TRANSIENT", errorMessage: "resend: HTTP 503" });
    const result = await sendGuardedEmail({
      organizationId: ORG,
      integrationId: INTEGRATION,
      provider,
      to: "to@example.com",
      from: "from@example.com",
      subject: "Hi",
      text: "body",
      idempotencyKey: "outbound:quote_followup:44444444-4444-4444-4444-444444444444:step:1",
      policy: ALLOW_POLICY,
    });
    expect(result).toMatchObject({ status: "FAILED", errorClass: "TRANSIENT", errorMessage: "resend: HTTP 503" });
    expect(currentState.failedCalls).toHaveLength(1);
    expect(currentState.failedCalls[0].target_error_class).toBe("TRANSIENT");
    expect(currentState.sentCalls).toHaveLength(0);
  });

  it("marks FAILED with PERMANENT when the adapter returns PERMANENT", async () => {
    const provider = makeProvider({ status: "FAILED", errorClass: "PERMANENT", errorMessage: "resend: HTTP 422" });
    const result = await sendGuardedEmail({
      organizationId: ORG,
      integrationId: INTEGRATION,
      provider,
      to: "to@example.com",
      from: "from@example.com",
      subject: "Hi",
      text: "body",
      idempotencyKey: "outbound:quote_followup:55555555-5555-5555-5555-555555555555:step:1",
      policy: ALLOW_POLICY,
    });
    expect(result).toMatchObject({ status: "FAILED", errorClass: "PERMANENT" });
    expect(currentState.failedCalls[0].target_error_class).toBe("PERMANENT");
  });

  it("accepts a null integration_id (send attempted before integration lookup finalizes)", async () => {
    const provider = makeProvider({ status: "SENT", providerMessageId: "prov_ok" });
    const result = await sendGuardedEmail({
      organizationId: ORG,
      integrationId: null,
      provider,
      to: "to@example.com",
      from: "from@example.com",
      subject: "Hi",
      text: "body",
      idempotencyKey: "outbound:quote_followup:66666666-6666-6666-6666-666666666666:step:1",
      policy: ALLOW_POLICY,
    });
    expect(result.status).toBe("SENT");
    expect(currentState.intentCalls[0].target_integration_id).toBe(null);
  });

  it("body_hash is a sha256 hex of (text + html) — audit only, not part of identity", async () => {
    const provider = makeProvider({ status: "SENT", providerMessageId: "prov_ok" });
    await sendGuardedEmail({
      organizationId: ORG,
      integrationId: INTEGRATION,
      provider,
      to: "to@example.com",
      from: "from@example.com",
      subject: "Hi",
      text: "plain",
      html: "<p>plain</p>",
      idempotencyKey: "outbound:quote_followup:77777777-7777-7777-7777-777777777777:step:1",
      policy: ALLOW_POLICY,
    });
    const hash = currentState.intentCalls[0].target_body_hash as string;
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});
