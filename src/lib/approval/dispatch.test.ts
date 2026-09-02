import { beforeEach, describe, expect, it, vi } from "vitest";

import type { EmailProvider, EmailSendResult } from "@/lib/email/provider";

import { dispatchApprovedFollowup } from "./dispatch";

const ORG = "91000000-0000-4000-8000-000000000001";
const RUN = "91800000-0000-4000-8000-c12000000001";
const QUOTE = "91500000-0000-4000-8000-c12000000000";
const DISPATCHER = "approver-dispatcher-01";
const INTEGRATION = "91600000-0000-4000-8000-000000000001";
const FROM = "sesira@example.com";

const VALID_PROPOSAL = {
  channel: "email" as const,
  recipient_email: "customer@example.com",
  subject: "Relance Devis A — étape 1",
  body: "Bonjour, nous revenons vers vous...",
  quote_id: QUOTE,
  step: 1,
  scheduled_for_iso: "2026-09-08T09:00:00+00:00",
  template_key: "quote_followup_schedule",
};

interface FakeState {
  runRow: {
    id: string;
    organization_id: string;
    status: string;
    output_summary: unknown;
    locked_by: string | null;
  } | null;
  intentCalls: Array<Record<string, unknown>>;
  intentLedger: Map<string, string>;
  intentNextId: number;
  sentCalls: Array<Record<string, unknown>>;
  failedCalls: Array<Record<string, unknown>>;
  releaseCalls: Array<Record<string, unknown>>;
  releaseReturns: boolean;
}

function makeState(overrides: Partial<FakeState> = {}): FakeState {
  return {
    runRow: {
      id: RUN,
      organization_id: ORG,
      status: "RUNNING",
      output_summary: { proposed_action: VALID_PROPOSAL },
      locked_by: DISPATCHER,
    },
    intentCalls: [],
    intentLedger: new Map(),
    intentNextId: 0,
    sentCalls: [],
    failedCalls: [],
    releaseCalls: [],
    releaseReturns: true,
    ...overrides,
  };
}

function makeFakeClient(state: FakeState) {
  return {
    from(table: string) {
      if (table === "automation_runs") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: state.runRow, error: null }),
              }),
            }),
          }),
        };
      }
      throw new Error(`unhandled table ${table}`);
    },
    rpc(name: string, args: Record<string, unknown>) {
      if (name === "record_outbound_message_intent") {
        state.intentCalls.push(args);
        const key = `${args.target_organization_id}|${args.target_idempotency_key}`;
        const existing = state.intentLedger.get(key);
        if (existing) return Promise.resolve({ data: [{ id: existing, created: false }], error: null });
        state.intentNextId += 1;
        const id = `msg-${state.intentNextId}`;
        state.intentLedger.set(key, id);
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
      if (name === "release_automation_run") {
        state.releaseCalls.push(args);
        return Promise.resolve({ data: state.releaseReturns, error: null });
      }
      return Promise.resolve({ data: null, error: { message: `unhandled rpc ${name}` } });
    },
  };
}

function makeProvider(returns: EmailSendResult): EmailProvider {
  return {
    name: "test",
    send: vi.fn(async () => returns),
  };
}

const ALLOW_POLICY_ENV = () => {
  process.env.EXTERNAL_ACTIONS_ENABLED = "true";
  process.env.VERCEL_ENV = "production";
};

const RESET_ENV = () => {
  delete process.env.EXTERNAL_ACTIONS_ENABLED;
  delete process.env.VERCEL_ENV;
};

describe("dispatchApprovedFollowup", () => {
  let state: FakeState;
  let client: ReturnType<typeof makeFakeClient>;

  beforeEach(() => {
    state = makeState();
    client = makeFakeClient(state);
    ALLOW_POLICY_ENV();
  });

  it("sends the proposed action and releases SUCCEEDED on happy path", async () => {
    const provider = makeProvider({ status: "SENT", providerMessageId: "prov_xyz" });
    const result = await dispatchApprovedFollowup({
      runId: RUN, organizationId: ORG, dispatcherWorker: DISPATCHER,
      provider, integrationId: INTEGRATION, fromEmail: FROM,
      client: client as never,
    });
    RESET_ENV();
    expect(result.status).toBe("SENT");
    if (result.status !== "SENT") return;
    expect(result.providerMessageId).toBe("prov_xyz");
    expect(state.intentCalls).toHaveLength(1);
    expect(state.sentCalls).toHaveLength(1);
    expect(state.releaseCalls).toHaveLength(1);
    expect(state.releaseCalls[0].terminal_status).toBe("SUCCEEDED");
  });

  it("returns REPLAY and releases SUCCEEDED when intent was already inserted", async () => {
    // Prime the ledger so the second attempt observes created=false.
    state.intentLedger.set(
      `${ORG}|outbound:quote_followup:${QUOTE}:step:1`,
      "msg-prev",
    );
    const provider = makeProvider({ status: "SENT", providerMessageId: "unused" });
    const result = await dispatchApprovedFollowup({
      runId: RUN, organizationId: ORG, dispatcherWorker: DISPATCHER,
      provider, integrationId: INTEGRATION, fromEmail: FROM,
      client: client as never,
    });
    RESET_ENV();
    expect(result).toMatchObject({ status: "REPLAY", messageId: "msg-prev" });
    expect(provider.send).not.toHaveBeenCalled();
    expect(state.sentCalls).toHaveLength(0);
    expect(state.releaseCalls[0].terminal_status).toBe("SUCCEEDED");
  });

  it("releases FAILED with the provider error class on TRANSIENT failure", async () => {
    const provider = makeProvider({
      status: "FAILED", errorClass: "TRANSIENT", errorMessage: "resend: HTTP 503",
    });
    const result = await dispatchApprovedFollowup({
      runId: RUN, organizationId: ORG, dispatcherWorker: DISPATCHER,
      provider, integrationId: INTEGRATION, fromEmail: FROM,
      client: client as never,
    });
    RESET_ENV();
    expect(result.status).toBe("FAILED");
    expect(state.failedCalls).toHaveLength(1);
    expect(state.releaseCalls[0].terminal_status).toBe("FAILED");
    expect((state.releaseCalls[0].error_message as string)).toContain("TRANSIENT");
  });

  it("returns RUN_NOT_FOUND when the run does not exist", async () => {
    state.runRow = null;
    const provider = makeProvider({ status: "SENT", providerMessageId: "x" });
    const result = await dispatchApprovedFollowup({
      runId: RUN, organizationId: ORG, dispatcherWorker: DISPATCHER,
      provider, integrationId: INTEGRATION, fromEmail: FROM,
      client: client as never,
    });
    RESET_ENV();
    expect(result).toEqual({ status: "RUN_NOT_FOUND", runId: RUN });
    expect(state.intentCalls).toHaveLength(0);
  });

  it("returns LEASE_LOST when locked_by does not match dispatcherWorker", async () => {
    state.runRow!.locked_by = "other-worker";
    const provider = makeProvider({ status: "SENT", providerMessageId: "x" });
    const result = await dispatchApprovedFollowup({
      runId: RUN, organizationId: ORG, dispatcherWorker: DISPATCHER,
      provider, integrationId: INTEGRATION, fromEmail: FROM,
      client: client as never,
    });
    RESET_ENV();
    expect(result).toEqual({ status: "LEASE_LOST", runId: RUN });
    expect(state.intentCalls).toHaveLength(0);
  });

  it("cancels the run when the stored proposal is malformed", async () => {
    state.runRow!.output_summary = { proposed_action: { channel: "sms", bogus: true } };
    const provider = makeProvider({ status: "SENT", providerMessageId: "unused" });
    const result = await dispatchApprovedFollowup({
      runId: RUN, organizationId: ORG, dispatcherWorker: DISPATCHER,
      provider, integrationId: INTEGRATION, fromEmail: FROM,
      client: client as never,
    });
    RESET_ENV();
    expect(result.status).toBe("CANCELLED_INVALID_PROPOSAL");
    expect(provider.send).not.toHaveBeenCalled();
    expect(state.releaseCalls).toHaveLength(1);
    expect(state.releaseCalls[0].terminal_status).toBe("CANCELLED");
  });

  it("fails closed when the guard is off (env not production)", async () => {
    RESET_ENV(); // ensure guard blocks
    process.env.EXTERNAL_ACTIONS_ENABLED = "true";
    process.env.VERCEL_ENV = "preview";
    const provider = makeProvider({ status: "SENT", providerMessageId: "unused" });
    await expect(
      dispatchApprovedFollowup({
        runId: RUN, organizationId: ORG, dispatcherWorker: DISPATCHER,
        provider, integrationId: INTEGRATION, fromEmail: FROM,
        client: client as never,
      }),
    ).rejects.toThrow(/Guarded email disabled/);
    RESET_ENV();
    expect(provider.send).not.toHaveBeenCalled();
    expect(state.releaseCalls).toHaveLength(0);
  });
});
