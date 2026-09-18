import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

interface Deps {
  client?: SupabaseClient<Database>;
}

interface RpcResponse {
  data: unknown;
  error: { message: string } | null;
}

interface UntypedRpcClient {
  rpc(name: string, args?: Record<string, unknown>): Promise<RpcResponse>;
}

function rpcClient(client: SupabaseClient<Database>): UntypedRpcClient {
  return client as unknown as UntypedRpcClient;
}

async function callRpc(
  name: string,
  args: Record<string, unknown>,
  deps: Deps,
): Promise<RpcResponse> {
  const client = deps.client ?? (await createClient());
  return rpcClient(client).rpc(name, args);
}

export type BooleanActionResult =
  | { status: "APPLIED" }
  | { status: "NOT_ELIGIBLE" }
  | { status: "ERROR"; reason: string };

async function booleanRpc(
  name: string,
  args: Record<string, unknown>,
  deps: Deps,
): Promise<BooleanActionResult> {
  const { data, error } = await callRpc(name, args, deps);
  if (error) return { status: "ERROR", reason: `${name}: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

export async function submitProposalForReview(
  organizationId: string,
  quoteId: string,
  deps: Deps = {},
): Promise<BooleanActionResult> {
  return booleanRpc("submit_proposal_for_review", {
    target_organization_id: organizationId,
    target_quote_id: quoteId,
  }, deps);
}

export async function beginProposalReview(
  organizationId: string,
  quoteId: string,
  deps: Deps = {},
): Promise<BooleanActionResult> {
  return booleanRpc("begin_proposal_review", {
    target_organization_id: organizationId,
    target_quote_id: quoteId,
  }, deps);
}

export async function requestProposalChanges(
  organizationId: string,
  quoteId: string,
  note: string,
  deps: Deps = {},
): Promise<BooleanActionResult> {
  return booleanRpc("request_proposal_changes", {
    target_organization_id: organizationId,
    target_quote_id: quoteId,
    target_note: note,
  }, deps);
}

export async function returnProposalToDraft(
  organizationId: string,
  quoteId: string,
  deps: Deps = {},
): Promise<BooleanActionResult> {
  return booleanRpc("return_proposal_to_draft", {
    target_organization_id: organizationId,
    target_quote_id: quoteId,
  }, deps);
}

export async function rejectProposal(
  organizationId: string,
  quoteId: string,
  note: string,
  deps: Deps = {},
): Promise<BooleanActionResult> {
  return booleanRpc("reject_proposal", {
    target_organization_id: organizationId,
    target_quote_id: quoteId,
    target_note: note,
  }, deps);
}

export async function setProposalVariantPresentation(
  organizationId: string,
  quoteId: string,
  order: number,
  recommended: boolean,
  deps: Deps = {},
): Promise<BooleanActionResult> {
  return booleanRpc("set_proposal_variant_presentation", {
    target_organization_id: organizationId,
    target_quote_id: quoteId,
    target_order: order,
    target_recommended: recommended,
  }, deps);
}

export type CountActionResult =
  | { status: "APPLIED"; count: number }
  | { status: "ERROR"; reason: string };

async function countRpc(
  name: string,
  args: Record<string, unknown>,
  deps: Deps,
): Promise<CountActionResult> {
  const { data, error } = await callRpc(name, args, deps);
  if (error) return { status: "ERROR", reason: `${name}: ${error.message}` };
  if (typeof data !== "number" || !Number.isInteger(data) || data < 0) {
    return { status: "ERROR", reason: `${name}: malformed count` };
  }
  return { status: "APPLIED", count: data };
}

export async function submitProposalBundle(
  organizationId: string,
  opportunityId: string,
  deps: Deps = {},
): Promise<CountActionResult> {
  return countRpc("submit_opportunity_proposal_bundle", {
    target_organization_id: organizationId,
    target_opportunity_id: opportunityId,
  }, deps);
}

export async function beginProposalBundleReview(
  organizationId: string,
  opportunityId: string,
  deps: Deps = {},
): Promise<CountActionResult> {
  return countRpc("begin_opportunity_proposal_bundle_review", {
    target_organization_id: organizationId,
    target_opportunity_id: opportunityId,
  }, deps);
}

export type IdActionResult =
  | { status: "APPLIED"; id: string }
  | { status: "NOT_ELIGIBLE" }
  | { status: "ERROR"; reason: string };

async function idRpc(
  name: string,
  args: Record<string, unknown>,
  deps: Deps,
): Promise<IdActionResult> {
  const { data, error } = await callRpc(name, args, deps);
  if (error) return { status: "ERROR", reason: `${name}: ${error.message}` };
  if (data === null) return { status: "NOT_ELIGIBLE" };
  if (typeof data !== "string" || data.length === 0) {
    return { status: "ERROR", reason: `${name}: malformed id` };
  }
  return { status: "APPLIED", id: data };
}

export async function approveProposal(
  organizationId: string,
  quoteId: string,
  deps: Deps = {},
): Promise<IdActionResult> {
  return idRpc("approve_proposal", {
    target_organization_id: organizationId,
    target_quote_id: quoteId,
  }, deps);
}

export async function markProposalReadyToSend(
  organizationId: string,
  quoteId: string,
  deps: Deps = {},
): Promise<BooleanActionResult> {
  return booleanRpc("mark_proposal_ready_to_send", {
    target_organization_id: organizationId,
    target_quote_id: quoteId,
  }, deps);
}

export async function reopenProposalForEditing(
  organizationId: string,
  quoteId: string,
  reason: string,
  deps: Deps = {},
): Promise<BooleanActionResult> {
  return booleanRpc("reopen_proposal_for_editing", {
    target_organization_id: organizationId,
    target_quote_id: quoteId,
    target_reason: reason,
  }, deps);
}

export async function requestProposalSend(
  organizationId: string,
  quoteId: string,
  deps: Deps = {},
): Promise<IdActionResult> {
  return idRpc("request_proposal_send", {
    target_organization_id: organizationId,
    target_quote_id: quoteId,
  }, deps);
}

export async function retryFailedProposalSend(
  organizationId: string,
  quoteId: string,
  deps: Deps = {},
): Promise<BooleanActionResult> {
  return booleanRpc("retry_failed_proposal_send", {
    target_organization_id: organizationId,
    target_quote_id: quoteId,
  }, deps);
}
