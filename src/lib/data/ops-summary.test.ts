import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORG = "91000000-0000-4000-8000-000000000001";

interface FakeState {
  counts: Record<string, number>;
  error: Record<string, { message: string }>;
}

let state: FakeState = { counts: {}, error: {} };

function chainForTable(table: string) {
  const chain: {
    _predicates: string[];
    select: (...args: unknown[]) => typeof chain;
    eq: (...args: unknown[]) => typeof chain;
    in: (...args: unknown[]) => typeof chain;
    is: (...args: unknown[]) => typeof chain;
    gte: (...args: unknown[]) => typeof chain;
    then: (resolve: (value: { count: number | null; error: unknown }) => void) => Promise<void>;
  } = {
    _predicates: [],
    select() { return chain; },
    eq(_col, val) { chain._predicates.push(String(val)); return chain; },
    in(_col, vals) { chain._predicates.push((vals as string[]).join(",")); return chain; },
    is() { return chain; },
    gte() { return chain; },
    async then(resolve) {
      const key = `${table}|${chain._predicates.join("|")}`;
      resolve({
        count: state.counts[key] ?? state.counts[table] ?? 0,
        error: state.error[key] ?? state.error[table] ?? null,
      });
    },
  };
  return chain;
}

function makeFakeClient() {
  return {
    from: chainForTable,
  };
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => makeFakeClient()),
}));

import { getOpsDashboardSummary } from "./ops-summary";

const ORIGINAL_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ORIGINAL_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

beforeEach(() => {
  state = { counts: {}, error: {} };
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://test.local";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable-key-test-value";
});

afterEach(() => {
  if (ORIGINAL_URL === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = ORIGINAL_URL;
  if (ORIGINAL_KEY === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = ORIGINAL_KEY;
});

describe("getOpsDashboardSummary", () => {
  it("returns a zeroed summary when env vars are missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const summary = await getOpsDashboardSummary(ORG);
    expect(summary).toEqual({
      attentionOpen: 0, approvalsPending: 0, incidentsOpen: 0,
      runsFailed24h: 0, outboundFailed24h: 0,
    });
  });

  it("aggregates counts across the five tables in parallel", async () => {
    state.counts = {
      attention_items: 5,
      automation_runs: 2,
      incidents: 1,
      outbound_messages: 3,
    };
    // automation_runs is queried twice — once for WAITING_FOR_APPROVAL,
    //   once for FAILED. Both fallback to `automation_runs` in our
    //   fake because we did not distinguish predicates in the key.
    const summary = await getOpsDashboardSummary(ORG);
    expect(summary.attentionOpen).toBe(5);
    expect(summary.incidentsOpen).toBe(1);
    expect(summary.outboundFailed24h).toBe(3);
    expect(summary.approvalsPending).toBe(2);
    expect(summary.runsFailed24h).toBe(2);
  });

  it("returns 0 for a stream that reports null count", async () => {
    state.counts = {
      attention_items: 5,
      // Others: default 0
    };
    const summary = await getOpsDashboardSummary(ORG);
    expect(summary).toEqual({
      attentionOpen: 5, approvalsPending: 0, incidentsOpen: 0,
      runsFailed24h: 0, outboundFailed24h: 0,
    });
  });
});
