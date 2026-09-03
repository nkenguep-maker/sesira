import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { publicEnv, serverEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Service-role Supabase client. Used ONLY by trusted server-side
 * paths where a request cannot be authenticated as an org member:
 * the webhook receivers (C10 inbound replies, C7 delivery receipts).
 *
 * INVARIANTS:
 *   * `server-only` at the top blocks accidental client-bundle import.
 *   * The service-role key is read from a NON-PUBLIC env var
 *     (`SUPABASE_SERVICE_ROLE_KEY`) — the schema in `env.ts` marks it
 *     required for any code path that calls this helper.
 *   * The client is created stateless (no auth persistence, no cookie
 *     read) — a webhook run does not carry a session.
 *   * NEVER pass this client to code that runs on behalf of a specific
 *     tenant user; use `createClient()` (authenticated) for that.
 */
export function createServiceClient() {
  const serviceRoleKey = serverEnv.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error(
      "createServiceClient: SUPABASE_SERVICE_ROLE_KEY is not set. Refusing to create a service-role client without an explicit secret.",
    );
  }
  return createSupabaseClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
