import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/database";

/**
 * C26 — field-report server helpers. Two SECURITY DEFINER RPCs
 * wrapped as discriminated unions. Same shape as C25 intervention
 * actions.
 *
 * AI may propose gaps via `recordFieldReportGaps`; AI must NEVER
 * fabricate an observation to close a gap. Send effect is out of
 * scope here — a caller wires the customer send through the C9
 * email boundary AFTER the report is APPROVED.
 */

interface Deps { client?: SupabaseClient<Database>; }

export type FieldReportActionResult =
  | { status: "APPLIED" } | { status: "NOT_ELIGIBLE" } | { status: "ERROR"; reason: string };

export type FieldReportReviewStatus = "REVIEWED" | "APPROVED" | "SENT";

export interface TransitionFieldReportInput {
  organizationId: string;
  reportId: string;
  reviewerUserId: string;
  newStatus: FieldReportReviewStatus;
}

export async function transitionFieldReport(
  input: TransitionFieldReportInput,
  deps: Deps = {},
): Promise<FieldReportActionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("transition_field_report_review", {
    target_organization_id: input.organizationId,
    target_report_id: input.reportId,
    target_reviewer_user_id: input.reviewerUserId,
    target_new_status: input.newStatus,
  });
  if (error) return { status: "ERROR", reason: `transition_field_report_review: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

export interface FieldReportGap {
  field: string;
  reason: string;
}

export interface RecordFieldReportGapsInput {
  organizationId: string;
  reportId: string;
  gaps: FieldReportGap[];
}

export async function recordFieldReportGaps(
  input: RecordFieldReportGapsInput,
  deps: Deps = {},
): Promise<FieldReportActionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("record_field_report_gaps", {
    target_organization_id: input.organizationId,
    target_report_id: input.reportId,
    target_report_gaps: input.gaps as unknown as Json,
  });
  if (error) return { status: "ERROR", reason: `record_field_report_gaps: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}
