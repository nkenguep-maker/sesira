import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

/**
 * C33.3 — regulatory export helpers.
 *
 * REGULATORY.md doctrine:
 *   * SESIRA PRODUCES the CERFA / bilan file; the customer DEPOSITS
 *     with their organisme agréé (DEKRA, Cemafroid, Socotec…).
 *   * Wording: « Préparer le bilan » / « Produire l'export » /
 *     « Exporter le dossier ». NEVER « SESIRA déclare pour vous ».
 *   * mark_regulatory_export_exported = INV-04 traced-human-validation
 *     for the download action. It does NOT push to any external
 *     regulatory portal.
 */

interface Deps { client?: SupabaseClient<Database>; }

export type RegulatoryExportKind = "CERFA_15497_04" | "ANNUAL_BILAN" | "OTHER";
export type RegulatoryExportStatus = "DRAFT" | "READY" | "EXPORTED" | "SUPERSEDED";
export type RegulatoryExportFormat = "JSON" | "XML" | "PDF" | "CSV";

export type GenerateExportResult =
  | { status: "APPLIED"; exportId: string }
  | { status: "ERROR"; reason: string };

export type RegulatoryExportActionResult =
  | { status: "APPLIED" } | { status: "NOT_ELIGIBLE" } | { status: "ERROR"; reason: string };

// -------- Generate --------

export interface GenerateCerfaInterventionExportInput {
  organizationId: string;
  interventionId: string;
  generatorUserId: string;
}

export async function generateCerfaInterventionExport(
  input: GenerateCerfaInterventionExportInput,
  deps: Deps = {},
): Promise<GenerateExportResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("generate_cerfa_intervention_export", {
    target_organization_id: input.organizationId,
    target_intervention_id: input.interventionId,
    target_generator_user_id: input.generatorUserId,
  });
  if (error) return { status: "ERROR", reason: `generate_cerfa_intervention_export: ${error.message}` };
  return { status: "APPLIED", exportId: data as string };
}

export interface GenerateAnnualBilanInput {
  organizationId: string;
  year: number;
  generatorUserId: string;
}

export async function generateAnnualRegulatoryBilan(
  input: GenerateAnnualBilanInput,
  deps: Deps = {},
): Promise<GenerateExportResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("generate_annual_regulatory_bilan", {
    target_organization_id: input.organizationId,
    target_year: input.year,
    target_generator_user_id: input.generatorUserId,
  });
  if (error) return { status: "ERROR", reason: `generate_annual_regulatory_bilan: ${error.message}` };
  return { status: "APPLIED", exportId: data as string };
}

// -------- Export action --------

export interface MarkRegulatoryExportExportedInput {
  organizationId: string;
  exportId: string;
  exportedByUserId: string;
  exportFormat: RegulatoryExportFormat;
}

export async function markRegulatoryExportExported(
  input: MarkRegulatoryExportExportedInput,
  deps: Deps = {},
): Promise<RegulatoryExportActionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("mark_regulatory_export_exported", {
    target_organization_id: input.organizationId,
    target_export_id: input.exportId,
    target_exported_by_user_id: input.exportedByUserId,
    target_export_format: input.exportFormat,
  });
  if (error) return { status: "ERROR", reason: `mark_regulatory_export_exported: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

// -------- Read helpers --------

export interface RegulatoryExportsForInput {
  organizationId: string;
  exportKind?: RegulatoryExportKind | null;
  year?: number | null;
  interventionId?: string | null;
  includeSuperseded?: boolean;
}

export interface RegulatoryExportRow {
  exportId: string;
  exportKind: RegulatoryExportKind;
  referenceYear: number | null;
  referenceInterventionId: string | null;
  status: RegulatoryExportStatus;
  payloadGapCount: number;
  generatedByUserId: string | null;
  generatedAt: string;
  exportedAt: string | null;
  exportedByUserId: string | null;
  exportFormat: RegulatoryExportFormat | null;
  supersededAt: string | null;
}

export type RegulatoryExportsForResult =
  | { status: "APPLIED"; rows: RegulatoryExportRow[] }
  | { status: "ERROR"; reason: string };

export async function regulatoryExportsFor(
  input: RegulatoryExportsForInput,
  deps: Deps = {},
): Promise<RegulatoryExportsForResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("regulatory_exports_for", {
    target_organization_id: input.organizationId,
    target_export_kind: input.exportKind ?? null,
    target_year: input.year ?? null,
    target_intervention_id: input.interventionId ?? null,
    target_include_superseded: input.includeSuperseded ?? false,
  });
  if (error) return { status: "ERROR", reason: `regulatory_exports_for: ${error.message}` };
  const rows = (data ?? []) as Array<{
    export_id: string; export_kind: string; reference_year: number | null;
    reference_intervention_id: string | null; status: string;
    payload_gap_count: number; generated_by_user_id: string | null;
    generated_at: string; exported_at: string | null;
    exported_by_user_id: string | null; export_format: string | null;
    superseded_at: string | null;
  }>;
  return {
    status: "APPLIED",
    rows: rows.map((r) => ({
      exportId: r.export_id,
      exportKind: r.export_kind as RegulatoryExportKind,
      referenceYear: r.reference_year,
      referenceInterventionId: r.reference_intervention_id,
      status: r.status as RegulatoryExportStatus,
      payloadGapCount: Number(r.payload_gap_count),
      generatedByUserId: r.generated_by_user_id,
      generatedAt: r.generated_at,
      exportedAt: r.exported_at,
      exportedByUserId: r.exported_by_user_id,
      exportFormat: r.export_format as RegulatoryExportFormat | null,
      supersededAt: r.superseded_at,
    })),
  };
}

export interface PendingCerfaRow {
  interventionId: string;
  title: string;
  completedAt: string | null;
  customerId: string;
}

export type PendingCerfaResult =
  | { status: "APPLIED"; rows: PendingCerfaRow[] }
  | { status: "ERROR"; reason: string };

export async function pendingCerfaInterventions(
  organizationId: string,
  deps: Deps = {},
): Promise<PendingCerfaResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("pending_cerfa_interventions", {
    target_organization_id: organizationId,
  });
  if (error) return { status: "ERROR", reason: `pending_cerfa_interventions: ${error.message}` };
  const rows = (data ?? []) as Array<{
    intervention_id: string; title: string; completed_at: string | null; customer_id: string;
  }>;
  return {
    status: "APPLIED",
    rows: rows.map((r) => ({
      interventionId: r.intervention_id,
      title: r.title,
      completedAt: r.completed_at,
      customerId: r.customer_id,
    })),
  };
}

// Payload details (full payload + rule_snapshot) are fetched by
// consumers via a dedicated select on public.regulatory_exports (add
// Row types manually if needed). The RPC list here only returns the
// metadata needed for the "Suivi réglementaire" surface.
