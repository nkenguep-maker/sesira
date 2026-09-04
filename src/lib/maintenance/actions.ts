import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

/**
 * C29 — maintenance-contract server helpers. Five SECURITY DEFINER
 * RPCs wrapped as discriminated unions (same shape as C25-C28).
 *
 * AI is NEVER called from this seam — renewal pricing, contract
 * terms, cancellation decisions are always human. AI may only
 * draft renewal wording in a separate boundary (out of scope).
 */

interface Deps { client?: SupabaseClient<Database>; }

export type MaintenanceActionResult =
  | { status: "APPLIED" } | { status: "NOT_ELIGIBLE" } | { status: "ERROR"; reason: string };

export interface ActivateMaintenanceContractInput {
  organizationId: string;
  contractId: string;
  startDate: string; // ISO date (YYYY-MM-DD)
  endDate?: string | null;
  cadenceDays: number;
  amount?: number | null;
  currency?: string | null;
  externalRef?: string | null;
}

export async function activateMaintenanceContract(
  input: ActivateMaintenanceContractInput,
  deps: Deps = {},
): Promise<MaintenanceActionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("activate_maintenance_contract", {
    target_organization_id: input.organizationId,
    target_contract_id: input.contractId,
    target_start_date: input.startDate,
    target_end_date: input.endDate ?? null,
    target_cadence_days: input.cadenceDays,
    target_amount: input.amount ?? null,
    target_currency: input.currency ?? null,
    target_external_ref: input.externalRef ?? null,
  });
  if (error) return { status: "ERROR", reason: `activate_maintenance_contract: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

export interface RecordMaintenanceVisitInput {
  organizationId: string;
  contractId: string;
  interventionId: string;
  visitedAt: Date;
}

export async function recordMaintenanceVisit(
  input: RecordMaintenanceVisitInput,
  deps: Deps = {},
): Promise<MaintenanceActionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("record_maintenance_visit", {
    target_organization_id: input.organizationId,
    target_contract_id: input.contractId,
    target_intervention_id: input.interventionId,
    target_visited_at: input.visitedAt.toISOString(),
  });
  if (error) return { status: "ERROR", reason: `record_maintenance_visit: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

export interface ScanMaintenanceRenewalsInput {
  organizationId: string;
  daysAhead: number;
}

export interface MaintenanceScanResult {
  contractId: string;
  newStatus: "EXPIRING_SOON" | "EXPIRED";
}

export type ScanMaintenanceRenewalsResult =
  | { status: "APPLIED"; results: MaintenanceScanResult[] }
  | { status: "ERROR"; reason: string };

export async function scanMaintenanceRenewals(
  input: ScanMaintenanceRenewalsInput,
  deps: Deps = {},
): Promise<ScanMaintenanceRenewalsResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("scan_maintenance_renewals", {
    target_organization_id: input.organizationId,
    target_days_ahead: input.daysAhead,
  });
  if (error) return { status: "ERROR", reason: `scan_maintenance_renewals: ${error.message}` };
  const rows = (data ?? []) as Array<{ contract_id: string; new_status: string }>;
  return {
    status: "APPLIED",
    results: rows.map((r) => ({
      contractId: r.contract_id,
      newStatus: r.new_status as "EXPIRING_SOON" | "EXPIRED",
    })),
  };
}

export interface RecordRenewalNoticeInput {
  organizationId: string;
  contractId: string;
  sentByUserId: string;
}

export async function recordRenewalNotice(
  input: RecordRenewalNoticeInput,
  deps: Deps = {},
): Promise<MaintenanceActionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("record_renewal_notice", {
    target_organization_id: input.organizationId,
    target_contract_id: input.contractId,
    target_sent_by_user_id: input.sentByUserId,
  });
  if (error) return { status: "ERROR", reason: `record_renewal_notice: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

export interface CancelMaintenanceContractInput {
  organizationId: string;
  contractId: string;
  reason: string;
}

export async function cancelMaintenanceContract(
  input: CancelMaintenanceContractInput,
  deps: Deps = {},
): Promise<MaintenanceActionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("cancel_maintenance_contract", {
    target_organization_id: input.organizationId,
    target_contract_id: input.contractId,
    target_reason: input.reason,
  });
  if (error) return { status: "ERROR", reason: `cancel_maintenance_contract: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}
