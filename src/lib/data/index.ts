/**
 * SESIRA V1 data layer — the single seam every server component /
 * server action MUST call to read from Supabase.
 *
 * Every getter takes `organizationId` explicitly, relies on RLS as the
 * authoritative tenant boundary, and returns a safe empty shape when data is
 * unavailable so the UI never invents business state.
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

export type {
  CustomerListRow,
  QuoteListRow,
  OrganizationMemberRow,
  OrganizationSettingsRow,
} from "./core-ui";
export {
  getCustomerList,
  getQuoteList,
  getOrganizationMembers,
  getOrganizationSettings,
} from "./core-ui";
