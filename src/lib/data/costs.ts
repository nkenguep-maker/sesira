import "server-only";

import { safeClient } from "@/lib/data/safe-client";

/**
 * V1 usage-cost read model. Aggregates the estimated direct cost of
 * SESIRA operations for a period:
 *
 *   * AI runs — sum of `ai_runs.estimated_cost` (nullable → skipped
 *     when a run did not record a cost estimate).
 *   * Outbound emails — count only. Provider price is org-configurable
 *     and lives outside the DB; a future admin panel supplies it.
 *   * Inbound emails — same rationale, count only.
 *
 * The shape returns raw numbers, not currency-formatted strings. A UI
 * layer picks the display format (locale, currency).
 */

export type UsageCostsSummary = {
  periodStart: string;
  periodEnd: string;
  aiRunsCount: number;
  aiRunsSuccessCount: number;
  aiEstimatedCostTotal: number;
  aiInputTokensTotal: number;
  aiOutputTokensTotal: number;
  outboundSentCount: number;
  outboundFailedCount: number;
  inboundReceivedCount: number;
};

const EMPTY: Omit<UsageCostsSummary, "periodStart" | "periodEnd"> = {
  aiRunsCount: 0,
  aiRunsSuccessCount: 0,
  aiEstimatedCostTotal: 0,
  aiInputTokensTotal: 0,
  aiOutputTokensTotal: 0,
  outboundSentCount: 0,
  outboundFailedCount: 0,
  inboundReceivedCount: 0,
};

export async function getUsageCostsSummary(
  organizationId: string,
  options: { periodStart?: Date; periodEnd?: Date } = {},
): Promise<UsageCostsSummary> {
  const now = new Date();
  const end = options.periodEnd ?? now;
  const start = options.periodStart ?? new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  const periodStart = start.toISOString();
  const periodEnd = end.toISOString();

  const supabase = await safeClient();
  if (!supabase) return { periodStart, periodEnd, ...EMPTY };

  const [aiRuns, outboundSent, outboundFailed, inboundReceived] = await Promise.all([
    supabase
      .from("ai_runs")
      .select("status, estimated_cost, input_tokens, output_tokens")
      .eq("organization_id", organizationId)
      .gte("created_at", periodStart)
      .lte("created_at", periodEnd),
    supabase.from("outbound_messages").select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId).eq("status", "SENT")
      .gte("sent_at", periodStart).lte("sent_at", periodEnd),
    supabase.from("outbound_messages").select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId).eq("status", "FAILED")
      .gte("failed_at", periodStart).lte("failed_at", periodEnd),
    supabase.from("messages").select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId).eq("direction", "INBOUND")
      .gte("received_at", periodStart).lte("received_at", periodEnd),
  ]);

  let aiRunsCount = 0;
  let aiRunsSuccessCount = 0;
  let aiEstimatedCostTotal = 0;
  let aiInputTokensTotal = 0;
  let aiOutputTokensTotal = 0;
  for (const row of aiRuns.data ?? []) {
    aiRunsCount += 1;
    if (row.status === "SUCCEEDED") aiRunsSuccessCount += 1;
    if (typeof row.estimated_cost === "number") aiEstimatedCostTotal += row.estimated_cost;
    if (typeof row.input_tokens === "number") aiInputTokensTotal += row.input_tokens;
    if (typeof row.output_tokens === "number") aiOutputTokensTotal += row.output_tokens;
  }

  return {
    periodStart,
    periodEnd,
    aiRunsCount,
    aiRunsSuccessCount,
    aiEstimatedCostTotal,
    aiInputTokensTotal,
    aiOutputTokensTotal,
    outboundSentCount: outboundSent.count ?? 0,
    outboundFailedCount: outboundFailed.count ?? 0,
    inboundReceivedCount: inboundReceived.count ?? 0,
  };
}
