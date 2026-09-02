import "server-only";

import { safeClient } from "@/lib/data/safe-client";

/**
 * V1 weekly report contract. Aggregates the last 7 days of activity
 * for an org — a shape stable enough that an email digest OR the
 * ops dashboard can render from the same source.
 *
 * The report is intentionally count-only: precise financial
 * calculations depend on org accounting rules (VAT, currency
 * conversion, discount attribution) and belong in a dedicated
 * commercial-results module (roadmap Wave 2). What the weekly
 * report gives is "how much did SESIRA move, and where did it
 * defer to humans".
 */

export type WeeklyReport = {
  periodStart: string;
  periodEnd: string;
  attentionOpened: number;
  attentionResolved: number;
  attentionDismissed: number;
  outboundSent: number;
  outboundFailed: number;
  inboundReceived: number;
  quoteTransitionsReplied: number;
  incidentsOpened: number;
  incidentsResolved: number;
  automationRunsSucceeded: number;
  automationRunsFailed: number;
  approvalsResolved: number;
  approvalsPending: number;
  importsCompleted: number;
  importRowsOk: number;
  importRowsError: number;
};

const EMPTY: Omit<WeeklyReport, "periodStart" | "periodEnd"> = {
  attentionOpened: 0,
  attentionResolved: 0,
  attentionDismissed: 0,
  outboundSent: 0,
  outboundFailed: 0,
  inboundReceived: 0,
  quoteTransitionsReplied: 0,
  incidentsOpened: 0,
  incidentsResolved: 0,
  automationRunsSucceeded: 0,
  automationRunsFailed: 0,
  approvalsResolved: 0,
  approvalsPending: 0,
  importsCompleted: 0,
  importRowsOk: 0,
  importRowsError: 0,
};

/**
 * The default period is the last rolling 7 days ending at `now`.
 * A caller can pass an explicit `periodStart` / `periodEnd` for a
 * fixed-week (Mon-Sun) digest.
 */
export async function getWeeklyReport(
  organizationId: string,
  options: { periodStart?: Date; periodEnd?: Date } = {},
): Promise<WeeklyReport> {
  const now = new Date();
  const end = options.periodEnd ?? now;
  const start = options.periodStart ?? new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
  const periodStart = start.toISOString();
  const periodEnd = end.toISOString();

  const supabase = await safeClient();
  if (!supabase) return { periodStart, periodEnd, ...EMPTY };

  const [
    attentionOpened,
    attentionResolved,
    attentionDismissed,
    outboundSent,
    outboundFailed,
    inboundReceived,
    quoteRepliedEvents,
    incidentsOpened,
    incidentsResolved,
    runsSucceeded,
    runsFailed,
    approvalsResolved,
    approvalsPending,
    importsCompleted,
    importRowsOk,
    importRowsError,
  ] = await Promise.all([
    supabase.from("attention_items").select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId).gte("created_at", periodStart).lte("created_at", periodEnd),
    supabase.from("attention_items").select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId).eq("status", "RESOLVED")
      .gte("resolved_at", periodStart).lte("resolved_at", periodEnd),
    supabase.from("attention_items").select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId).eq("status", "DISMISSED")
      .gte("resolved_at", periodStart).lte("resolved_at", periodEnd),
    supabase.from("outbound_messages").select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId).eq("status", "SENT")
      .gte("sent_at", periodStart).lte("sent_at", periodEnd),
    supabase.from("outbound_messages").select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId).eq("status", "FAILED")
      .gte("failed_at", periodStart).lte("failed_at", periodEnd),
    supabase.from("messages").select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId).eq("direction", "INBOUND")
      .gte("received_at", periodStart).lte("received_at", periodEnd),
    supabase.from("events").select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId).eq("type", "quote.reply_received")
      .gte("created_at", periodStart).lte("created_at", periodEnd),
    supabase.from("incidents").select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .gte("created_at", periodStart).lte("created_at", periodEnd),
    supabase.from("incidents").select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId).eq("status", "RESOLVED")
      .gte("resolved_at", periodStart).lte("resolved_at", periodEnd),
    supabase.from("automation_runs").select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId).eq("status", "SUCCEEDED")
      .gte("completed_at", periodStart).lte("completed_at", periodEnd),
    supabase.from("automation_runs").select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId).eq("status", "FAILED")
      .gte("completed_at", periodStart).lte("completed_at", periodEnd),
    supabase.from("automation_runs").select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId).not("approval_decision", "is", null)
      .gte("approval_decided_at", periodStart).lte("approval_decided_at", periodEnd),
    supabase.from("automation_runs").select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId).eq("status", "WAITING_FOR_APPROVAL")
      .is("approval_decision", null),
    supabase.from("imports").select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId).eq("status", "COMPLETED")
      .gte("completed_at", periodStart).lte("completed_at", periodEnd),
    supabase.from("import_rows").select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId).eq("status", "OK")
      .gte("created_at", periodStart).lte("created_at", periodEnd),
    supabase.from("import_rows").select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId).eq("status", "ERROR")
      .gte("created_at", periodStart).lte("created_at", periodEnd),
  ]);

  return {
    periodStart,
    periodEnd,
    attentionOpened: attentionOpened.count ?? 0,
    attentionResolved: attentionResolved.count ?? 0,
    attentionDismissed: attentionDismissed.count ?? 0,
    outboundSent: outboundSent.count ?? 0,
    outboundFailed: outboundFailed.count ?? 0,
    inboundReceived: inboundReceived.count ?? 0,
    quoteTransitionsReplied: quoteRepliedEvents.count ?? 0,
    incidentsOpened: incidentsOpened.count ?? 0,
    incidentsResolved: incidentsResolved.count ?? 0,
    automationRunsSucceeded: runsSucceeded.count ?? 0,
    automationRunsFailed: runsFailed.count ?? 0,
    approvalsResolved: approvalsResolved.count ?? 0,
    approvalsPending: approvalsPending.count ?? 0,
    importsCompleted: importsCompleted.count ?? 0,
    importRowsOk: importRowsOk.count ?? 0,
    importRowsError: importRowsError.count ?? 0,
  };
}
