import { beforeEach, describe, expect, it } from "vitest";

import { stageAutomationRunForApproval } from "./stage";

const ORG = "91000000-0000-4000-8000-000000000001";
const RUN = "91800000-0000-4000-8000-c12000000001";
const QUOTE = "91500000-0000-4000-8000-c12000000000";
const WORKER = "shadow-worker-01";

interface FakeState {
  releaseCalls: Array<Record<string, unknown>>;
  releaseReturns: boolean;
  attentionCalls: Array<Record<string, unknown>>;
  attentionNextId: number;
}

function makeState(overrides: Partial<FakeState> = {}): FakeState {
  return {
    releaseCalls: [],
    releaseReturns: true,
    attentionCalls: [],
    attentionNextId: 0,
    ...overrides,
  };
}

function makeFakeClient(state: FakeState) {
  return {
    rpc(name: string, args: Record<string, unknown>) {
      if (name === "release_automation_run") {
        state.releaseCalls.push(args);
        return Promise.resolve({ data: state.releaseReturns, error: null });
      }
      if (name === "insert_attention_once") {
        state.attentionCalls.push(args);
        state.attentionNextId += 1;
        return Promise.resolve({
          data: [{ id: `att-${state.attentionNextId}`, created: true }],
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: { message: `unhandled rpc ${name}` } });
    },
  };
}

describe("stageAutomationRunForApproval", () => {
  let state: FakeState;

  beforeEach(() => {
    state = makeState();
  });

  it("stages the run and emits an APPROVAL_REQUIRED attention", async () => {
    const client = makeFakeClient(state);
    const result = await stageAutomationRunForApproval({
      runId: RUN, organizationId: ORG, workerId: WORKER,
      outputSummary: { proposed_action: { quote_id: QUOTE, step: 1 } },
      attention: {
        quoteId: QUOTE,
        title: "Relance à approuver",
        explanation: "Devis en attente depuis 3 jours",
        suggestedAction: "Vérifier avant envoi",
      },
      client: client as never,
    });
    expect(result.status).toBe("STAGED");
    if (result.status !== "STAGED") return;
    expect(state.releaseCalls).toHaveLength(1);
    expect(state.releaseCalls[0].terminal_status).toBe("WAITING_FOR_APPROVAL");
    expect(state.attentionCalls).toHaveLength(1);
    expect(state.attentionCalls[0].target_reason).toBe("APPROVAL_REQUIRED");
  });

  it("returns LEASE_LOST when the release RPC returns false", async () => {
    state.releaseReturns = false;
    const client = makeFakeClient(state);
    const result = await stageAutomationRunForApproval({
      runId: RUN, organizationId: ORG, workerId: WORKER,
      outputSummary: {},
      attention: {
        quoteId: QUOTE, title: "x", explanation: "y",
      },
      client: client as never,
    });
    expect(result).toEqual({ status: "LEASE_LOST", runId: RUN });
    expect(state.attentionCalls).toHaveLength(0);
  });
});
