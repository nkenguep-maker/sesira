import "server-only";

import { safeClient } from "@/lib/data/safe-client";

/**
 * C22 — speed-to-lead read model. Wraps the SECURITY DEFINER
 * aggregate RPC. Every stat is derived from
 * (received_at, first_response_at) — no persisted derived data.
 *
 * `medianResponseSeconds` / `p90ResponseSeconds` are strictly
 * indicative. Never render them as a customer-facing SLA before
 * real traffic calibrates the numbers.
 */

export type SpeedToLeadStats = {
  periodStart: string;
  periodEnd: string;
  respondedCount: number;
  unrespondedCount: number;
  medianResponseSeconds: number | null;
  p90ResponseSeconds: number | null;
  fastestResponseSeconds: number | null;
  slowestResponseSeconds: number | null;
};

const EMPTY: Omit<SpeedToLeadStats, "periodStart" | "periodEnd"> = {
  respondedCount: 0, unrespondedCount: 0,
  medianResponseSeconds: null, p90ResponseSeconds: null,
  fastestResponseSeconds: null, slowestResponseSeconds: null,
};

export async function getSpeedToLeadStats(
  organizationId: string,
  options: { periodStart?: Date; periodEnd?: Date } = {},
): Promise<SpeedToLeadStats> {
  const now = new Date();
  const end = options.periodEnd ?? now;
  const start = options.periodStart ?? new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  const periodStart = start.toISOString();
  const periodEnd = end.toISOString();

  const supabase = await safeClient();
  if (!supabase) return { periodStart, periodEnd, ...EMPTY };

  const { data, error } = await supabase.rpc("speed_to_lead_stats", {
    target_organization_id: organizationId,
    target_period_start: periodStart,
    target_period_end: periodEnd,
  });
  if (error) {
    console.error("[lib/data] getSpeedToLeadStats:", error.message);
    return { periodStart, periodEnd, ...EMPTY };
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { periodStart, periodEnd, ...EMPTY };
  const r = row as Record<string, unknown>;
  return {
    periodStart,
    periodEnd,
    respondedCount: (r.responded_count as number) ?? 0,
    unrespondedCount: (r.unresponded_count as number) ?? 0,
    medianResponseSeconds: numOrNull(r.median_response_seconds),
    p90ResponseSeconds: numOrNull(r.p90_response_seconds),
    fastestResponseSeconds: numOrNull(r.fastest_response_seconds),
    slowestResponseSeconds: numOrNull(r.slowest_response_seconds),
  };
}

function numOrNull(v: unknown): number | null {
  return typeof v === "number" ? v : null;
}
