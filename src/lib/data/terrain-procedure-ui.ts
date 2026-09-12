import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

type ReadResult<T> = { status: "OK"; data: T } | { status: "UNAVAILABLE"; reason: string };

export type TerrainProcedureTemplate = {
  id: string;
  label: string;
  version: number;
};

export type TerrainProcedureStep = {
  id: string;
  ordinal: number;
  kind: "CHECK" | "MEASUREMENT" | "TEXT" | "PART" | "PHOTO" | "SIGNATURE" | "REGULATORY_CONFIRMATION";
  required: boolean;
  unit: string | null;
  rangeMin: number | null;
  rangeMax: number | null;
  wording: string;
  result: null | {
    id: string;
    syncStatus: "SYNCED" | "CONFLICT" | "IGNORED";
    value: Record<string, unknown>;
    capturedAt: string;
  };
};

export type TerrainProcedureRun = {
  id: string;
  templateId: string;
  templateVersion: number;
  templateLabel: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "READY_FOR_REVIEW" | "COMPLETED" | "NEEDS_ATTENTION";
  startedAt: string | null;
  completedAt: string | null;
  steps: TerrainProcedureStep[];
};

export type TerrainEquipmentContext = {
  id: string;
  label: string;
  category: string;
  fluidCode: string | null;
  chargeKg: number | null;
  lastLeakCheckAt: string | null;
  nextLeakCheck: null | { status: "DUE"; nextDueAt: string } | { status: "OUT_OF_SCOPE" } | { status: "UNAVAILABLE" };
};

export type TerrainRegulatoryExport = {
  id: string;
  status: string;
  gapCount: number;
  generatedAt: string;
};

export type TerrainBinaryEvidence = {
  id: string;
  kind: "PHOTO" | "SIGNATURE" | "DOCUMENT";
  status: string;
  capturedAt: string;
};

export async function getTerrainProcedureUi(
  organizationId: string,
  interventionId: string,
): Promise<ReadResult<{
  templates: TerrainProcedureTemplate[];
  run: TerrainProcedureRun | null;
  equipment: TerrainEquipmentContext | null;
  regulatoryExport: TerrainRegulatoryExport | null;
  binaries: TerrainBinaryEvidence[];
}>> {
  const client = (await createClient()) as unknown as SupabaseClient;

  const [templatesResult, runsResult, interventionResult, binaryResult, exportResult] = await Promise.all([
    client
      .from("field_procedure_templates")
      .select("id,label,version,organization_id,active")
      .or(`organization_id.is.null,organization_id.eq.${organizationId}`)
      .eq("active", true)
      .order("label")
      .order("version", { ascending: false }),
    client
      .from("intervention_procedure_runs")
      .select("id,template_id,template_version,status,started_at,completed_at,created_at")
      .eq("organization_id", organizationId)
      .eq("intervention_id", interventionId)
      .order("created_at", { ascending: false })
      .limit(1),
    client
      .from("interventions")
      .select("metadata")
      .eq("organization_id", organizationId)
      .eq("id", interventionId)
      .maybeSingle(),
    client
      .from("binary_field_artifacts")
      .select("id,kind,upload_status,captured_at")
      .eq("organization_id", organizationId)
      .eq("intervention_id", interventionId)
      .order("captured_at", { ascending: false })
      .limit(50),
    client
      .from("regulatory_exports")
      .select("id,status,payload_gaps,generated_at")
      .eq("organization_id", organizationId)
      .eq("export_kind", "CERFA_15497_04")
      .eq("reference_intervention_id", interventionId)
      .neq("status", "SUPERSEDED")
      .order("generated_at", { ascending: false })
      .limit(1),
  ]);

  const coreError = templatesResult.error ?? runsResult.error;
  if (coreError) return { status: "UNAVAILABLE", reason: coreError.message };

  const templates = dedupeTemplates((templatesResult.data ?? []).map((row) => ({
    id: String(row.id),
    label: String(row.label),
    version: Number(row.version),
  })));

  const runRow = Array.isArray(runsResult.data) ? runsResult.data[0] as Record<string, unknown> | undefined : undefined;
  let run: TerrainProcedureRun | null = null;

  if (runRow) {
    const runId = String(runRow.id);
    const templateId = String(runRow.template_id);
    const [stepsResult, resultsResult, templateResult] = await Promise.all([
      client
        .from("field_procedure_steps")
        .select("id,ordinal,kind,required,unit,range_min,range_max,human_wording")
        .eq("template_id", templateId)
        .order("ordinal"),
      client
        .from("field_step_results")
        .select("id,step_id,value_json,sync_status,captured_at,created_at")
        .eq("organization_id", organizationId)
        .eq("run_id", runId)
        .order("created_at", { ascending: false }),
      client.from("field_procedure_templates").select("label").eq("id", templateId).maybeSingle(),
    ]);
    const runError = stepsResult.error ?? resultsResult.error ?? templateResult.error;
    if (runError) return { status: "UNAVAILABLE", reason: runError.message };

    const latestResultByStep = new Map<string, Record<string, unknown>>();
    for (const row of (resultsResult.data ?? []) as Array<Record<string, unknown>>) {
      const stepId = String(row.step_id);
      if (!latestResultByStep.has(stepId)) latestResultByStep.set(stepId, row);
    }

    run = {
      id: runId,
      templateId,
      templateVersion: Number(runRow.template_version),
      templateLabel: templateResult.data?.label ? String(templateResult.data.label) : "Procédure terrain",
      status: String(runRow.status) as TerrainProcedureRun["status"],
      startedAt: nullableString(runRow.started_at),
      completedAt: nullableString(runRow.completed_at),
      steps: ((stepsResult.data ?? []) as Array<Record<string, unknown>>).map((row) => {
        const resultRow = latestResultByStep.get(String(row.id));
        return {
          id: String(row.id),
          ordinal: Number(row.ordinal),
          kind: String(row.kind) as TerrainProcedureStep["kind"],
          required: Boolean(row.required),
          unit: nullableString(row.unit),
          rangeMin: row.range_min === null ? null : Number(row.range_min),
          rangeMax: row.range_max === null ? null : Number(row.range_max),
          wording: String(row.human_wording),
          result: resultRow ? {
            id: String(resultRow.id),
            syncStatus: String(resultRow.sync_status) as TerrainProcedureStep["result"] extends infer R ? R extends { syncStatus: infer S } ? S : never : never,
            value: isObject(resultRow.value_json) ? resultRow.value_json as Record<string, unknown> : {},
            capturedAt: String(resultRow.captured_at),
          } : null,
        };
      }),
    };
  }

  let equipment: TerrainEquipmentContext | null = null;
  if (!interventionResult.error && interventionResult.data && isObject(interventionResult.data.metadata)) {
    const equipmentId = typeof interventionResult.data.metadata.equipment_id === "string" ? interventionResult.data.metadata.equipment_id : null;
    if (equipmentId) {
      const equipmentResult = await client
        .from("equipment")
        .select("id,label,equipment_category,fluid_code,charge_kg,last_leak_check_at")
        .eq("organization_id", organizationId)
        .eq("id", equipmentId)
        .maybeSingle();
      if (!equipmentResult.error && equipmentResult.data) {
        const dueResult = await client.rpc("compute_next_leak_check_due", {
          target_organization_id: organizationId,
          target_equipment_id: equipmentId,
          target_at: null,
        });
        let nextLeakCheck: TerrainEquipmentContext["nextLeakCheck"] = { status: "UNAVAILABLE" };
        if (!dueResult.error) {
          const first = Array.isArray(dueResult.data) ? dueResult.data[0] as Record<string, unknown> | undefined : undefined;
          nextLeakCheck = first ? { status: "DUE", nextDueAt: String(first.next_due_at) } : { status: "OUT_OF_SCOPE" };
        }
        equipment = {
          id: String(equipmentResult.data.id),
          label: String(equipmentResult.data.label),
          category: String(equipmentResult.data.equipment_category),
          fluidCode: nullableString(equipmentResult.data.fluid_code),
          chargeKg: equipmentResult.data.charge_kg === null ? null : Number(equipmentResult.data.charge_kg),
          lastLeakCheckAt: nullableString(equipmentResult.data.last_leak_check_at),
          nextLeakCheck,
        };
      }
    }
  }

  const exportRow = !exportResult.error && Array.isArray(exportResult.data) ? exportResult.data[0] as Record<string, unknown> | undefined : undefined;
  const regulatoryExport = exportRow ? {
    id: String(exportRow.id),
    status: String(exportRow.status),
    gapCount: Array.isArray(exportRow.payload_gaps) ? exportRow.payload_gaps.length : 0,
    generatedAt: String(exportRow.generated_at),
  } : null;

  const binaries = binaryResult.error ? [] : ((binaryResult.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    kind: String(row.kind) as TerrainBinaryEvidence["kind"],
    status: String(row.upload_status),
    capturedAt: String(row.captured_at),
  }));

  return { status: "OK", data: { templates, run, equipment, regulatoryExport, binaries } };
}

function dedupeTemplates(rows: TerrainProcedureTemplate[]) {
  const byLabel = new Map<string, TerrainProcedureTemplate>();
  for (const row of rows) {
    const current = byLabel.get(row.label);
    if (!current || row.version > current.version) byLabel.set(row.label, row);
  }
  return [...byLabel.values()].sort((a, b) => a.label.localeCompare(b.label));
}

function nullableString(value: unknown) {
  return typeof value === "string" && value.length ? value : null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
