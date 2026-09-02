import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

/**
 * C12 — human resolution of a WAITING_FOR_APPROVAL run.
 *
 * Both helpers run under the authenticated tenant client (the
 * operator's session). The RPCs check `is_organization_member` on
 * the caller AND validate that the passed `approverUserId` is an
 * ACTIVE member — in practice these must match (an operator can
 * only decide on their own behalf), but the two-parameter shape
 * keeps the RPC composable with a future delegated-approval flow.
 *
 * On approval, the run transitions WAITING_FOR_APPROVAL -> RUNNING
 * with a fresh lease held by `dispatcherWorker`. The caller is
 * expected to immediately invoke `dispatchApprovedFollowup` with
 * the same `dispatcherWorker` so the send happens under the
 * caller's lease (no race with a background worker).
 *
 * On rejection, the run transitions WAITING_FOR_APPROVAL ->
 * CANCELLED. No provider effect.
 *
 * Both helpers return a discriminated union — the caller decides
 * how to respond to `NOT_ELIGIBLE` (already resolved, or not in
 * WAITING_FOR_APPROVAL) without exception handling.
 */

const DEFAULT_DISPATCHER_LEASE_SECONDS = 300;

export interface ApproveInput {
  runId: string;
  organizationId: string;
  approverUserId: string;
  comment?: string | null;
  dispatcherWorker: string;
  leaseSeconds?: number;
  /** Escape hatch for tests: inject a preconstructed client. */
  client?: SupabaseClient<Database>;
}

export type ResolveApprovalResult =
  | { status: "RESOLVED"; runId: string; decision: "APPROVED" | "REJECTED" }
  | { status: "NOT_ELIGIBLE"; runId: string; reason: "already_resolved_or_not_waiting" }
  | { status: "ERROR"; reason: string };

export async function approveAutomationRun(
  input: ApproveInput,
): Promise<ResolveApprovalResult> {
  const supabase = input.client ?? (await createClient());
  const rpc = await supabase.rpc("approve_automation_run_pending_approval", {
    target_run_id: input.runId,
    target_organization_id: input.organizationId,
    target_approver_user_id: input.approverUserId,
    target_comment: input.comment ?? null,
    target_dispatcher_worker: input.dispatcherWorker,
    target_lease_seconds: input.leaseSeconds ?? DEFAULT_DISPATCHER_LEASE_SECONDS,
  });
  if (rpc.error) {
    return { status: "ERROR", reason: `approve_automation_run_pending_approval: ${rpc.error.message}` };
  }
  if (rpc.data !== true) {
    return { status: "NOT_ELIGIBLE", runId: input.runId, reason: "already_resolved_or_not_waiting" };
  }
  return { status: "RESOLVED", runId: input.runId, decision: "APPROVED" };
}

export interface RejectInput {
  runId: string;
  organizationId: string;
  approverUserId: string;
  comment?: string | null;
  /** Escape hatch for tests: inject a preconstructed client. */
  client?: SupabaseClient<Database>;
}

export async function rejectAutomationRun(
  input: RejectInput,
): Promise<ResolveApprovalResult> {
  const supabase = input.client ?? (await createClient());
  const rpc = await supabase.rpc("reject_automation_run_pending_approval", {
    target_run_id: input.runId,
    target_organization_id: input.organizationId,
    target_approver_user_id: input.approverUserId,
    target_comment: input.comment ?? null,
  });
  if (rpc.error) {
    return { status: "ERROR", reason: `reject_automation_run_pending_approval: ${rpc.error.message}` };
  }
  if (rpc.data !== true) {
    return { status: "NOT_ELIGIBLE", runId: input.runId, reason: "already_resolved_or_not_waiting" };
  }
  return { status: "RESOLVED", runId: input.runId, decision: "REJECTED" };
}
