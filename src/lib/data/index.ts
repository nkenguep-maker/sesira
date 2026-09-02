/**
 * SESIRA V1 data layer — the single seam every server component /
 * server action MUST call to read from Supabase. See
 * `~/.claude/rules/supabase-security.md` §4.
 *
 * Never import `@/lib/supabase/*` directly from a page or component;
 * always call one of these getters. Adding a new getter here is
 * cheap; adding a raw Supabase query in a page is a review-blocker.
 *
 * Every getter:
 *   * takes `organizationId` explicitly (never trusts URL/FormData),
 *   * uses `safeClient()` (returns the empty shape on env failure),
 *   * relies on RLS as the authoritative tenant boundary,
 *   * yields the empty shape (`[]`, `null`, or a zeroed object)
 *     rather than throwing when data is unavailable.
 */
export { safeClient } from "./safe-client";

export type { AttentionInboxRow, AttentionCountsByPriority } from "./attention";
export { getAttentionInbox, getAttentionCountsByPriority } from "./attention";

export type { PendingApprovalRow } from "./approvals";
export { getPendingApprovals } from "./approvals";

export type { OpsDashboardSummary } from "./ops-summary";
export { getOpsDashboardSummary } from "./ops-summary";

export type { QuoteTimelineItem } from "./quote-timeline";
export { getQuoteTimeline } from "./quote-timeline";

export type { OpenIncidentRow } from "./incidents";
export { getOpenIncidents } from "./incidents";

export type { WeeklyReport } from "./weekly-report";
export { getWeeklyReport } from "./weekly-report";

export type { UsageCostsSummary } from "./costs";
export { getUsageCostsSummary } from "./costs";

export type { QuoteResultsSummary } from "./results";
export { getQuoteResultsSummary } from "./results";

export type { EmailConnectionReadiness, AutomationReadiness } from "./readiness";
export { getEmailConnectionReadiness, getAutomationReadiness } from "./readiness";

export type {
  ApprovalRateWindow, ShadowProposalCount, SendVsReplyRatio,
  ComplaintAndOptOutCounts, IncidentTrendDay,
} from "./evidence";
export {
  getApprovalRateWindow, getShadowProposalCount, getSendVsReplyRatio,
  getComplaintAndOptOutCounts, getIncidentTrend,
} from "./evidence";

export type { OpportunityFeedRow, OpportunityDetail } from "./opportunities";
export { getOpportunitiesFeed, getOpportunityDetail } from "./opportunities";

export type { SoldNotScheduledRow } from "./sold-not-scheduled";
export { getSoldNotScheduledOpportunities } from "./sold-not-scheduled";
