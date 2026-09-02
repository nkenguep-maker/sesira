import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

/**
 * C19 — value-policy resolver. Wraps the SECURITY DEFINER RPC
 * `resolve_value_policy`. The resolver is DETERMINISTIC and pure —
 * given the same (org, appliesTo, amount, currency) it always
 * returns the same policy.
 *
 * When no policy matches, the caller falls back to the org default
 * (typically OBSERVATION or SHADOW). This function returns
 * `{ status: "NO_POLICY" }` in that case rather than throwing.
 */

export type WorkflowMode = "OBSERVATION" | "SHADOW" | "APPROVAL" | "AUTOMATIC" | "HUMAN_FIRST";

export const WORKFLOW_MODES: readonly WorkflowMode[] = [
  "OBSERVATION",
  "SHADOW",
  "APPROVAL",
  "AUTOMATIC",
  "HUMAN_FIRST",
] as const;

export function isWorkflowMode(value: string): value is WorkflowMode {
  return (WORKFLOW_MODES as readonly string[]).includes(value);
}

export function isSensitiveWorkflowMode(mode: WorkflowMode): boolean {
  return mode === "APPROVAL" || mode === "HUMAN_FIRST";
}

export interface ResolveValuePolicyInput {
  organizationId: string;
  appliesTo: "quote" | "opportunity";
  amount: number;
  currency?: string;
  client?: SupabaseClient<Database>;
}

export type ResolveValuePolicyResult =
  | {
      status: "MATCHED";
      policyId: string;
      requiredWorkflowMode: WorkflowMode;
      reason: string;
    }
  | { status: "NO_POLICY" }
  | { status: "ERROR"; reason: string };

export async function resolveValuePolicy(
  input: ResolveValuePolicyInput,
): Promise<ResolveValuePolicyResult> {
  const supabase = input.client ?? (await createClient());
  const { data, error } = await supabase.rpc("resolve_value_policy", {
    target_organization_id: input.organizationId,
    target_applies_to: input.appliesTo,
    target_amount: input.amount,
    target_currency: input.currency ?? "EUR",
  });
  if (error) return { status: "ERROR", reason: `resolve_value_policy: ${error.message}` };
  const row = Array.isArray(data) ? data[0] : (data as {
    policy_id?: unknown;
    required_workflow_mode?: unknown;
    reason?: unknown;
  } | null);
  if (!row || typeof row.policy_id !== "string") {
    return { status: "NO_POLICY" };
  }
  const mode = row.required_workflow_mode;
  if (typeof mode !== "string" || !isWorkflowMode(mode)) {
    return { status: "ERROR", reason: `resolve_value_policy returned unknown mode: ${String(mode)}` };
  }
  return {
    status: "MATCHED",
    policyId: row.policy_id,
    requiredWorkflowMode: mode,
    reason: typeof row.reason === "string" ? row.reason : "",
  };
}
