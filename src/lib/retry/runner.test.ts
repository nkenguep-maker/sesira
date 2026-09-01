import { beforeEach, describe, expect, it } from "vitest";

import { PermanentError, TransientError } from "./classify";
import { DEFAULT_RETRY_POLICY } from "./policy";
import { runWithRetry, type RunnerContext } from "./runner";

const ORG = "91000000-0000-4000-8000-000000000001";
const RUN = "91800000-0000-4000-8000-000000000001";
const QUOTE = "91500000-0000-4000-8000-000000000001";
const WORKER = "test-worker";
const NOW = new Date("2026-09-05T09:00:00.000Z");

interface FakeState {
  releaseCalls: Array<Record<string, unknown>>;
  releaseReturns: boolean;
  incidentCalls: Array<Record<string, unknown>>;
  incidentLedger: Map<string, { id: string; recurrence_count: number }>;
  incidentNextId: number;
}

function makeFakeClient(state: FakeState) {
  return {
    rpc(name: string, args: Record<string, unknown>) {
      if (name === "release_automation_run") {
        state.releaseCalls.push(args);
        return Promise.resolve({ data: state.releaseReturns, error: null });
      }
      if (name === "record_incident_once") {
        state.incidentCalls.push(args);
        const key = args.target_fingerprint as string;
        const existing = state.incidentLedger.get(key);
        if (existing) {
          existing.recurrence_count += 1;
          return Promise.resolve({
            data: [{ id: existing.id, created: false, recurrence_count: existing.recurrence_count }],
            error: null,
          });
        }
        state.incidentNextId += 1;
        const id = `inc-${state.incidentNextId}`;
        state.incidentLedger.set(key, { id, recurrence_count: 1 });
        return Promise.resolve({
          data: [{ id, created: true, recurrence_count: 1 }],
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: { message: `unhandled rpc ${name}` } });
    },
  };
}

function makeContext(state: FakeState, overrides: Partial<RunnerContext> = {}): RunnerContext {
  return {
    runId: RUN,
    organizationId: ORG,
    workerId: WORKER,
    attemptCount: 0,
    entity: { type: "quote", id: QUOTE },
    sourceKind: "shadow_quote_followup",
    incidentCategory: "workflow_failure",
    incidentSeverity: "P3",
    incidentTitleTemplate: (cls) => `Shadow run failed (${cls})`,
    now: NOW,
    client: makeFakeClient(state) as never,
    ...overrides,
  };
}

let state: FakeState;

beforeEach(() => {
  state = {
    releaseCalls: [],
    releaseReturns: true,
    incidentCalls: [],
    incidentLedger: new Map(),
    incidentNextId: 0,
  };
});

describe("runWithRetry — SUCCESS", () => {
  it("releases SUCCEEDED with output_summary and returns SUCCESS", async () => {
    const outcome = await runWithRetry(
      async () => ({ outputSummary: { decision: "DUE" } }),
      makeContext(state),
    );
    expect(outcome.status).toBe("SUCCESS");
    expect(state.incidentCalls).toHaveLength(0);
    expect(state.releaseCalls).toHaveLength(1);
    expect(state.releaseCalls[0]).toMatchObject({
      terminal_status: "SUCCEEDED",
      target_output_summary: { decision: "DUE" },
    });
  });
});

describe("runWithRetry — TRANSIENT with retries remaining", () => {
  it("computes next_attempt_at + releases PENDING + no incident yet", async () => {
    const outcome = await runWithRetry(
      async () => {
        throw new TransientError("provider_timeout", "boom");
      },
      makeContext(state, { attemptCount: 0 }),
    );
    expect(outcome.status).toBe("RETRY_SCHEDULED");
    if (outcome.status !== "RETRY_SCHEDULED") return;
    // first attempt completed -> attemptedCount = 1; next delay = 60s
    expect(outcome.nextAttemptAt.getTime() - NOW.getTime()).toBe(60_000);
    expect(outcome.errorClass).toBe("provider_timeout");
    expect(state.incidentCalls).toHaveLength(0);
    expect(state.releaseCalls[0]).toMatchObject({
      terminal_status: "PENDING",
      next_attempt_at: outcome.nextAttemptAt.toISOString(),
    });
    // the output_summary carries the retry breadcrumb
    const releaseCall = state.releaseCalls[0] as {
      target_output_summary: { retry: { attempt_count: number; failure_category: string } };
    };
    expect(releaseCall.target_output_summary.retry.attempt_count).toBe(1);
    expect(releaseCall.target_output_summary.retry.failure_category).toBe("TRANSIENT");
  });
});

describe("runWithRetry — TRANSIENT at budget limit", () => {
  it("opens an incident and releases FAILED as RETRY_EXHAUSTED", async () => {
    const policy = { ...DEFAULT_RETRY_POLICY, maxAttempts: 3 };
    // We've completed 2 attempts already; this call will be attempt 3
    // (attemptCount + 1 = 3 = maxAttempts, canAttemptAgain returns false)
    const outcome = await runWithRetry(
      async () => {
        throw new TransientError("provider_timeout", "boom again");
      },
      makeContext(state, { attemptCount: 2, policy }),
    );
    expect(outcome.status).toBe("RETRY_EXHAUSTED");
    if (outcome.status !== "RETRY_EXHAUSTED") return;
    expect(outcome.incidentCreated).toBe(true);
    expect(outcome.recurrenceCount).toBe(1);
    expect(state.incidentCalls).toHaveLength(1);
    expect(state.incidentCalls[0]).toMatchObject({
      target_severity: "P3",
      target_category: "workflow_failure",
      target_fingerprint: `shadow_quote_followup:quote:${QUOTE}:provider_timeout`,
    });
    expect(state.releaseCalls[0]).toMatchObject({ terminal_status: "FAILED" });
  });
});

describe("runWithRetry — PERMANENT never retries", () => {
  it("opens an incident and releases FAILED on the first attempt", async () => {
    const outcome = await runWithRetry(
      async () => {
        throw new PermanentError("invalid_recipient", "no such user");
      },
      makeContext(state, { attemptCount: 0 }),
    );
    expect(outcome.status).toBe("PERMANENT_FAILED");
    if (outcome.status !== "PERMANENT_FAILED") return;
    expect(outcome.incidentCreated).toBe(true);
    expect(state.incidentCalls).toHaveLength(1);
    expect(state.incidentCalls[0]).toMatchObject({
      target_fingerprint: `shadow_quote_followup:quote:${QUOTE}:invalid_recipient`,
    });
    expect(state.releaseCalls[0]).toMatchObject({ terminal_status: "FAILED" });
  });
});

describe("runWithRetry — incident dedup on replay", () => {
  it("second occurrence with same fingerprint returns created=false, bumps recurrence", async () => {
    const first = await runWithRetry(
      async () => {
        throw new PermanentError("invalid_recipient", "attempt 1");
      },
      makeContext(state),
    );
    // Reset call counters, run again with the same fingerprint
    state.releaseCalls = [];
    state.incidentCalls = [];
    const second = await runWithRetry(
      async () => {
        throw new PermanentError("invalid_recipient", "attempt 2");
      },
      makeContext(state),
    );
    if (first.status !== "PERMANENT_FAILED" || second.status !== "PERMANENT_FAILED") {
      throw new Error("expected both permanent failures");
    }
    expect(second.incidentId).toBe(first.incidentId);
    expect(second.incidentCreated).toBe(false);
    expect(second.recurrenceCount).toBe(2);
  });
});

describe("runWithRetry — heuristic classification (no typed error)", () => {
  it("HTTP 401 classifies PERMANENT", async () => {
    const outcome = await runWithRetry(
      async () => {
        const e: Error & { status?: number } = new Error("unauthorized");
        e.status = 401;
        throw e;
      },
      makeContext(state),
    );
    expect(outcome.status).toBe("PERMANENT_FAILED");
  });

  it("HTTP 429 classifies TRANSIENT (retries)", async () => {
    const outcome = await runWithRetry(
      async () => {
        const e: Error & { status?: number } = new Error("rate limited");
        e.status = 429;
        throw e;
      },
      makeContext(state, { attemptCount: 0 }),
    );
    expect(outcome.status).toBe("RETRY_SCHEDULED");
  });

  it("unknown error defaults to TRANSIENT (retries)", async () => {
    const outcome = await runWithRetry(
      async () => {
        throw new Error("mystery");
      },
      makeContext(state, { attemptCount: 0 }),
    );
    expect(outcome.status).toBe("RETRY_SCHEDULED");
  });
});

describe("runWithRetry — release lease loss", () => {
  it("still returns RETRY_SCHEDULED even if release() reports lease lost", async () => {
    state.releaseReturns = false;
    const outcome = await runWithRetry(
      async () => {
        throw new TransientError("provider_timeout", "boom");
      },
      makeContext(state),
    );
    // A stale release is not a runner failure: the reclaiming worker
    // will re-enter with a fresh attempt when next_attempt_at arrives.
    expect(outcome.status).toBe("RETRY_SCHEDULED");
  });
});
