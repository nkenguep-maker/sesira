import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { OpportunityState, QuoteOptionStatus } from "@/lib/opportunities/schema";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

/**
 * C18 — opportunity + variant + option server helpers. Each wraps a
 * SECURITY DEFINER RPC that re-enforces ACTIVE membership and the
 * opportunity state machine.
 */

interface Deps {
  client?: SupabaseClient<Database>;
}

export type ActionResult<T> =
  | ({ status: "OK" } & T)
  | { status: "ERROR"; reason: string };

// -----------------------------------------------------------------------
// createOpportunityWithQuote
// -----------------------------------------------------------------------
export interface CreateOpportunityWithQuoteInput {
  organizationId: string;
  customerId: string;
  requestId?: string | null;
  ownerUserId?: string | null;
  estimatedValue?: number | null;
  currency?: string;
  quoteTitle: string;
  variantKey?: string;
  metadata?: Record<string, unknown>;
}

export async function createOpportunityWithQuote(
  input: CreateOpportunityWithQuoteInput,
  deps: Deps = {},
): Promise<ActionResult<{ opportunityId: string; quoteId: string }>> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("create_opportunity_with_quote", {
    target_organization_id: input.organizationId,
    target_customer_id: input.customerId,
    target_request_id: input.requestId ?? null,
    target_owner_user_id: input.ownerUserId ?? null,
    target_estimated_value: input.estimatedValue ?? null,
    target_currency: input.currency ?? "EUR",
    target_quote_title: input.quoteTitle,
    target_variant_key: input.variantKey ?? "default",
    target_metadata: (input.metadata ?? {}) as never,
  });
  if (error) return { status: "ERROR", reason: `create_opportunity_with_quote: ${error.message}` };
  const row = Array.isArray(data) ? data[0] : (data as { opportunity_id?: unknown; quote_id?: unknown } | null);
  if (!row || typeof row.opportunity_id !== "string" || typeof row.quote_id !== "string") {
    return { status: "ERROR", reason: "create_opportunity_with_quote returned malformed row" };
  }
  return { status: "OK", opportunityId: row.opportunity_id, quoteId: row.quote_id };
}

// -----------------------------------------------------------------------
// addQuoteVariantToOpportunity
// -----------------------------------------------------------------------
export interface AddQuoteVariantInput {
  organizationId: string;
  opportunityId: string;
  variantKey: string;
  quoteTitle: string;
  amount?: number | null;
  currency?: string;
}

export async function addQuoteVariantToOpportunity(
  input: AddQuoteVariantInput,
  deps: Deps = {},
): Promise<ActionResult<{ quoteId: string }>> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("add_quote_variant_to_opportunity", {
    target_organization_id: input.organizationId,
    target_opportunity_id: input.opportunityId,
    target_variant_key: input.variantKey,
    target_quote_title: input.quoteTitle,
    target_amount: input.amount ?? null,
    target_currency: input.currency ?? "EUR",
  });
  if (error) return { status: "ERROR", reason: `add_quote_variant_to_opportunity: ${error.message}` };
  if (typeof data !== "string") return { status: "ERROR", reason: "add_quote_variant_to_opportunity did not return an id" };
  return { status: "OK", quoteId: data };
}

// -----------------------------------------------------------------------
// createQuoteRevision
// -----------------------------------------------------------------------
export interface CreateQuoteRevisionInput {
  organizationId: string;
  previousQuoteId: string;
  quoteTitle: string;
  amount?: number | null;
  currency?: string;
}

export async function createQuoteRevision(
  input: CreateQuoteRevisionInput,
  deps: Deps = {},
): Promise<ActionResult<{ quoteId: string }>> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("create_quote_revision", {
    target_organization_id: input.organizationId,
    target_previous_quote_id: input.previousQuoteId,
    target_quote_title: input.quoteTitle,
    target_amount: input.amount ?? null,
    target_currency: input.currency ?? "EUR",
  });
  if (error) return { status: "ERROR", reason: `create_quote_revision: ${error.message}` };
  if (typeof data !== "string") return { status: "ERROR", reason: "create_quote_revision did not return an id" };
  return { status: "OK", quoteId: data };
}

// -----------------------------------------------------------------------
// selectQuoteOption
// -----------------------------------------------------------------------
export interface SelectQuoteOptionInput {
  organizationId: string;
  optionId: string;
  newStatus: QuoteOptionStatus;
}

export async function selectQuoteOption(
  input: SelectQuoteOptionInput,
  deps: Deps = {},
): Promise<{ status: "APPLIED" } | { status: "NOT_ELIGIBLE" } | { status: "ERROR"; reason: string }> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("select_quote_option", {
    target_organization_id: input.organizationId,
    target_option_id: input.optionId,
    target_new_status: input.newStatus,
  });
  if (error) return { status: "ERROR", reason: `select_quote_option: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

// -----------------------------------------------------------------------
// transitionOpportunityState
// -----------------------------------------------------------------------
export interface TransitionOpportunityStateInput {
  organizationId: string;
  opportunityId: string;
  newState: OpportunityState;
  closedReason?: string | null;
}

export async function transitionOpportunityState(
  input: TransitionOpportunityStateInput,
  deps: Deps = {},
): Promise<{ status: "APPLIED" } | { status: "NOT_ELIGIBLE" } | { status: "ERROR"; reason: string }> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("transition_opportunity_state", {
    target_organization_id: input.organizationId,
    target_opportunity_id: input.opportunityId,
    target_new_state: input.newState,
    target_closed_reason: input.closedReason ?? null,
  });
  if (error) return { status: "ERROR", reason: `transition_opportunity_state: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}
