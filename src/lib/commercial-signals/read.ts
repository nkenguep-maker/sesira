import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  isCommercialSignalKind,
  isCommercialSignalSeverity,
  isCommercialSignalStatus,
  type CommercialSignalFact,
  type CommercialSignalRuleSnapshot,
  type OpenCommercialSignalRow,
} from "@/lib/commercial-signals/schema";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

/**
 * Read helpers. All return empty shapes on error so callers can render a
 * safe fallback ("aucun signal" / "…"). Never throws.
 */

interface Deps {
  client?: SupabaseClient<Database>;
}

function coerceFacts(raw: unknown): CommercialSignalFact[] {
  if (!Array.isArray(raw)) return [];
  const out: CommercialSignalFact[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const rec = entry as { label?: unknown; value?: unknown };
    if (typeof rec.label === "string" && typeof rec.value === "string") {
      out.push({ label: rec.label, value: rec.value });
    }
  }
  return out;
}

function coerceRuleSnapshot(raw: unknown): CommercialSignalRuleSnapshot {
  const empty: CommercialSignalRuleSnapshot = {
    matched_rule_id: null,
    matched_rule_code: null,
    rule_source_ref: null,
    rule_effective_from: null,
    cadence_days: null,
    tco2eq: null,
    gwp_value_id: null,
    next_due_at: null,
    detector_doubled: null,
    at_date: null,
  };
  if (!raw || typeof raw !== "object") return empty;
  const rec = raw as Record<string, unknown>;
  return {
    ...empty,
    ...rec,
    matched_rule_id: typeof rec.matched_rule_id === "string" ? rec.matched_rule_id : null,
    matched_rule_code: typeof rec.matched_rule_code === "string" ? rec.matched_rule_code : null,
    rule_source_ref: typeof rec.rule_source_ref === "string" ? rec.rule_source_ref : null,
    rule_effective_from:
      typeof rec.rule_effective_from === "string" ? rec.rule_effective_from : null,
    cadence_days: typeof rec.cadence_days === "number" ? rec.cadence_days : null,
    tco2eq: typeof rec.tco2eq === "number" ? rec.tco2eq : null,
    gwp_value_id: typeof rec.gwp_value_id === "string" ? rec.gwp_value_id : null,
    next_due_at: typeof rec.next_due_at === "string" ? rec.next_due_at : null,
    detector_doubled: typeof rec.detector_doubled === "boolean" ? rec.detector_doubled : null,
    at_date: typeof rec.at_date === "string" ? rec.at_date : null,
  };
}

/**
 * Ordered view of open commercial signals for an organization.
 * Excludes CONVERTED and DISMISSED. Sort mirrors the DB helper:
 * severity → due_at → detected_at.
 */
export async function getOpenCommercialSignals(
  organizationId: string,
  deps: Deps = {},
): Promise<OpenCommercialSignalRow[]> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("open_commercial_signals" as never, {
    target_organization_id: organizationId,
  } as never);
  if (error) return [];
  const rows = Array.isArray(data) ? data : [];
  const out: OpenCommercialSignalRow[] = [];
  for (const raw of rows) {
    if (!raw || typeof raw !== "object") continue;
    const rec = raw as Record<string, unknown>;
    if (
      typeof rec.signal_id !== "string" ||
      typeof rec.equipment_id !== "string" ||
      typeof rec.signal_kind !== "string" ||
      typeof rec.commercial_status !== "string" ||
      typeof rec.severity !== "string" ||
      typeof rec.title !== "string" ||
      typeof rec.detected_at !== "string"
    ) {
      continue;
    }
    if (!isCommercialSignalKind(rec.signal_kind)) continue;
    if (!isCommercialSignalStatus(rec.commercial_status)) continue;
    if (!isCommercialSignalSeverity(rec.severity)) continue;

    out.push({
      signalId: rec.signal_id,
      customerId: typeof rec.customer_id === "string" ? rec.customer_id : null,
      equipmentId: rec.equipment_id,
      signalKind: rec.signal_kind,
      commercialStatus: rec.commercial_status,
      severity: rec.severity,
      title: rec.title,
      explanation: typeof rec.explanation === "string" ? rec.explanation : null,
      facts: coerceFacts(rec.facts),
      nextActionHint: typeof rec.next_action_hint === "string" ? rec.next_action_hint : null,
      dueAt: typeof rec.due_at === "string" ? rec.due_at : null,
      detectedAt: rec.detected_at,
      snoozedUntil: typeof rec.snoozed_until === "string" ? rec.snoozed_until : null,
      suggestedCatalogItemId:
        typeof rec.suggested_catalog_item_id === "string" ? rec.suggested_catalog_item_id : null,
      ruleSnapshot: coerceRuleSnapshot(rec.rule_snapshot),
    });
  }
  return out;
}

export interface CommercialSignalCountsBySeverity {
  URGENT: number;
  HIGH: number;
  NORMAL: number;
  LOW: number;
  total: number;
}

/**
 * Aggregate open signals by severity. Cheap: re-uses
 * `getOpenCommercialSignals` and counts in-memory. Callers that need
 * paging should call the underlying RPC directly.
 */
export async function getCommercialSignalCountsBySeverity(
  organizationId: string,
  deps: Deps = {},
): Promise<CommercialSignalCountsBySeverity> {
  const rows = await getOpenCommercialSignals(organizationId, deps);
  const acc: CommercialSignalCountsBySeverity = {
    URGENT: 0,
    HIGH: 0,
    NORMAL: 0,
    LOW: 0,
    total: 0,
  };
  for (const row of rows) {
    acc[row.severity] += 1;
    acc.total += 1;
  }
  return acc;
}
