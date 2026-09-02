import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORG = "91000000-0000-4000-8000-000000000001";
const QUOTE = "91500000-0000-4000-8000-c14a2a2a2a2a";

const VALID_PROPOSAL = {
  channel: "email",
  recipient_email: "customer@example.com",
  subject: "Relance étape 1",
  body: "Bonjour...",
  quote_id: QUOTE,
  step: 1,
  scheduled_for_iso: "2026-09-10T09:00:00+00:00",
  template_key: "quote_followup_schedule",
};

interface RunRow {
  id: string;
  automation_config_id: string | null;
  scheduled_for: string | null;
  created_at: string;
  output_summary: Record<string, unknown> | null;
}

interface FakeState {
  rows: RunRow[];
  error: { message: string } | null;
}

let state: FakeState = { rows: [], error: null };

function makeFakeClient() {
  return {
    from(table: string) {
      if (table !== "automation_runs") throw new Error(`unexpected table ${table}`);
      const chain = {
        select: () => chain,
        eq: () => chain,
        is: () => chain,
        order: () => chain,
        limit: () => Promise.resolve({ data: state.rows, error: state.error }),
      };
      return chain;
    },
  };
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => makeFakeClient()),
}));

import { getPendingApprovals } from "./approvals";

const ORIGINAL_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ORIGINAL_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

beforeEach(() => {
  state = { rows: [], error: null };
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://test.local";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable-key-test-value";
});

afterEach(() => {
  if (ORIGINAL_URL === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = ORIGINAL_URL;
  if (ORIGINAL_KEY === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = ORIGINAL_KEY;
});

describe("getPendingApprovals", () => {
  it("returns [] when env vars are missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const rows = await getPendingApprovals(ORG);
    expect(rows).toEqual([]);
  });

  it("returns [] on RPC error", async () => {
    state.error = { message: "rls denied" };
    const rows = await getPendingApprovals(ORG);
    expect(rows).toEqual([]);
  });

  it("returns a row for a run with a valid proposed_action", async () => {
    state.rows = [
      {
        id: "run-1",
        automation_config_id: "cfg-1",
        scheduled_for: "2026-09-10T09:00:00Z",
        created_at: "2026-09-09T12:00:00Z",
        output_summary: { proposed_action: VALID_PROPOSAL },
      },
    ];
    const rows = await getPendingApprovals(ORG);
    expect(rows).toHaveLength(1);
    expect(rows[0].runId).toBe("run-1");
    expect(rows[0].quoteId).toBe(QUOTE);
    expect(rows[0].subject).toBe("Relance étape 1");
    expect(rows[0].step).toBe(1);
  });

  it("SKIPS runs whose output_summary has NO proposed_action", async () => {
    state.rows = [
      {
        id: "run-empty",
        automation_config_id: null,
        scheduled_for: null,
        created_at: "2026-09-09T12:00:00Z",
        output_summary: {},
      },
    ];
    const rows = await getPendingApprovals(ORG);
    expect(rows).toEqual([]);
  });

  it("SKIPS runs whose proposed_action is malformed (schema-invalid)", async () => {
    state.rows = [
      {
        id: "run-bad",
        automation_config_id: null,
        scheduled_for: null,
        created_at: "2026-09-09T12:00:00Z",
        output_summary: {
          proposed_action: {
            // Missing required fields, and channel is not "email".
            channel: "sms",
            subject: "x",
          },
        },
      },
      {
        id: "run-good",
        automation_config_id: null,
        scheduled_for: null,
        created_at: "2026-09-09T13:00:00Z",
        output_summary: { proposed_action: VALID_PROPOSAL },
      },
    ];
    const rows = await getPendingApprovals(ORG);
    expect(rows).toHaveLength(1);
    expect(rows[0].runId).toBe("run-good");
  });

  it("truncates bodyPreview to at most 400 characters", async () => {
    const longBody = "x".repeat(1000);
    state.rows = [
      {
        id: "run-long",
        automation_config_id: null,
        scheduled_for: null,
        created_at: "2026-09-09T13:00:00Z",
        output_summary: {
          proposed_action: { ...VALID_PROPOSAL, body: longBody },
        },
      },
    ];
    const rows = await getPendingApprovals(ORG);
    expect(rows[0].bodyPreview.length).toBe(400);
    expect(rows[0].bodyPreview).toBe("x".repeat(400));
  });
});
