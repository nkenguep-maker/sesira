import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createWorkflowAttention } from "@/lib/attention/create";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

/**
 * C12 — stage a claimed automation_run for human approval.
 *
 * A workflow executor (future: an APPROVAL-mode variant of the shadow
 * runner) has:
 *   1. Claimed a PENDING run (via `claimQuoteFollowupRun`).
 *   2. Built a concrete `proposed_action` (subject / body / recipient
 *      / channel) via `proposeQuoteFollowupAction`.
 *   3. Decided the action is DUE.
 *
 * This helper:
 *   * transitions the run RUNNING -> WAITING_FOR_APPROVAL via
 *     public.release_automation_run (which accepts that transition,
 *     preserves the output_summary, and releases the lease so the
 *     dispatcher can re-acquire on approval);
 *   * emits an `APPROVAL_REQUIRED` Attention scoped to
 *     (automation_run_approval, run_id) so a replay collapses onto
 *     the same item.
 *
 * The helper NEVER touches a provider. It is a decision-only
 * boundary — sending happens in `dispatchApprovedFollowup` after a
 * human approves.
 */

export interface StageForApprovalInput {
  runId: string;
  organizationId: string;
  workerId: string;
  outputSummary: Record<string, unknown>;
  /** Business context surfaced to the operator in the Attention item. */
  attention: {
    quoteId: string;
    title: string;
    explanation: string;
    suggestedAction?: string | null;
    automationConfigId?: string;
    triggeringEventId?: string;
  };
  /** Escape hatch for tests: inject a preconstructed client. */
  client?: SupabaseClient<Database>;
}

export type StageForApprovalResult =
  | {
      status: "STAGED";
      runId: string;
      attentionId: string;
    }
  | { status: "LEASE_LOST"; runId: string }
  | { status: "ERROR"; reason: string };

export async function stageAutomationRunForApproval(
  input: StageForApprovalInput,
): Promise<StageForApprovalResult> {
  const supabase = input.client ?? (await createClient());

  const releaseRpc = await supabase.rpc("release_automation_run", {
    target_run_id: input.runId,
    target_organization_id: input.organizationId,
    target_worker_id: input.workerId,
    terminal_status: "WAITING_FOR_APPROVAL",
    error_message: null,
    next_attempt_at: null,
    target_output_summary: input.outputSummary as never,
  });
  if (releaseRpc.error) {
    return { status: "ERROR", reason: `release_automation_run: ${releaseRpc.error.message}` };
  }
  if (releaseRpc.data !== true) {
    return { status: "LEASE_LOST", runId: input.runId };
  }

  const attention = await createWorkflowAttention({
    organizationId: input.organizationId,
    reason: "APPROVAL_REQUIRED",
    sourceKind: "automation_run_approval",
    sourceId: input.runId,
    title: input.attention.title,
    explanation: input.attention.explanation,
    suggestedAction: input.attention.suggestedAction ?? null,
    entity: { type: "quote", id: input.attention.quoteId },
    metadata: {
      automation_run_id: input.runId,
      output_summary: input.outputSummary,
    },
    provenance: {
      automationRunId: input.runId,
      automationConfigId: input.attention.automationConfigId,
      triggeringEventId: input.attention.triggeringEventId,
    },
    client: supabase,
  });

  return { status: "STAGED", runId: input.runId, attentionId: attention.id };
}
