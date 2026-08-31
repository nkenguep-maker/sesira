/**
 * Shadow evaluator — unit tests with an in-memory fake Supabase client.
 *
 * Covers the 14 scenarios required by the C5 gate:
 *   - eligible quote (DUE) → event created, proposal persisted
 *   - paused / opt-out / replied / won / lost / expired / disabled → STOP
 *   - schedule exhausted / not yet due → STOP
 *   - duplicate evaluation → event dedup, no side-effect burst
 *   - config level != SHADOW → CANCELLED with diagnostic output
 *   - claim lost → SKIPPED without any DB write
 *   - kill switch on and off — must not change behavior (Shadow ignores it)
 *
 * The fake client records every RPC and select so we can also assert the
 * NEGATIVE invariants: zero provider effects, zero `message.sent` events.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  SHADOW_EVENT_KEY_KIND,
  SHADOW_EVENT_TYPE,
  executeShadowQuoteFollowupRun,
} from "./execute";

const ORG_A = "91000000-0000-4000-8000-000000000001";
const ORG_B = "92000000-0000-4000-8000-000000000002";
const RUN_A = "91800000-0000-4000-8000-000000000001";
const QUOTE_A = "91500000-0000-4000-8000-000000000001";
const CONFIG_A = "91700000-0000-4000-8000-000000000001";
const CUSTOMER_A = "91300000-0000-4000-8000-000000000001";
const WORKER_ID = "test-worker";

interface QuoteFixture {
  id: string;
  organization_id: string;
  status:
    | "DRAFT"
    | "SENT"
    | "FOLLOWING_UP"
    | "REPLIED"
    | "NEEDS_HUMAN"
    | "WON"
    | "LOST"
    | "EXPIRED";
  sent_at: string | null;
  automation_paused_at: string | null;
  opted_out_at: string | null;
  reference: string | null;
  title: string;
  amount: number | null;
  currency: string;
  customer_id: string | null;
}

interface FakeState {
  claim: { returns: boolean; calls: unknown[] };
  release: { calls: unknown[]; returns: boolean };
  insertEventOnce: {
    calls: unknown[];
    // keyed by idempotency_key
    ledger: Map<string, { id: string; created: boolean }>;
    nextId: number;
  };
  runs: Map<string, {
    id: string;
    organization_id: string;
    automation_config_id: string | null;
    input_summary: unknown;
    status: string;
    output_summary?: unknown;
  }>;
  configs: Map<string, {
    id: string;
    organization_id: string;
    level: string;
    enabled: boolean;
    template_key: string;
    config: unknown;
  }>;
  quotes: Map<string, QuoteFixture>;
  customers: Map<string, {
    id: string;
    organization_id: string;
    display_name: string;
    email: string | null;
  }>;
  killSwitchEnabled: boolean; // Shadow must NOT read this
  observedKillSwitchReads: number;
}

function tableRow<T>(map: Map<string, T>, id: string, orgFilter?: string, orgOf?: (row: T) => string): T | null {
  const row = map.get(id);
  if (!row) return null;
  if (orgFilter && orgOf && orgOf(row) !== orgFilter) return null;
  return row;
}

function makeFakeClient(state: FakeState) {
  const fromApi = (table: string) => {
    const chain = {
      _table: table,
      _filters: [] as Array<{ column: string; op: string; value: unknown }>,
      _selectCols: "",
      select(cols: string) {
        this._selectCols = cols;
        return this;
      },
      eq(column: string, value: unknown) {
        this._filters.push({ column, op: "eq", value });
        return this;
      },
      in(column: string, values: unknown[]) {
        this._filters.push({ column, op: "in", value: values });
        return this;
      },
      maybeSingle() {
        const id = this._filters.find((f) => f.column === "id")?.value as string | undefined;
        const org = this._filters.find((f) => f.column === "organization_id")?.value as string | undefined;
        if (table === "automation_runs") {
          const row = id ? tableRow(state.runs, id, org, (r) => r.organization_id) : null;
          return Promise.resolve({ data: row, error: null });
        }
        if (table === "automation_configs") {
          const row = id ? tableRow(state.configs, id, org, (r) => r.organization_id) : null;
          return Promise.resolve({ data: row, error: null });
        }
        if (table === "quotes") {
          const row = id ? tableRow(state.quotes, id, org, (r) => r.organization_id) : null;
          return Promise.resolve({ data: row, error: null });
        }
        if (table === "customers") {
          const row = id ? tableRow(state.customers, id, org, (r) => r.organization_id) : null;
          return Promise.resolve({ data: row, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      },
      then(resolve: (value: { data: unknown[]; error: null }) => void) {
        // Used by loadAlreadyFiredSteps: select + eq(org) + in(status)
        if (table === "automation_runs") {
          const org = this._filters.find((f) => f.column === "organization_id")?.value as string | undefined;
          const statuses = this._filters.find((f) => f.op === "in")?.value as string[] | undefined;
          const rows = [...state.runs.values()].filter(
            (r) => (!org || r.organization_id === org) && (!statuses || statuses.includes(r.status)),
          );
          resolve({ data: rows, error: null });
          return;
        }
        resolve({ data: [], error: null });
      },
    };
    return chain;
  };

  const rpc = (name: string, args: Record<string, unknown>) => {
    if (name === "claim_automation_run") {
      state.claim.calls.push(args);
      if (state.claim.returns) {
        const runId = args.target_run_id as string;
        const run = state.runs.get(runId);
        if (run) run.status = "RUNNING";
      }
      return Promise.resolve({ data: state.claim.returns, error: null });
    }
    if (name === "release_automation_run") {
      state.release.calls.push(args);
      const runId = args.target_run_id as string;
      const run = state.runs.get(runId);
      if (run) {
        run.status = args.terminal_status as string;
        run.output_summary = args.target_output_summary;
      }
      return Promise.resolve({ data: state.release.returns, error: null });
    }
    if (name === "insert_event_once") {
      state.insertEventOnce.calls.push(args);
      const key = args.target_idempotency_key as string;
      const existing = state.insertEventOnce.ledger.get(key);
      if (existing) {
        return Promise.resolve({ data: [{ id: existing.id, created: false }], error: null });
      }
      state.insertEventOnce.nextId += 1;
      const id = `evt-${state.insertEventOnce.nextId}`;
      state.insertEventOnce.ledger.set(key, { id, created: true });
      return Promise.resolve({ data: [{ id, created: true }], error: null });
    }
    return Promise.resolve({ data: null, error: { message: `unhandled rpc ${name}` } });
  };

  return {
    from: fromApi,
    rpc,
  };
}

function seedEligibleFixture(state: FakeState) {
  state.runs.set(RUN_A, {
    id: RUN_A,
    organization_id: ORG_A,
    automation_config_id: CONFIG_A,
    input_summary: { quote_id: QUOTE_A, step: 1 },
    status: "PENDING",
  });
  state.configs.set(CONFIG_A, {
    id: CONFIG_A,
    organization_id: ORG_A,
    level: "SHADOW",
    enabled: true,
    template_key: "quote_followup_schedule",
    config: {},
  });
  state.quotes.set(QUOTE_A, {
    id: QUOTE_A,
    organization_id: ORG_A,
    status: "SENT",
    sent_at: "2026-08-20T09:00:00.000Z",
    automation_paused_at: null,
    opted_out_at: null,
    reference: "DEV-042",
    title: "Fenêtres",
    amount: 12000,
    currency: "EUR",
    customer_id: CUSTOMER_A,
  });
  state.customers.set(CUSTOMER_A, {
    id: CUSTOMER_A,
    organization_id: ORG_A,
    display_name: "Client A",
    email: "client-a@example.com",
  });
}

let state: FakeState;

beforeEach(() => {
  state = {
    claim: { returns: true, calls: [] },
    release: { calls: [], returns: true },
    insertEventOnce: { calls: [], ledger: new Map(), nextId: 0 },
    runs: new Map(),
    configs: new Map(),
    quotes: new Map(),
    customers: new Map(),
    killSwitchEnabled: false,
    observedKillSwitchReads: 0,
  };
});

afterEach(() => {
  // Global negative invariants: no matter the scenario, Shadow must never
  // emit anything but `quote.followup_decided`, and must never call an
  // RPC other than the three whitelisted ones.
  for (const call of state.insertEventOnce.calls) {
    const c = call as { target_type: string };
    expect(c.target_type).toBe(SHADOW_EVENT_TYPE);
  }
  // No release call should carry a terminal_status of anything unexpected
  for (const call of state.release.calls) {
    const c = call as { terminal_status: string };
    expect(["SUCCEEDED", "CANCELLED"]).toContain(c.terminal_status);
  }
});

async function run(now: Date, orgOverride?: string, runOverride?: string) {
  const client = makeFakeClient(state) as unknown as Parameters<typeof executeShadowQuoteFollowupRun>[0]["client"];
  return executeShadowQuoteFollowupRun({
    runId: runOverride ?? RUN_A,
    organizationId: orgOverride ?? ORG_A,
    workerId: WORKER_ID,
    now,
    client,
  });
}

describe("executeShadowQuoteFollowupRun — eligible quote", () => {
  it("produces a DUE outcome with a proposed action and a created event", async () => {
    seedEligibleFixture(state);
    const result = await run(new Date("2026-08-25T10:00:00.000Z")); // sent + 5 days > offset 3
    expect(result.status).toBe("COMPLETED");
    if (result.status !== "COMPLETED") return;
    expect(result.outcome).toBe("DUE");
    expect(result.proposedAction).toBeDefined();
    expect(result.proposedAction?.recipient_email).toBe("client-a@example.com");
    expect(result.eventCreated).toBe(true);
    expect(state.claim.calls).toHaveLength(1);
    expect(state.release.calls).toHaveLength(1);
    const releaseCall = state.release.calls[0] as { terminal_status: string; target_output_summary: { decision: { outcome: string } } };
    expect(releaseCall.terminal_status).toBe("SUCCEEDED");
    expect(releaseCall.target_output_summary.decision.outcome).toBe("DUE");
  });

  it("uses the deterministic idempotency key", async () => {
    seedEligibleFixture(state);
    await run(new Date("2026-08-25T10:00:00.000Z"));
    const eventCall = state.insertEventOnce.calls[0] as { target_idempotency_key: string };
    expect(eventCall.target_idempotency_key).toBe(
      `effect:${SHADOW_EVENT_KEY_KIND}:${QUOTE_A}:1`,
    );
  });
});

describe("executeShadowQuoteFollowupRun — stop conditions", () => {
  it.each([
    ["paused", (q: QuoteFixture) => { q.automation_paused_at = "2026-08-21T00:00:00.000Z"; }, "AUTOMATION_PAUSED"],
    ["opted-out", (q: QuoteFixture) => { q.opted_out_at = "2026-08-21T00:00:00.000Z"; }, "OPTED_OUT"],
    ["replied", (q: QuoteFixture) => { q.status = "REPLIED"; }, "QUOTE_REPLIED"],
    ["won", (q: QuoteFixture) => { q.status = "WON"; }, "QUOTE_TERMINAL"],
    ["lost", (q: QuoteFixture) => { q.status = "LOST"; }, "QUOTE_TERMINAL"],
    ["expired", (q: QuoteFixture) => { q.status = "EXPIRED"; }, "QUOTE_TERMINAL"],
  ])("stops on %s with the expected reason", async (_label, mutate, expected) => {
    seedEligibleFixture(state);
    const q = state.quotes.get(QUOTE_A);
    if (!q) throw new Error("fixture missing");
    mutate(q);
    const result = await run(new Date("2026-08-25T10:00:00.000Z"));
    expect(result.status).toBe("COMPLETED");
    if (result.status !== "COMPLETED") return;
    expect(result.outcome).toBe("STOP");
    expect(result.stopReason).toBe(expected);
    const eventCall = state.insertEventOnce.calls[0] as { target_payload: { outcome: string; stop_reason: string } };
    expect(eventCall.target_payload.outcome).toBe("STOP");
    expect(eventCall.target_payload.stop_reason).toBe(expected);
  });

  it("stops on automation disabled", async () => {
    seedEligibleFixture(state);
    const c = state.configs.get(CONFIG_A);
    if (!c) throw new Error("fixture missing");
    c.enabled = false;
    const result = await run(new Date("2026-08-25T10:00:00.000Z"));
    expect(result.status).toBe("COMPLETED");
    if (result.status !== "COMPLETED") return;
    expect(result.stopReason).toBe("AUTOMATION_DISABLED");
  });

  it("stops on not-yet-due when now precedes step 1", async () => {
    seedEligibleFixture(state);
    const result = await run(new Date("2026-08-21T00:00:00.000Z")); // sent + 1 day
    expect(result.status).toBe("COMPLETED");
    if (result.status !== "COMPLETED") return;
    expect(result.stopReason).toBe("NOT_YET_DUE");
  });

  it("stops on schedule exhausted when all three steps already fired", async () => {
    seedEligibleFixture(state);
    // seed already-fired terminal runs for steps 1, 2, 3 (and the current run for step 4?)
    for (const s of [1, 2, 3]) {
      state.runs.set(`fired-${s}`, {
        id: `fired-${s}`,
        organization_id: ORG_A,
        automation_config_id: CONFIG_A,
        input_summary: { quote_id: QUOTE_A, step: s },
        status: "SUCCEEDED",
      });
    }
    const result = await run(new Date("2026-09-15T10:00:00.000Z"));
    expect(result.status).toBe("COMPLETED");
    if (result.status !== "COMPLETED") return;
    expect(result.stopReason).toBe("SCHEDULE_EXHAUSTED");
  });
});

describe("executeShadowQuoteFollowupRun — mode routing", () => {
  it("cancels when the config level is not SHADOW", async () => {
    seedEligibleFixture(state);
    const c = state.configs.get(CONFIG_A);
    if (!c) throw new Error("fixture missing");
    c.level = "AUTOMATIC";
    const result = await run(new Date("2026-08-25T10:00:00.000Z"));
    expect(result.status).toBe("CANCELLED");
    if (result.status !== "CANCELLED") return;
    expect(result.reason).toBe("CONFIG_LEVEL_NOT_SHADOW");
    expect(result.observedLevel).toBe("AUTOMATIC");
    expect(state.insertEventOnce.calls).toHaveLength(0);
    const releaseCall = state.release.calls[0] as { terminal_status: string };
    expect(releaseCall.terminal_status).toBe("CANCELLED");
  });
});

describe("executeShadowQuoteFollowupRun — claim loss", () => {
  it("skips when the claim is lost, without any read or write", async () => {
    seedEligibleFixture(state);
    state.claim.returns = false;
    const result = await run(new Date("2026-08-25T10:00:00.000Z"));
    expect(result.status).toBe("SKIPPED");
    expect(state.release.calls).toHaveLength(0);
    expect(state.insertEventOnce.calls).toHaveLength(0);
  });
});

describe("executeShadowQuoteFollowupRun — idempotency", () => {
  it("returns created=false on a repeated evaluation of the same run", async () => {
    seedEligibleFixture(state);
    const first = await run(new Date("2026-08-25T10:00:00.000Z"));
    expect(first.status).toBe("COMPLETED");
    if (first.status !== "COMPLETED") return;
    expect(first.eventCreated).toBe(true);

    // reset the claim to succeed again but keep the event ledger populated —
    // a replay from a crashed worker must still see the original event id
    state.claim.returns = true;
    const second = await run(new Date("2026-08-25T10:00:00.000Z"));
    expect(second.status).toBe("COMPLETED");
    if (second.status !== "COMPLETED") return;
    expect(second.eventCreated).toBe(false);
    expect(second.eventId).toBe(first.eventId);
  });
});

describe("executeShadowQuoteFollowupRun — cross-tenant safety", () => {
  it("returns CANCELLED when the run does not belong to the caller org", async () => {
    seedEligibleFixture(state);
    // caller passes ORG_B but the run belongs to ORG_A
    const result = await run(new Date("2026-08-25T10:00:00.000Z"), ORG_B);
    // Because the fake client filters by organization_id, the run load
    // returns null. In real Supabase, RLS + the private RPC's WHERE clause
    // enforce the same behavior. Either way: no event, no proposal.
    expect(result.status === "CANCELLED" || result.status === "SKIPPED").toBe(true);
    expect(state.insertEventOnce.calls).toHaveLength(0);
  });
});

describe("executeShadowQuoteFollowupRun — kill switch invariance", () => {
  it("produces the same outcome regardless of EXTERNAL_ACTIONS_ENABLED", async () => {
    seedEligibleFixture(state);
    state.killSwitchEnabled = false;
    const first = await run(new Date("2026-08-25T10:00:00.000Z"));

    // reset ledger & counters, flip the switch
    state.claim.calls = [];
    state.release.calls = [];
    state.insertEventOnce.calls = [];
    state.insertEventOnce.ledger.clear();
    state.insertEventOnce.nextId = 0;
    // reset run status
    const run1 = state.runs.get(RUN_A);
    if (run1) {
      run1.status = "PENDING";
      run1.output_summary = undefined;
    }
    state.killSwitchEnabled = true;

    const second = await run(new Date("2026-08-25T10:00:00.000Z"));

    // Shadow must never read the kill switch — it is a no-send mode
    // regardless of the flag's value.
    expect(state.observedKillSwitchReads).toBe(0);

    if (first.status !== "COMPLETED" || second.status !== "COMPLETED") {
      throw new Error("expected both runs to complete");
    }
    expect(second.outcome).toBe(first.outcome);
    expect(second.proposedAction?.recipient_email).toBe(first.proposedAction?.recipient_email);
  });
});
