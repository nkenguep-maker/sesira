import "server-only";

import { safeClient } from "@/lib/data/safe-client";

/**
 * V1 results read model — aggregate quote outcomes over a period.
 * The operator screen shows "of the quotes touched by SESIRA this
 * month, how many transitioned to WON / LOST / REPLIED / are still
 * FOLLOWING_UP or SENT". Counts only, no monetary sum (see rationale
 * in `weekly-report.ts`).
 */

export type QuoteResultsSummary = {
  periodStart: string;
  periodEnd: string;
  won: number;
  lost: number;
  replied: number;
  needsHuman: number;
  followingUp: number;
  sent: number;
  expired: number;
  totalTouched: number;
};

const EMPTY: Omit<QuoteResultsSummary, "periodStart" | "periodEnd"> = {
  won: 0, lost: 0, replied: 0, needsHuman: 0,
  followingUp: 0, sent: 0, expired: 0, totalTouched: 0,
};

export async function getQuoteResultsSummary(
  organizationId: string,
  options: { periodStart?: Date; periodEnd?: Date } = {},
): Promise<QuoteResultsSummary> {
  const now = new Date();
  const end = options.periodEnd ?? now;
  const start = options.periodStart ?? new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  const periodStart = start.toISOString();
  const periodEnd = end.toISOString();

  const supabase = await safeClient();
  if (!supabase) return { periodStart, periodEnd, ...EMPTY };

  const { data, error } = await supabase
    .from("quotes")
    .select("status, updated_at")
    .eq("organization_id", organizationId)
    .gte("updated_at", periodStart)
    .lte("updated_at", periodEnd);
  if (error) {
    console.error("[lib/data] getQuoteResultsSummary:", error.message);
    return { periodStart, periodEnd, ...EMPTY };
  }

  const counts = { ...EMPTY };
  for (const row of data ?? []) {
    counts.totalTouched += 1;
    switch (row.status) {
      case "WON":          counts.won += 1; break;
      case "LOST":         counts.lost += 1; break;
      case "REPLIED":      counts.replied += 1; break;
      case "NEEDS_HUMAN":  counts.needsHuman += 1; break;
      case "FOLLOWING_UP": counts.followingUp += 1; break;
      case "SENT":         counts.sent += 1; break;
      case "EXPIRED":      counts.expired += 1; break;
      default: break;
    }
  }
  return { periodStart, periodEnd, ...counts };
}
