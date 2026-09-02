import "server-only";

import { safeClient } from "@/lib/data/safe-client";

/**
 * C17 — evidence read models. These functions COMPUTE metrics; they
 * do NOT drive any autonomous behavior.
 *
 * Doctrine invariant (roadmap C17): "AI confidence is not an
 * authorization; approval rate is not a trigger". Every function
 * below can be safely called from a dashboard or a report generator,
 * NEVER from a code path that decides whether to enable AUTOMATIC
 * mode. An org operator (a human) enables AUTOMATIC explicitly.
 *
 * Every function is scoped to a single organizationId and reads
 * only rows already visible under RLS. All returns include the raw
 * counts alongside any derived ratio so a caller can render either.
 */

// =========================================================================
// getApprovalRateWindow — last N approval-decided runs
// =========================================================================

export type ApprovalRateWindow = {
  windowSize: number;
  observedCount: number;
  approved: number;
  rejected: number;
  approvalRatio: number | null;
  earliestDecidedAt: string | null;
  latestDecidedAt: string | null;
};

/**
 * Approval rate over the last `windowSize` resolved runs (default
 * 30). Returns null ratio when the window has zero observed decisions
 * — a caller renders "no data" instead of 0%.
 *
 * NEVER call this to gate an automatic-mode transition. The number
 * is advisory only.
 */
export async function getApprovalRateWindow(
  organizationId: string,
  windowSize = 30,
): Promise<ApprovalRateWindow> {
  const clampedWindow = Math.max(1, Math.min(windowSize, 500));
  const empty: ApprovalRateWindow = {
    windowSize: clampedWindow,
    observedCount: 0, approved: 0, rejected: 0,
    approvalRatio: null,
    earliestDecidedAt: null, latestDecidedAt: null,
  };
  const supabase = await safeClient();
  if (!supabase) return empty;

  const { data, error } = await supabase
    .from("automation_runs")
    .select("approval_decision, approval_decided_at")
    .eq("organization_id", organizationId)
    .not("approval_decision", "is", null)
    .order("approval_decided_at", { ascending: false })
    .limit(clampedWindow);
  if (error) {
    console.error("[lib/data] getApprovalRateWindow:", error.message);
    return empty;
  }

  let approved = 0;
  let rejected = 0;
  let earliest: string | null = null;
  let latest: string | null = null;
  for (const row of data ?? []) {
    if (row.approval_decision === "APPROVED") approved += 1;
    else if (row.approval_decision === "REJECTED") rejected += 1;
    if (row.approval_decided_at) {
      if (latest === null) latest = row.approval_decided_at;
      earliest = row.approval_decided_at;
    }
  }
  const observedCount = approved + rejected;
  return {
    windowSize: clampedWindow,
    observedCount,
    approved,
    rejected,
    approvalRatio: observedCount === 0 ? null : approved / observedCount,
    earliestDecidedAt: earliest,
    latestDecidedAt: latest,
  };
}

// =========================================================================
// getShadowProposalCount — Shadow decisions emitted in a period
// =========================================================================

export type ShadowProposalCount = {
  periodStart: string;
  periodEnd: string;
  proposed: number;
  stopped: number;
  proposalUnavailable: number;
};

/**
 * Count of Shadow decisions emitted in a period, grouped by outcome
 * (DUE / STOP / PROPOSAL_UNAVAILABLE). Reads `events` where
 * type='quote.followup_decided' — the shadow executor writes exactly
 * one such event per completed run.
 */
export async function getShadowProposalCount(
  organizationId: string,
  options: { periodStart?: Date; periodEnd?: Date } = {},
): Promise<ShadowProposalCount> {
  const now = new Date();
  const end = options.periodEnd ?? now;
  const start = options.periodStart ?? new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  const periodStart = start.toISOString();
  const periodEnd = end.toISOString();
  const empty: ShadowProposalCount = {
    periodStart, periodEnd,
    proposed: 0, stopped: 0, proposalUnavailable: 0,
  };
  const supabase = await safeClient();
  if (!supabase) return empty;

  const { data, error } = await supabase
    .from("events")
    .select("payload")
    .eq("organization_id", organizationId)
    .eq("type", "quote.followup_decided")
    .gte("created_at", periodStart)
    .lte("created_at", periodEnd);
  if (error) {
    console.error("[lib/data] getShadowProposalCount:", error.message);
    return empty;
  }

  const counts = { ...empty };
  for (const row of data ?? []) {
    const decision = (row.payload as { decision?: string } | null)?.decision;
    if (decision === "DUE") counts.proposed += 1;
    else if (decision === "STOP") counts.stopped += 1;
    else if (decision === "PROPOSAL_UNAVAILABLE") counts.proposalUnavailable += 1;
  }
  return counts;
}

// =========================================================================
// getSendVsReplyRatio — how many outbound sends got a matching reply
// =========================================================================

export type SendVsReplyRatio = {
  periodStart: string;
  periodEnd: string;
  outboundSent: number;
  quoteRepliesReceived: number;
  replyRatio: number | null;
};

/**
 * Ratio of quote replies received to outbound sends in a period.
 * NOT a "response rate" — a customer may reply for reasons unrelated
 * to a follow-up. Use as a coarse operational signal, not a
 * commercial KPI.
 */
export async function getSendVsReplyRatio(
  organizationId: string,
  options: { periodStart?: Date; periodEnd?: Date } = {},
): Promise<SendVsReplyRatio> {
  const now = new Date();
  const end = options.periodEnd ?? now;
  const start = options.periodStart ?? new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  const periodStart = start.toISOString();
  const periodEnd = end.toISOString();
  const empty: SendVsReplyRatio = {
    periodStart, periodEnd,
    outboundSent: 0, quoteRepliesReceived: 0, replyRatio: null,
  };
  const supabase = await safeClient();
  if (!supabase) return empty;

  const [sent, replies] = await Promise.all([
    supabase.from("outbound_messages").select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId).eq("status", "SENT")
      .gte("sent_at", periodStart).lte("sent_at", periodEnd),
    supabase.from("events").select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId).eq("type", "quote.reply_received")
      .gte("created_at", periodStart).lte("created_at", periodEnd),
  ]);
  const outboundSent = sent.count ?? 0;
  const quoteRepliesReceived = replies.count ?? 0;
  return {
    periodStart, periodEnd,
    outboundSent, quoteRepliesReceived,
    replyRatio: outboundSent === 0 ? null : quoteRepliesReceived / outboundSent,
  };
}

// =========================================================================
// getComplaintAndOptOutCounts — sensitive-signal exposure
// =========================================================================

export type ComplaintAndOptOutCounts = {
  periodStart: string;
  periodEnd: string;
  quotesPausedForComplaint: number;
  quotesOptedOut: number;
};

/**
 * Sensitive-signal exposure for a period. `quotesPausedForComplaint`
 * = quotes with `automation_pause_reason='COMPLAINT'` in the window.
 * `quotesOptedOut` = quotes with `opted_out_at` set in the window.
 *
 * Both fire the COMPLAINT_HOLD / opt-out stop guards elsewhere in
 * the workflow — the number itself is for the ops trend view.
 */
export async function getComplaintAndOptOutCounts(
  organizationId: string,
  options: { periodStart?: Date; periodEnd?: Date } = {},
): Promise<ComplaintAndOptOutCounts> {
  const now = new Date();
  const end = options.periodEnd ?? now;
  const start = options.periodStart ?? new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  const periodStart = start.toISOString();
  const periodEnd = end.toISOString();
  const empty: ComplaintAndOptOutCounts = {
    periodStart, periodEnd,
    quotesPausedForComplaint: 0, quotesOptedOut: 0,
  };
  const supabase = await safeClient();
  if (!supabase) return empty;

  const [complaints, optOuts] = await Promise.all([
    supabase.from("quotes").select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId).eq("automation_pause_reason", "COMPLAINT")
      .gte("automation_paused_at", periodStart).lte("automation_paused_at", periodEnd),
    supabase.from("quotes").select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId).not("opted_out_at", "is", null)
      .gte("opted_out_at", periodStart).lte("opted_out_at", periodEnd),
  ]);
  return {
    periodStart, periodEnd,
    quotesPausedForComplaint: complaints.count ?? 0,
    quotesOptedOut: optOuts.count ?? 0,
  };
}

// =========================================================================
// getIncidentTrend — incidents opened per day (default 30 days)
// =========================================================================

export type IncidentTrendDay = {
  date: string;
  openedCount: number;
};

export async function getIncidentTrend(
  organizationId: string,
  options: { days?: number; periodEnd?: Date } = {},
): Promise<IncidentTrendDay[]> {
  const days = Math.max(1, Math.min(options.days ?? 30, 90));
  const end = options.periodEnd ?? new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);

  const supabase = await safeClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("incidents")
    .select("created_at")
    .eq("organization_id", organizationId)
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString());
  if (error) {
    console.error("[lib/data] getIncidentTrend:", error.message);
    return [];
  }

  const buckets = new Map<string, number>();
  for (const row of data ?? []) {
    const day = row.created_at.slice(0, 10);
    buckets.set(day, (buckets.get(day) ?? 0) + 1);
  }
  const out: IncidentTrendDay[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(end.getTime() - i * 24 * 60 * 60 * 1000);
    const date = d.toISOString().slice(0, 10);
    out.push({ date, openedCount: buckets.get(date) ?? 0 });
  }
  return out;
}
