import { beforeEach, describe, expect, it } from "vitest";

import { approveAutomationRun, rejectAutomationRun } from "./resolve";

const ORG = "91000000-0000-4000-8000-000000000001";
const RUN = "91800000-0000-4000-8000-c12000000001";
const APPROVER = "91100000-0000-4000-8000-000000000001";
const DISPATCHER = "approver-dispatcher-91100000";

interface FakeState {
  approveCalls: Array<Record<string, unknown>>;
  rejectCalls: Array<Record<string, unknown>>;
  approveReturns: boolean;
  rejectReturns: boolean;
  approveError: string | null;
  rejectError: string | null;
}

function makeState(overrides: Partial<FakeState> = {}): FakeState {
  return {
    approveCalls: [],
    rejectCalls: [],
    approveReturns: true,
    rejectReturns: true,
    approveError: null,
    rejectError: null,
    ...overrides,
  };
}

function makeFakeClient(state: FakeState) {
  return {
    rpc(name: string, args: Record<string, unknown>) {
      if (name === "approve_automation_run_pending_approval") {
        state.approveCalls.push(args);
        if (state.approveError) return Promise.resolve({ data: null, error: { message: state.approveError } });
        return Promise.resolve({ data: state.approveReturns, error: null });
      }
      if (name === "reject_automation_run_pending_approval") {
        state.rejectCalls.push(args);
        if (state.rejectError) return Promise.resolve({ data: null, error: { message: state.rejectError } });
        return Promise.resolve({ data: state.rejectReturns, error: null });
      }
      return Promise.resolve({ data: null, error: { message: `unhandled rpc ${name}` } });
    },
  };
}

describe("approveAutomationRun", () => {
  let state: FakeState;

  beforeEach(() => {
    state = makeState();
  });

  it("returns RESOLVED with APPROVED on happy path", async () => {
    const client = makeFakeClient(state);
    const result = await approveAutomationRun({
      runId: RUN, organizationId: ORG, approverUserId: APPROVER,
      comment: "OK", dispatcherWorker: DISPATCHER, client: client as never,
    });
    expect(result).toEqual({ status: "RESOLVED", runId: RUN, decision: "APPROVED" });
    expect(state.approveCalls).toHaveLength(1);
    expect(state.approveCalls[0].target_dispatcher_worker).toBe(DISPATCHER);
    expect(state.approveCalls[0].target_comment).toBe("OK");
    expect(state.approveCalls[0].target_lease_seconds).toBe(300);
  });

  it("returns NOT_ELIGIBLE when RPC returns false (already resolved / not waiting)", async () => {
    state.approveReturns = false;
    const client = makeFakeClient(state);
    const result = await approveAutomationRun({
      runId: RUN, organizationId: ORG, approverUserId: APPROVER,
      dispatcherWorker: DISPATCHER, client: client as never,
    });
    expect(result).toEqual({
      status: "NOT_ELIGIBLE", runId: RUN, reason: "already_resolved_or_not_waiting",
    });
  });

  it("returns ERROR when RPC surfaces a message", async () => {
    state.approveError = "42501: not authorized";
    const client = makeFakeClient(state);
    const result = await approveAutomationRun({
      runId: RUN, organizationId: ORG, approverUserId: APPROVER,
      dispatcherWorker: DISPATCHER, client: client as never,
    });
    expect(result).toEqual({
      status: "ERROR", reason: expect.stringContaining("not authorized"),
    });
  });

  it("honors custom lease_seconds", async () => {
    const client = makeFakeClient(state);
    await approveAutomationRun({
      runId: RUN, organizationId: ORG, approverUserId: APPROVER,
      dispatcherWorker: DISPATCHER, leaseSeconds: 60, client: client as never,
    });
    expect(state.approveCalls[0].target_lease_seconds).toBe(60);
  });
});

describe("rejectAutomationRun", () => {
  let state: FakeState;

  beforeEach(() => {
    state = makeState();
  });

  it("returns RESOLVED with REJECTED on happy path", async () => {
    const client = makeFakeClient(state);
    const result = await rejectAutomationRun({
      runId: RUN, organizationId: ORG, approverUserId: APPROVER,
      comment: "trop tôt", client: client as never,
    });
    expect(result).toEqual({ status: "RESOLVED", runId: RUN, decision: "REJECTED" });
    expect(state.rejectCalls).toHaveLength(1);
    expect(state.rejectCalls[0].target_comment).toBe("trop tôt");
  });

  it("returns NOT_ELIGIBLE when RPC returns false", async () => {
    state.rejectReturns = false;
    const client = makeFakeClient(state);
    const result = await rejectAutomationRun({
      runId: RUN, organizationId: ORG, approverUserId: APPROVER, client: client as never,
    });
    expect(result.status).toBe("NOT_ELIGIBLE");
  });
});
