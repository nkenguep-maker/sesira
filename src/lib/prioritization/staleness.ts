import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

/**
 * C20 — staleness signal for a single quote. Wraps
 * `compute_staleness_signal`. Every field returned is explainable
 * from the same inputs the score is built from.
 */

export type StalenessBand = "none" | "low" | "medium" | "high";

export interface StalenessSignal {
  quoteId: string;
  score: number;
  band: StalenessBand;
  factors: Record<string, unknown>;
  explanation: string;
}

export interface ComputeStalenessInput {
  organizationId: string;
  quoteId: string;
  now?: Date;
  client?: SupabaseClient<Database>;
}

export type ComputeStalenessResult =
  | { status: "OK"; signal: StalenessSignal }
  | { status: "NOT_FOUND" }
  | { status: "ERROR"; reason: string };

export async function computeStalenessSignal(
  input: ComputeStalenessInput,
): Promise<ComputeStalenessResult> {
  const supabase = input.client ?? (await createClient());
  const { data, error } = await supabase.rpc("compute_staleness_signal", {
    target_organization_id: input.organizationId,
    target_quote_id: input.quoteId,
    target_now: (input.now ?? new Date()).toISOString(),
  });
  if (error) return { status: "ERROR", reason: `compute_staleness_signal: ${error.message}` };
  const row = Array.isArray(data) ? data[0] : (data as {
    score?: unknown; band?: unknown; factors?: unknown; explanation?: unknown;
  } | null);
  if (!row || typeof row.score !== "number") return { status: "NOT_FOUND" };
  const bandRaw = row.band;
  const band: StalenessBand =
    bandRaw === "none" || bandRaw === "low" || bandRaw === "medium" || bandRaw === "high"
      ? bandRaw
      : "none";
  return {
    status: "OK",
    signal: {
      quoteId: input.quoteId,
      score: row.score,
      band,
      factors: (row.factors as Record<string, unknown>) ?? {},
      explanation: typeof row.explanation === "string" ? row.explanation : "",
    },
  };
}

/**
 * NEVER unlocks an autonomous action. This helper exists so a UI can
 * decide the visual sort order — but a caller MUST NOT use it to gate
 * a send / approval / transition.
 */
export function stalenessBandRank(band: StalenessBand): number {
  return band === "high" ? 3 : band === "medium" ? 2 : band === "low" ? 1 : 0;
}
