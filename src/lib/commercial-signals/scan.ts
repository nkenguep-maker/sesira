import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

/**
 * Commercial signals scanner — TS surface.
 *
 * The DB migration `20261101000000_commercial_opportunity_signals.sql`
 * declares `scan_commercial_equipment_signals(target_organization_id)`,
 * a SECURITY DEFINER RPC that:
 *
 *   * reuses `compute_next_leak_check_due` (versioned rule engine);
 *   * upserts a signal per (equipment, rule, effective_from, due-bucket)
 *     — idempotent, deterministic dedupe key;
 *   * auto-dismisses active signals whose equipment is no longer in
 *     scope (decommissioned, hermetic-exempt, below thresholds, …);
 *   * NEVER touches CONVERTED / DISMISSED (terminal);
 *   * NEVER creates an opportunity or quote (INV-04).
 *
 * `resume_expired_commercial_signals` flips SNOOZED signals whose
 * `snoozed_until` is past back to DETECTED — safe to call from cron.
 */

interface Deps {
  client?: SupabaseClient<Database>;
}

export interface CommercialSignalScanCounters {
  detectedNew: number;
  updated: number;
  resolvedByScan: number;
}

export type ScanCommercialEquipmentSignalsResult =
  | ({ status: "OK" } & CommercialSignalScanCounters)
  | { status: "ERROR"; reason: string };

/**
 * One tick of the scanner for one organization. Callable from a cron
 * entry point (Vercel cron, Supabase pg_cron, external worker) or from
 * a manual admin action. Idempotent.
 */
export async function scanCommercialEquipmentSignals(
  organizationId: string,
  deps: Deps = {},
): Promise<ScanCommercialEquipmentSignalsResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("scan_commercial_equipment_signals" as never, {
    target_organization_id: organizationId,
  } as never);
  if (error) return { status: "ERROR", reason: `scan_commercial_equipment_signals: ${error.message}` };

  const row = Array.isArray(data) ? data[0] : (data as Record<string, unknown> | null);
  if (!row) {
    return { status: "ERROR", reason: "scan_commercial_equipment_signals returned no row" };
  }
  const rec = row as Record<string, unknown>;
  if (
    typeof rec.detected_new !== "number" ||
    typeof rec.updated !== "number" ||
    typeof rec.resolved_by_scan !== "number"
  ) {
    return { status: "ERROR", reason: "scan_commercial_equipment_signals returned malformed counters" };
  }
  return {
    status: "OK",
    detectedNew: rec.detected_new,
    updated: rec.updated,
    resolvedByScan: rec.resolved_by_scan,
  };
}

export type ResumeExpiredCommercialSignalsResult =
  | { status: "OK"; resumed: number }
  | { status: "ERROR"; reason: string };

/**
 * Flip SNOOZED signals whose snoozed_until has passed back to DETECTED.
 * Safe to call from cron. Idempotent.
 */
export async function resumeExpiredCommercialSignals(
  organizationId: string,
  deps: Deps = {},
): Promise<ResumeExpiredCommercialSignalsResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("resume_expired_commercial_signals" as never, {
    target_organization_id: organizationId,
  } as never);
  if (error) return { status: "ERROR", reason: `resume_expired_commercial_signals: ${error.message}` };
  if (typeof data !== "number") {
    return { status: "ERROR", reason: "resume_expired_commercial_signals did not return a number" };
  }
  return { status: "OK", resumed: data };
}
