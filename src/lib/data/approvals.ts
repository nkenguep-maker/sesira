import "server-only";

import { safeClient } from "@/lib/data/safe-client";
import { proposedQuoteFollowupActionSchema } from "@/lib/shadow/propose";

/**
 * V1 approvals inbox read model. Returns automation_runs in
 * WAITING_FOR_APPROVAL with a validated proposed_action. Runs whose
 * output_summary carries a malformed / missing proposed_action are
 * SKIPPED (the C12 dispatcher will cancel them once approved, so the
 * operator UI should not offer to approve an unpresentable proposal).
 */

export type PendingApprovalRow = {
  runId: string;
  automationConfigId: string | null;
  scheduledFor: string | null;
  createdAt: string;
  quoteId: string;
  step: number;
  recipientEmail: string;
  subject: string;
  bodyPreview: string;
  templateKey: string;
};

const BODY_PREVIEW_MAX = 400;

export async function getPendingApprovals(
  organizationId: string,
  options: { limit?: number } = {},
): Promise<PendingApprovalRow[]> {
  const supabase = await safeClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("automation_runs")
    .select(
      "id, automation_config_id, scheduled_for, created_at, output_summary",
    )
    .eq("organization_id", organizationId)
    .eq("status", "WAITING_FOR_APPROVAL")
    .is("approval_decision", null)
    .order("created_at", { ascending: true })
    .limit(Math.min(options.limit ?? 50, 200));
  if (error) {
    console.error("[lib/data] getPendingApprovals:", error.message);
    return [];
  }

  const rows: PendingApprovalRow[] = [];
  for (const raw of data ?? []) {
    const summary = raw.output_summary as Record<string, unknown> | null;
    const proposed = summary?.proposed_action;
    const parsed = proposedQuoteFollowupActionSchema.safeParse(proposed);
    if (!parsed.success) continue;
    rows.push({
      runId: raw.id,
      automationConfigId: raw.automation_config_id,
      scheduledFor: raw.scheduled_for,
      createdAt: raw.created_at,
      quoteId: parsed.data.quote_id,
      step: parsed.data.step,
      recipientEmail: parsed.data.recipient_email,
      subject: parsed.data.subject,
      bodyPreview: parsed.data.body.slice(0, BODY_PREVIEW_MAX),
      templateKey: parsed.data.template_key,
    });
  }
  return rows;
}
