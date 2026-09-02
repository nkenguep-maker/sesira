import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

/**
 * C15 — controlled V1 production operations.
 *
 * These helpers wrap the five RPCs added by migration
 * `20260909000000_operations_surface.sql`. Each helper:
 *
 *   * Runs under the authenticated tenant client (the operator's
 *     session). RLS + `is_organization_member` on both caller and
 *     `operator_user_id` are re-enforced by the RPC — the lib layer
 *     does not gate the call itself; it only surfaces a typed
 *     result.
 *   * Returns a discriminated union so a server action / route
 *     handler can pick the response shape without try/catch. The
 *     `NOT_ELIGIBLE` variant covers the "atomic CAS matched zero
 *     rows" case (already resolved, not paused, not classified,
 *     etc.).
 *   * Never triggers a provider side effect. Resuming automation
 *     only clears the pause; the follow-up scheduler picks it up
 *     on its next tick. Retry re-arms the run; a worker executes.
 */

export type OpsActionResult =
  | { status: "APPLIED" }
  | { status: "NOT_ELIGIBLE" }
  | { status: "ERROR"; reason: string };

interface OpsDeps {
  client?: SupabaseClient<Database>;
}

async function callBooleanRpc<TArgs extends Record<string, unknown>>(
  rpcName: string,
  args: TArgs,
  deps: OpsDeps,
): Promise<OpsActionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc(rpcName as never, args as never);
  if (error) return { status: "ERROR", reason: `${rpcName}: ${error.message}` };
  if (data === true) return { status: "APPLIED" };
  return { status: "NOT_ELIGIBLE" };
}

export interface ResolveAttentionInput {
  organizationId: string;
  attentionItemId: string;
  operatorUserId: string;
  note?: string | null;
}

export function resolveAttentionItem(input: ResolveAttentionInput, deps: OpsDeps = {}) {
  return callBooleanRpc("resolve_attention_item", {
    target_organization_id: input.organizationId,
    target_item_id: input.attentionItemId,
    target_operator_user_id: input.operatorUserId,
    target_note: input.note ?? null,
  }, deps);
}

export function dismissAttentionItem(input: ResolveAttentionInput, deps: OpsDeps = {}) {
  return callBooleanRpc("dismiss_attention_item", {
    target_organization_id: input.organizationId,
    target_item_id: input.attentionItemId,
    target_operator_user_id: input.operatorUserId,
    target_note: input.note ?? null,
  }, deps);
}

export interface ReclassifyMessageInput {
  organizationId: string;
  messageId: string;
  operatorUserId: string;
  reason?: string | null;
}

/**
 * Arm an already-classified inbound message for a fresh
 * classification pass. NULLs out `classified_at` + `intent` +
 * `confidence`. A future scheduler pass (or a manual invocation of
 * `classifyMessageReply`) will re-run the classifier and re-write
 * the denorm.
 */
export function armMessageForReclassification(
  input: ReclassifyMessageInput,
  deps: OpsDeps = {},
) {
  return callBooleanRpc("arm_message_for_reclassification", {
    target_organization_id: input.organizationId,
    target_message_id: input.messageId,
    target_operator_user_id: input.operatorUserId,
    target_reason: input.reason ?? null,
  }, deps);
}

export interface ResumeQuoteInput {
  organizationId: string;
  quoteId: string;
  operatorUserId: string;
  note?: string | null;
}

export function resumeQuoteAutomation(input: ResumeQuoteInput, deps: OpsDeps = {}) {
  return callBooleanRpc("resume_quote_automation", {
    target_organization_id: input.organizationId,
    target_quote_id: input.quoteId,
    target_operator_user_id: input.operatorUserId,
    target_note: input.note ?? null,
  }, deps);
}

export interface RetryFailedRunInput {
  organizationId: string;
  runId: string;
  operatorUserId: string;
  note?: string | null;
}

export function retryFailedRunManual(input: RetryFailedRunInput, deps: OpsDeps = {}) {
  return callBooleanRpc("retry_failed_run_manual", {
    target_organization_id: input.organizationId,
    target_run_id: input.runId,
    target_operator_user_id: input.operatorUserId,
    target_note: input.note ?? null,
  }, deps);
}
