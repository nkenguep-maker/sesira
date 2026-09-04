import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/database";

/**
 * C33.2 — equipment + regulatory attentions helpers.
 *
 * REGULATORY.md doctrine:
 *   INV-01: never render "conforme" — surfaces "next check due" /
 *           "attestation expiring" / "missing data" only.
 *   INV-02: mark_regulatory_attention_seen stamps seen_at exactly
 *           ONCE; the immutability trigger rejects further changes.
 *   INV-03: every emit persists the reference row id + snapshot in
 *           rule_snapshot so future revisions never rewrite history.
 *   Section 1.2: double-threshold rule (tCO₂eq OR kg) is applied
 *           in the compute_next_leak_check_due RPC — do NOT
 *           reimplement it here.
 */

interface Deps { client?: SupabaseClient<Database>; }

export type RegulatoryEmitResult =
  | { status: "APPLIED"; attentionId: string }
  | { status: "OUT_OF_SCOPE" } // no obligation at this date (below thresholds, hermetic, mobile-not-yet)
  | { status: "ERROR"; reason: string };

export type RegulatoryActionResult =
  | { status: "APPLIED" } | { status: "NOT_ELIGIBLE" } | { status: "ERROR"; reason: string };

// -------- Compute helpers --------

export interface ComputeInput {
  organizationId: string;
  equipmentId: string;
  at?: string | null;
}

export interface EquipmentTco2eqResult {
  tco2eq: number;
  fluidCode: string;
  chargeKg: number;
  gwpValueId: string;
  gwp100y: number;
  ipccAssessment: string;
  gwpSourceRef: string;
  atDate: string;
}

export type ComputeTco2eqResult =
  | { status: "APPLIED"; result: EquipmentTco2eqResult }
  | { status: "ERROR"; reason: string };

export async function computeEquipmentTco2eq(
  input: ComputeInput,
  deps: Deps = {},
): Promise<ComputeTco2eqResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("compute_equipment_tco2eq", {
    target_organization_id: input.organizationId,
    target_equipment_id: input.equipmentId,
    target_at: input.at ?? null,
  });
  if (error) return { status: "ERROR", reason: `compute_equipment_tco2eq: ${error.message}` };
  const rows = (data ?? []) as Array<{
    tco2eq: number; fluid_code: string; charge_kg: number;
    gwp_value_id: string; gwp_100y: number; ipcc_assessment: string;
    gwp_source_ref: string; at_date: string;
  }>;
  if (rows.length === 0) return { status: "ERROR", reason: "compute_equipment_tco2eq: no rows returned" };
  const r = rows[0];
  return {
    status: "APPLIED",
    result: {
      tco2eq: Number(r.tco2eq),
      fluidCode: r.fluid_code,
      chargeKg: Number(r.charge_kg),
      gwpValueId: r.gwp_value_id,
      gwp100y: Number(r.gwp_100y),
      ipccAssessment: r.ipcc_assessment,
      gwpSourceRef: r.gwp_source_ref,
      atDate: r.at_date,
    },
  };
}

export interface NextLeakCheckResult {
  nextDueAt: string;
  cadenceDays: number;
  matchedRuleId: string;
  matchedRuleCode: string;
  ruleSourceRef: string;
  hermeticExempt: boolean;
  mobileNotYetApplies: boolean;
  detectorDoubled: boolean;
  tco2eqSnapshot: number;
  gwpValueIdSnapshot: string;
  atDate: string;
}

export type NextLeakCheckDueResult =
  | { status: "APPLIED"; result: NextLeakCheckResult }
  | { status: "OUT_OF_SCOPE" }
  | { status: "ERROR"; reason: string };

export async function computeNextLeakCheckDue(
  input: ComputeInput,
  deps: Deps = {},
): Promise<NextLeakCheckDueResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("compute_next_leak_check_due", {
    target_organization_id: input.organizationId,
    target_equipment_id: input.equipmentId,
    target_at: input.at ?? null,
  });
  if (error) return { status: "ERROR", reason: `compute_next_leak_check_due: ${error.message}` };
  const rows = (data ?? []) as Array<{
    next_due_at: string; cadence_days: number;
    matched_rule_id: string; matched_rule_code: string; rule_source_ref: string;
    hermetic_exempt: boolean; mobile_not_yet_applies: boolean; detector_doubled: boolean;
    tco2eq_snapshot: number; gwp_value_id_snapshot: string; at_date: string;
  }>;
  if (rows.length === 0) return { status: "OUT_OF_SCOPE" };
  const r = rows[0];
  return {
    status: "APPLIED",
    result: {
      nextDueAt: r.next_due_at,
      cadenceDays: r.cadence_days,
      matchedRuleId: r.matched_rule_id,
      matchedRuleCode: r.matched_rule_code,
      ruleSourceRef: r.rule_source_ref,
      hermeticExempt: r.hermetic_exempt,
      mobileNotYetApplies: r.mobile_not_yet_applies,
      detectorDoubled: r.detector_doubled,
      tco2eqSnapshot: Number(r.tco2eq_snapshot),
      gwpValueIdSnapshot: r.gwp_value_id_snapshot,
      atDate: r.at_date,
    },
  };
}

// -------- Emit RPCs --------

export interface EmitLeakCheckAttentionInput {
  organizationId: string;
  equipmentId: string;
}

export async function emitRegulatoryLeakCheckAttention(
  input: EmitLeakCheckAttentionInput,
  deps: Deps = {},
): Promise<RegulatoryEmitResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("emit_regulatory_leak_check_attention", {
    target_organization_id: input.organizationId,
    target_equipment_id: input.equipmentId,
  });
  if (error) return { status: "ERROR", reason: `emit_regulatory_leak_check_attention: ${error.message}` };
  if (data === null) return { status: "OUT_OF_SCOPE" };
  return { status: "APPLIED", attentionId: data as string };
}

export interface EmitAttestationExpiryInput {
  organizationId: string;
  attestationId: string;
  daysBefore: number;
}

export async function emitRegulatoryAttestationExpiryAttention(
  input: EmitAttestationExpiryInput,
  deps: Deps = {},
): Promise<RegulatoryEmitResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("emit_regulatory_attestation_expiry_attention", {
    target_organization_id: input.organizationId,
    target_attestation_id: input.attestationId,
    target_days_before: input.daysBefore,
  });
  if (error) return { status: "ERROR", reason: `emit_regulatory_attestation_expiry_attention: ${error.message}` };
  if (data === null) return { status: "OUT_OF_SCOPE" };
  return { status: "APPLIED", attentionId: data as string };
}

// -------- Human actions on attentions --------

export interface MarkRegulatoryAttentionSeenInput {
  organizationId: string;
  attentionId: string;
  seenByUserId: string;
}

export async function markRegulatoryAttentionSeen(
  input: MarkRegulatoryAttentionSeenInput,
  deps: Deps = {},
): Promise<RegulatoryActionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("mark_regulatory_attention_seen", {
    target_organization_id: input.organizationId,
    target_attention_id: input.attentionId,
    target_seen_by_user_id: input.seenByUserId,
  });
  if (error) return { status: "ERROR", reason: `mark_regulatory_attention_seen: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

export interface ResolveRegulatoryAttentionInput {
  organizationId: string;
  attentionId: string;
  resolvedByUserId: string;
  note?: string | null;
}

export async function resolveRegulatoryAttention(
  input: ResolveRegulatoryAttentionInput,
  deps: Deps = {},
): Promise<RegulatoryActionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("resolve_regulatory_attention", {
    target_organization_id: input.organizationId,
    target_attention_id: input.attentionId,
    target_resolved_by_user_id: input.resolvedByUserId,
    target_note: input.note ?? null,
  });
  if (error) return { status: "ERROR", reason: `resolve_regulatory_attention: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}
