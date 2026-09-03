import "server-only";

import { safeClient } from "@/lib/data/safe-client";

/**
 * V1 ops-dashboard summary. Aggregates counts the operator sees on
 * the top-nav badge and the home tile. All counts scope to the
 * viewer's org (RLS is authoritative, the seam still filters).
 *
 * The queries use `head:true` + `count:'exact'` to avoid fetching
 * rows we do not read — each is a cheap COUNT(*).
 */

export type OpsDashboardSummary = {
  attentionOpen: number;
  approvalsPending: number;
  incidentsOpen: number;
  runsFailed24h: number;
  outboundFailed24h: number;
};

const EMPTY: OpsDashboardSummary = {
  attentionOpen: 0,
  approvalsPending: 0,
  incidentsOpen: 0,
  runsFailed24h: 0,
  outboundFailed24h: 0,
};

export async function getOpsDashboardSummary(
  organizationId: string,
): Promise<OpsDashboardSummary> {
  const supabase = await safeClient();
  if (!supabase) return EMPTY;

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [attention, approvals, incidents, runsFailed, outboundFailed] = await Promise.all([
    supabase
      .from("attention_items")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .in("status", ["OPEN", "IN_PROGRESS"]),
    supabase
      .from("automation_runs")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "WAITING_FOR_APPROVAL")
      .is("approval_decision", null),
    supabase
      .from("incidents")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .in("status", ["OPEN", "INVESTIGATING"]),
    supabase
      .from("automation_runs")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "FAILED")
      .gte("completed_at", since24h),
    supabase
      .from("outbound_messages")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "FAILED")
      .gte("failed_at", since24h),
  ]);

  return {
    attentionOpen: attention.count ?? 0,
    approvalsPending: approvals.count ?? 0,
    incidentsOpen: incidents.count ?? 0,
    runsFailed24h: runsFailed.count ?? 0,
    outboundFailed24h: outboundFailed.count ?? 0,
  };
}
