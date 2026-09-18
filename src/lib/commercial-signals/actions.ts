import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  ConvertSignalToProposalInput,
  DismissSignalInput,
  MarkSignalPlannedInput,
  MarkSignalReviewedInput,
  SnoozeSignalInput,
} from "@/lib/commercial-signals/schema";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

/**
 * Commercial-signal verbs. Each wraps a SECURITY DEFINER RPC that
 * re-enforces ACTIVE membership and the state machine on the server
 * side.
 *
 * INV-04: `convertCommercialSignalToProposal` is the ONLY path from a
 * signal to a real opportunity/quote. It is never invoked by cron.
 */

interface Deps {
  client?: SupabaseClient<Database>;
}

export type SignalActionResult =
  | { status: "APPLIED" }
  | { status: "NOT_ELIGIBLE" }
  | { status: "ERROR"; reason: string };

async function callBooleanRpc(
  supabase: SupabaseClient<Database>,
  name: string,
  args: Record<string, unknown>,
): Promise<SignalActionResult> {
  const { data, error } = await supabase.rpc(name as never, args as never);
  if (error) return { status: "ERROR", reason: `${name}: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

export async function markCommercialSignalReviewed(
  input: MarkSignalReviewedInput,
  deps: Deps = {},
): Promise<SignalActionResult> {
  const supabase = deps.client ?? (await createClient());
  return callBooleanRpc(supabase, "mark_commercial_signal_reviewed", {
    target_organization_id: input.organizationId,
    target_signal_id: input.signalId,
  });
}

export async function markCommercialSignalPlanned(
  input: MarkSignalPlannedInput,
  deps: Deps = {},
): Promise<SignalActionResult> {
  const supabase = deps.client ?? (await createClient());
  return callBooleanRpc(supabase, "mark_commercial_signal_planned", {
    target_organization_id: input.organizationId,
    target_signal_id: input.signalId,
    target_note: input.note ?? null,
  });
}

export async function snoozeCommercialSignal(
  input: SnoozeSignalInput,
  deps: Deps = {},
): Promise<SignalActionResult> {
  const supabase = deps.client ?? (await createClient());
  return callBooleanRpc(supabase, "snooze_commercial_signal", {
    target_organization_id: input.organizationId,
    target_signal_id: input.signalId,
    target_until: input.snoozedUntil,
    target_reason: input.reason ?? null,
  });
}

export async function dismissCommercialSignal(
  input: DismissSignalInput,
  deps: Deps = {},
): Promise<SignalActionResult> {
  const supabase = deps.client ?? (await createClient());
  return callBooleanRpc(supabase, "dismiss_commercial_signal", {
    target_organization_id: input.organizationId,
    target_signal_id: input.signalId,
    target_reason: input.reason,
  });
}

export type ConvertSignalToProposalResult =
  | {
      status: "OK";
      opportunityId: string;
      quoteId: string;
      signalId: string;
      catalogApplied: boolean;
    }
  | { status: "NOT_ELIGIBLE" }
  | { status: "ERROR"; reason: string };

/**
 * Human-only conversion: turn a signal (DETECTED / REVIEWED / PLANNED)
 * into a first-quote DRAFT under a new opportunity. Delegates to
 * `convert_commercial_signal_to_proposal` in the DB, which:
 *
 *   * locks the signal FOR UPDATE (no double-conversion race);
 *   * calls `create_opportunity_with_quote` under the hood;
 *   * leaves catalog application disabled until C51 publishes the
 *     production catalog contract;
 *   * flips the signal to CONVERTED with provenance;
 *   * writes an audit event.
 *
 * An empty result set = NOT_ELIGIBLE (signal already CONVERTED /
 * DISMISSED / SNOOZED, or another concurrent caller won the race).
 */
export async function convertCommercialSignalToProposal(
  input: ConvertSignalToProposalInput,
  deps: Deps = {},
): Promise<ConvertSignalToProposalResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc(
    "convert_commercial_signal_to_proposal" as never,
    {
      target_organization_id: input.organizationId,
      target_signal_id: input.signalId,
      target_quote_title: input.quoteTitle,
      target_variant_key: input.variantKey ?? "default",
      target_estimated_value: input.estimatedValue ?? null,
      target_currency: input.currency ?? "EUR",
      target_owner_user_id: input.ownerUserId ?? null,
      target_override_customer_id: input.overrideCustomerId ?? null,
      target_catalog_item_id: null,
    } as never,
  );
  if (error) {
    return { status: "ERROR", reason: `convert_commercial_signal_to_proposal: ${error.message}` };
  }

  const rows = Array.isArray(data) ? data : data ? [data] : [];
  if (rows.length === 0) return { status: "NOT_ELIGIBLE" };

  const row = rows[0] as {
    opportunity_id?: unknown;
    quote_id?: unknown;
    signal_id?: unknown;
    catalog_applied?: unknown;
  };
  if (
    typeof row.opportunity_id !== "string" ||
    typeof row.quote_id !== "string" ||
    typeof row.signal_id !== "string" ||
    typeof row.catalog_applied !== "boolean"
  ) {
    return { status: "ERROR", reason: "convert_commercial_signal_to_proposal returned malformed row" };
  }

  return {
    status: "OK",
    opportunityId: row.opportunity_id,
    quoteId: row.quote_id,
    signalId: row.signal_id,
    catalogApplied: row.catalog_applied,
  };
}
