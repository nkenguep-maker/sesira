import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/database";

/**
 * C48 — Contract renewals server helpers.
 */

interface Deps { client?: SupabaseClient<Database>; }

export type RenewalStatus =
  | "DRAFT" | "REVIEW_REQUIRED" | "APPROVED" | "READY_TO_SEND" | "SENT"
  | "CLIENT_ACCEPTED" | "CANCELLATION_WINDOW" | "EFFECTIVE"
  | "DECLINED" | "CANCELLED" | "NEEDS_ATTENTION";

export type ClientResponseSource = "MANUAL" | "EMAIL" | "SIGNED_DOCUMENT";

export type ApplyResult =
  | { status: "APPLIED"; id: string }
  | { status: "ERROR"; reason: string };

export type TransitionResult =
  | { status: "APPLIED" } | { status: "NOT_ELIGIBLE" } | { status: "ERROR"; reason: string };

export interface OpenRenewalCaseInput {
  organizationId: string;
  contractId: string;
  cancellationDeadline?: Date | null;
}

export async function openRenewalCase(
  input: OpenRenewalCaseInput,
  deps: Deps = {},
): Promise<ApplyResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("open_renewal_case", {
    target_organization_id: input.organizationId,
    target_contract_id: input.contractId,
    target_cancellation_deadline: input.cancellationDeadline?.toISOString() ?? null,
  });
  if (error) return { status: "ERROR", reason: `open_renewal_case: ${error.message}` };
  return { status: "APPLIED", id: data as string };
}

export interface ProposeRenewalAmountInput {
  organizationId: string;
  caseId: string;
  amount: number;
  currency: string;
  formulaSnapshot: Json;
}

export async function proposeRenewalAmount(
  input: ProposeRenewalAmountInput,
  deps: Deps = {},
): Promise<TransitionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("propose_renewal_amount", {
    target_organization_id: input.organizationId,
    target_case_id: input.caseId,
    target_amount: input.amount,
    target_currency: input.currency,
    target_formula_snapshot: input.formulaSnapshot,
  });
  if (error) return { status: "ERROR", reason: `propose_renewal_amount: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

export async function approveRenewalCase(
  organizationId: string, caseId: string, approverUserId: string, deps: Deps = {},
): Promise<TransitionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("approve_renewal_case", {
    target_organization_id: organizationId,
    target_case_id: caseId,
    target_approver_user_id: approverUserId,
  });
  if (error) return { status: "ERROR", reason: `approve_renewal_case: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

export async function sendRenewalProposal(
  organizationId: string, caseId: string, sentEvidenceId: string, sentAt: Date, deps: Deps = {},
): Promise<TransitionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("send_renewal_proposal", {
    target_organization_id: organizationId,
    target_case_id: caseId,
    target_sent_evidence_id: sentEvidenceId,
    target_sent_at: sentAt.toISOString(),
  });
  if (error) return { status: "ERROR", reason: `send_renewal_proposal: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

export interface RecordClientResponseInput {
  organizationId: string;
  caseId: string;
  response: "ACCEPTED" | "DECLINED";
  source: ClientResponseSource;
  at: Date;
}

export async function recordClientResponse(
  input: RecordClientResponseInput,
  deps: Deps = {},
): Promise<TransitionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("record_client_response", {
    target_organization_id: input.organizationId,
    target_case_id: input.caseId,
    target_response: input.response,
    target_source: input.source,
    target_at: input.at.toISOString(),
  });
  if (error) return { status: "ERROR", reason: `record_client_response: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

export async function markRenewalEffective(
  organizationId: string, caseId: string, effectiveAt: Date, deps: Deps = {},
): Promise<TransitionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("mark_renewal_effective", {
    target_organization_id: organizationId,
    target_case_id: caseId,
    target_effective_at: effectiveAt.toISOString(),
  });
  if (error) return { status: "ERROR", reason: `mark_renewal_effective: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

export async function cancelRenewalCase(
  organizationId: string, caseId: string, reason: string, deps: Deps = {},
): Promise<TransitionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("cancel_renewal_case", {
    target_organization_id: organizationId,
    target_case_id: caseId,
    target_reason: reason,
  });
  if (error) return { status: "ERROR", reason: `cancel_renewal_case: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}
