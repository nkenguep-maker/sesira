import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

/**
 * Data-layer seam. Every getter in `src/lib/data/*` MUST call
 * `safeClient()` instead of `createClient()` directly.
 *
 * Reason: `createClient()` can throw if the env vars are missing or
 * malformed (missing `NEXT_PUBLIC_SUPABASE_URL`, invalid publishable
 * key). A getter that lets the throw bubble crashes the server
 * component; the seam catches it, logs it, and returns null. Each
 * getter checks `if (!supabase) return … ;` and yields the empty
 * shape appropriate for its signature (`[]`, `null`, or a zeroed
 * counts object) so the UI renders a graceful empty state.
 *
 * This is the rule documented in
 * `~/.claude/rules/supabase-security.md` §6.
 */
export async function safeClient(): Promise<SupabaseClient<Database> | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    console.error("[lib/data] Missing Supabase env vars; returning null client");
    return null;
  }
  try {
    return await createClient();
  } catch (err) {
    console.error("[lib/data] createClient failed:", (err as Error).message);
    return null;
  }
}
