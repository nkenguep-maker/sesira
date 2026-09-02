import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORG = "91000000-0000-4000-8000-000000000001";

interface AttentionRow {
  id: string;
  category: string;
  reason: string;
  priority: string;
  title: string;
  explanation: string | null;
  suggested_action: string | null;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
  assigned_user_id: string | null;
  metadata: Record<string, unknown>;
}

interface FakeState {
  rows: AttentionRow[];
  error: { message: string } | null;
}

let state: FakeState = { rows: [], error: null };

function makeFakeClient() {
  return {
    from(table: string) {
      if (table !== "attention_items") throw new Error(`unexpected table ${table}`);
      const chain = {
        _op: "select" as string,
        select: () => chain,
        eq: () => chain,
        in: () => chain,
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

// Import AFTER the mock is registered.
import {
  getAttentionCountsByPriority,
  getAttentionInbox,
} from "./attention";

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

describe("getAttentionInbox", () => {
  it("returns an empty array when env vars are missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const result = await getAttentionInbox(ORG);
    expect(result).toEqual([]);
  });

  it("returns an empty array on RPC error", async () => {
    state.error = { message: "rls denied" };
    const result = await getAttentionInbox(ORG);
    expect(result).toEqual([]);
  });

  it("maps DB columns to the camelCase shape", async () => {
    state.rows = [
      {
        id: "att-1", category: "SALES", reason: "REPLY_NEEDS_REVIEW",
        priority: "HIGH", title: "T", explanation: "E", suggested_action: "S",
        entity_type: "quote", entity_id: "q1",
        created_at: "2026-09-08T00:00:00Z", assigned_user_id: null,
        metadata: { k: "v" },
      },
    ];
    const rows = await getAttentionInbox(ORG);
    expect(rows).toEqual([
      {
        id: "att-1", category: "SALES", reason: "REPLY_NEEDS_REVIEW",
        priority: "HIGH", title: "T", explanation: "E", suggestedAction: "S",
        entityType: "quote", entityId: "q1",
        createdAt: "2026-09-08T00:00:00Z", assignedUserId: null,
        metadata: { k: "v" },
      },
    ]);
  });
});

describe("getAttentionCountsByPriority", () => {
  it("returns a zeroed shape when env is missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const counts = await getAttentionCountsByPriority(ORG);
    expect(counts).toEqual({ URGENT: 0, HIGH: 0, NORMAL: 0, LOW: 0, total: 0 });
  });

  it("aggregates by priority", async () => {
    state.rows = [
      { priority: "URGENT" } as AttentionRow,
      { priority: "URGENT" } as AttentionRow,
      { priority: "HIGH" } as AttentionRow,
      { priority: "NORMAL" } as AttentionRow,
      { priority: "LOW" } as AttentionRow,
      { priority: "UNKNOWN_BUCKET" } as AttentionRow,
    ];
    const counts = await getAttentionCountsByPriority(ORG);
    expect(counts).toEqual({ URGENT: 2, HIGH: 1, NORMAL: 1, LOW: 1, total: 6 });
  });
});
