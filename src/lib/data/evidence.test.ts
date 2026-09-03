import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORG = "91000000-0000-4000-8000-000000000001";

interface FakeState {
  automationRuns: Array<{ approval_decision: string | null; approval_decided_at: string | null }>;
  events: Array<{ type: string; payload: Record<string, unknown>; created_at: string }>;
  counts: Record<string, number>;
  error: Record<string, { message: string }>;
}

let state: FakeState;

function makeFakeClient() {
  return {
    from(table: string) {
      const chain: {
        _predicates: string[];
        _head: boolean;
        select: (...args: unknown[]) => typeof chain;
        eq: (...args: unknown[]) => typeof chain;
        in: (...args: unknown[]) => typeof chain;
        is: (...args: unknown[]) => typeof chain;
        not: (...args: unknown[]) => typeof chain;
        gte: (...args: unknown[]) => typeof chain;
        lte: (...args: unknown[]) => typeof chain;
        order: (...args: unknown[]) => typeof chain;
        limit: (n: number) => Promise<{ data: unknown; error: unknown; count?: number }>;
        then: (resolve: (v: { data: unknown; error: unknown; count?: number }) => void) => Promise<void>;
      } = {
        _predicates: [],
        _head: false,
        select(_columns?: unknown, options?: unknown) {
          if (options && typeof options === "object" && "head" in options) {
            chain._head = (options as { head?: boolean }).head === true;
          }
          return chain;
        },
        eq() { return chain; },
        in() { return chain; },
        is() { return chain; },
        not() { return chain; },
        gte() { return chain; },
        lte() { return chain; },
        order() { return chain; },
        limit() {
          if (table === "automation_runs") {
            return Promise.resolve({ data: state.automationRuns, error: state.error[table] ?? null });
          }
          return Promise.resolve({ data: [], error: state.error[table] ?? null });
        },
        async then(resolve) {
          if (chain._head) {
            resolve({
              data: null,
              error: state.error[table] ?? null,
              count: state.counts[table] ?? 0,
            });
            return;
          }
          if (table === "events") {
            resolve({ data: state.events, error: state.error[table] ?? null, count: state.events.length });
            return;
          }
          resolve({
            data: null,
            error: state.error[table] ?? null,
            count: state.counts[table] ?? 0,
          });
        },
      };
      return chain;
    },
  };
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => makeFakeClient()),
}));

import {
  getApprovalRateWindow,
  getComplaintAndOptOutCounts,
  getIncidentTrend,
  getSendVsReplyRatio,
  getShadowProposalCount,
} from "./evidence";

const ORIGINAL_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ORIGINAL_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

beforeEach(() => {
  state = { automationRuns: [], events: [], counts: {}, error: {} };
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://test.local";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable-key-test-value";
});

afterEach(() => {
  if (ORIGINAL_URL === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = ORIGINAL_URL;
  if (ORIGINAL_KEY === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = ORIGINAL_KEY;
});

describe("getApprovalRateWindow", () => {
  it("returns null ratio when no decisions were observed", async () => {
    const r = await getApprovalRateWindow(ORG, 30);
    expect(r.observedCount).toBe(0);
    expect(r.approvalRatio).toBeNull();
  });

  it("computes ratio + timestamps from decided runs", async () => {
    state.automationRuns = [
      { approval_decision: "APPROVED", approval_decided_at: "2026-09-10T10:00:00Z" },
      { approval_decision: "APPROVED", approval_decided_at: "2026-09-09T10:00:00Z" },
      { approval_decision: "REJECTED", approval_decided_at: "2026-09-08T10:00:00Z" },
      { approval_decision: "APPROVED", approval_decided_at: "2026-09-07T10:00:00Z" },
    ];
    const r = await getApprovalRateWindow(ORG, 30);
    expect(r.observedCount).toBe(4);
    expect(r.approved).toBe(3);
    expect(r.rejected).toBe(1);
    expect(r.approvalRatio).toBe(0.75);
    expect(r.latestDecidedAt).toBe("2026-09-10T10:00:00Z");
    expect(r.earliestDecidedAt).toBe("2026-09-07T10:00:00Z");
  });

  it("clamps window size to [1, 500]", async () => {
    const smallest = await getApprovalRateWindow(ORG, 0);
    expect(smallest.windowSize).toBe(1);
    const largest = await getApprovalRateWindow(ORG, 5000);
    expect(largest.windowSize).toBe(500);
  });

  it("returns empty on env-missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const r = await getApprovalRateWindow(ORG, 30);
    expect(r.observedCount).toBe(0);
    expect(r.approvalRatio).toBeNull();
  });
});

describe("getShadowProposalCount", () => {
  it("groups events by decision outcome", async () => {
    state.events = [
      { type: "quote.followup_decided", payload: { decision: "DUE" }, created_at: "2026-09-10T00:00:00Z" },
      { type: "quote.followup_decided", payload: { decision: "DUE" }, created_at: "2026-09-10T00:00:00Z" },
      { type: "quote.followup_decided", payload: { decision: "STOP" }, created_at: "2026-09-10T00:00:00Z" },
      { type: "quote.followup_decided", payload: { decision: "PROPOSAL_UNAVAILABLE" }, created_at: "2026-09-10T00:00:00Z" },
    ];
    const r = await getShadowProposalCount(ORG);
    expect(r.proposed).toBe(2);
    expect(r.stopped).toBe(1);
    expect(r.proposalUnavailable).toBe(1);
  });
});

describe("getSendVsReplyRatio", () => {
  it("returns null ratio when no outbound was sent", async () => {
    state.counts = { outbound_messages: 0, events: 0 };
    const r = await getSendVsReplyRatio(ORG);
    expect(r.outboundSent).toBe(0);
    expect(r.replyRatio).toBeNull();
  });

  it("computes replies/sent ratio", async () => {
    state.counts = { outbound_messages: 10, events: 3 };
    const r = await getSendVsReplyRatio(ORG);
    expect(r.outboundSent).toBe(10);
    expect(r.quoteRepliesReceived).toBe(3);
    expect(r.replyRatio).toBe(0.3);
  });
});

describe("getComplaintAndOptOutCounts", () => {
  it("returns counts", async () => {
    state.counts = { quotes: 2 };
    const r = await getComplaintAndOptOutCounts(ORG);
    expect(r.quotesPausedForComplaint).toBe(2);
    expect(r.quotesOptedOut).toBe(2);
  });
});

describe("getIncidentTrend", () => {
  it("returns [] on env-missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const r = await getIncidentTrend(ORG, { days: 7 });
    expect(r).toEqual([]);
  });

  it("clamps days to [1, 90]", async () => {
    const r0 = await getIncidentTrend(ORG, { days: 0 });
    expect(r0).toHaveLength(1);
    const r120 = await getIncidentTrend(ORG, { days: 120 });
    expect(r120).toHaveLength(90);
  });
});
