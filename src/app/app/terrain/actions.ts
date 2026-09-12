"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getViewerContext } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

async function client(): Promise<SupabaseClient> { return (await createClient()) as unknown as SupabaseClient; }

const OFFLINE_KINDS = new Set(["NOTE", "ANOMALY", "MEASUREMENT", "PART_USED"]);
const PROCEDURE_KINDS = new Set(["CHECK", "MEASUREMENT", "TEXT", "PART", "REGULATORY_CONFIRMATION"]);
const BINARY_KINDS = new Set(["PHOTO", "SIGNATURE"]);
const SIGNER_ROLES = new Set(["CUSTOMER", "SITE_MANAGER", "TECHNICIAN", "OTHER"]);

export type OfflineFieldArtifactInput = {
  interventionId: string;
  artifactKind: "NOTE" | "ANOMALY" | "MEASUREMENT" | "PART_USED";
  payload: Record<string, unknown>;
  capturedAt: string;
  offlineClientId: string;
};

export async function syncOfflineFieldArtifactAction(input: OfflineFieldArtifactInput) {
  const viewer = await getViewerContext();
  if (!viewer) return { status: "ERROR" as const, reason: "Session expirée" };
  if (!input.interventionId || !OFFLINE_KINDS.has(input.artifactKind)) return { status: "ERROR" as const, reason: "Saisie invalide" };
  if (!input.offlineClientId || input.offlineClientId.length > 100) return { status: "ERROR" as const, reason: "Identifiant hors connexion invalide" };
  const capturedAt = new Date(input.capturedAt);
  if (Number.isNaN(capturedAt.getTime())) return { status: "ERROR" as const, reason: "Date de capture invalide" };

  const result = await (await client()).rpc("submit_intervention_field_artifact", {
    target_organization_id: viewer.organization.id,
    target_intervention_id: input.interventionId,
    target_artifact_kind: input.artifactKind,
    target_payload: input.payload,
    target_captured_at: capturedAt.toISOString(),
    target_captured_by_user_id: viewer.userId,
    target_offline_client_id: input.offlineClientId,
  });
  if (result.error) return { status: "ERROR" as const, reason: result.error.message };
  const first = Array.isArray(result.data) ? result.data[0] as Record<string, unknown> | undefined : undefined;
  revalidatePath("/app/terrain");
  revalidatePath("/app");
  if (first?.upload_status === "CONFLICT") return { status: "CONFLICT" as const };
  return { status: "SYNCED" as const };
}

export async function arriveAtInterventionAction(formData: FormData) {
  const viewer = await getViewerContext();
  if (!viewer) redirect("/login");
  const interventionId = String(formData.get("interventionId") ?? "");
  if (!interventionId) redirect("/app/terrain?result=invalid");
  const capturedAt = new Date();
  const result = await (await client()).rpc("arrive_at_intervention", {
    target_organization_id: viewer.organization.id,
    target_intervention_id: interventionId,
    target_actor_user_id: viewer.userId,
    target_arrived_at: capturedAt.toISOString(),
    target_offline_client_id: `web-arrival:${viewer.userId}:${interventionId}:${capturedAt.getTime()}`,
  });
  redirect(buildTerrainUrl(formData, !result.error && result.data === true ? "arrived" : "not-applied"));
}

export async function startInterventionAction(formData: FormData) {
  const viewer = await getViewerContext();
  if (!viewer) redirect("/login");
  const interventionId = String(formData.get("interventionId") ?? "");
  if (!interventionId) redirect("/app/terrain?result=invalid");
  const result = await (await client()).rpc("start_intervention_work", {
    target_organization_id: viewer.organization.id,
    target_intervention_id: interventionId,
    target_actor_user_id: viewer.userId,
    target_started_at: new Date().toISOString(),
  });
  redirect(buildTerrainUrl(formData, !result.error && result.data === true ? "started" : "not-applied"));
}

export async function addFieldNoteAction(formData: FormData) {
  const viewer = await getViewerContext();
  if (!viewer) redirect("/login");
  const interventionId = String(formData.get("interventionId") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 4000);
  if (!interventionId || !note) redirect(buildTerrainUrl(formData, "invalid"));
  const capturedAt = new Date();
  const result = await (await client()).rpc("submit_intervention_field_artifact", {
    target_organization_id: viewer.organization.id,
    target_intervention_id: interventionId,
    target_artifact_kind: "NOTE",
    target_payload: { text: note, ai_structured: false },
    target_captured_at: capturedAt.toISOString(),
    target_captured_by_user_id: viewer.userId,
    target_offline_client_id: `web-note:${viewer.userId}:${interventionId}:${capturedAt.getTime()}`,
  });
  if (result.error) redirect(buildTerrainUrl(formData, "not-applied"));
  const first = Array.isArray(result.data) ? result.data[0] as Record<string, unknown> | undefined : undefined;
  const status = first?.upload_status === "CONFLICT" ? "conflict" : "note-saved";
  redirect(buildTerrainUrl(formData, status));
}

export async function resolveFieldConflictAction(formData: FormData) {
  const viewer = await getViewerContext();
  if (!viewer) redirect("/login");
  const artifactId = String(formData.get("artifactId") ?? "");
  const resolution = String(formData.get("resolution") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 1000);
  if (!artifactId || !["SYNCED", "IGNORED"].includes(resolution)) redirect(buildTerrainUrl(formData, "invalid"));
  const result = await (await client()).rpc("resolve_field_artifact_conflict", {
    target_organization_id: viewer.organization.id,
    target_artifact_id: artifactId,
    target_actor_user_id: viewer.userId,
    target_new_status: resolution,
    target_note: note || null,
  });
  redirect(buildTerrainUrl(formData, !result.error && result.data === true ? "conflict-resolved" : "not-applied"));
}

export async function startProcedureRunAction(formData: FormData) {
  const viewer = await getViewerContext();
  if (!viewer) redirect("/login");
  const interventionId = String(formData.get("interventionId") ?? "");
  const templateId = String(formData.get("templateId") ?? "");
  if (!interventionId || !templateId) redirect(buildTerrainUrl(formData, "invalid"));
  const result = await (await client()).rpc("start_procedure_run", {
    target_organization_id: viewer.organization.id,
    target_intervention_id: interventionId,
    target_template_id: templateId,
    target_actor_user_id: viewer.userId,
  });
  revalidatePath("/app/terrain");
  redirect(buildTerrainUrl(formData, result.error ? "not-applied" : "procedure-started"));
}

export async function submitProcedureStepAction(formData: FormData) {
  const viewer = await getViewerContext();
  if (!viewer) redirect("/login");
  const runId = String(formData.get("runId") ?? "");
  const stepId = String(formData.get("stepId") ?? "");
  const kind = String(formData.get("kind") ?? "");
  if (!runId || !stepId || !PROCEDURE_KINDS.has(kind)) redirect(buildTerrainUrl(formData, "invalid"));

  const valueJson = procedureValue(kind, formData);
  if (!valueJson) redirect(buildTerrainUrl(formData, "invalid"));
  const capturedAt = new Date();
  const result = await (await client()).rpc("submit_step_result", {
    target_organization_id: viewer.organization.id,
    target_run_id: runId,
    target_step_id: stepId,
    target_value_json: valueJson,
    target_captured_at: capturedAt.toISOString(),
    target_actor_user_id: viewer.userId,
    target_offline_client_id: `web-step:${runId}:${stepId}:${capturedAt.getTime()}`.slice(0, 100),
    target_device_ref: "web-terrain",
  });

  const first = Array.isArray(result.data) ? result.data[0] as Record<string, unknown> | undefined : undefined;
  const status = result.error ? "not-applied" : first?.sync_status === "CONFLICT" ? "procedure-conflict" : "step-saved";
  revalidatePath("/app/terrain");
  redirect(buildTerrainUrl(formData, status));
}

export async function uploadBinaryEvidenceAction(formData: FormData) {
  const viewer = await getViewerContext();
  if (!viewer) redirect("/login");
  const interventionId = String(formData.get("interventionId") ?? "");
  const runId = String(formData.get("runId") ?? "");
  const stepId = String(formData.get("stepId") ?? "");
  const kind = String(formData.get("kind") ?? "");
  const file = formData.get("file");
  if (!interventionId || !runId || !stepId || !BINARY_KINDS.has(kind) || !(file instanceof File) || file.size <= 0) {
    redirect(buildTerrainUrl(formData, "invalid"));
  }

  if (file.size > 15 * 1024 * 1024) redirect(buildTerrainUrl(formData, "file-too-large"));
  const bytes = Buffer.from(await file.arrayBuffer());
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const capturedAt = new Date();
  const offlineClientId = `web-binary:${interventionId}:${sha256}`.slice(0, 100);
  const supabase = await client();
  const reserved = await supabase.rpc("reserve_binary_artifact", {
    target_organization_id: viewer.organization.id,
    target_intervention_id: interventionId,
    target_run_id: runId,
    target_kind: kind,
    target_expected_sha256: sha256,
    target_captured_at: capturedAt.toISOString(),
    target_uploaded_by_user_id: viewer.userId,
    target_offline_client_id: offlineClientId,
    target_payload_snapshot: { source: "sesira-terrain-ui", step_id: stepId },
  });
  const reserveRow = Array.isArray(reserved.data) ? reserved.data[0] as Record<string, unknown> | undefined : undefined;
  if (reserved.error || !reserveRow) redirect(buildTerrainUrl(formData, "not-applied"));

  const artifactId = String(reserveRow.artifact_id);
  const storageBucket = String(reserveRow.storage_bucket);
  const storagePath = String(reserveRow.storage_path);
  const existingStatus = String(reserveRow.upload_status ?? "RESERVED");

  if (existingStatus !== "FINALIZED") {
    const upload = await supabase.storage.from(storageBucket).upload(storagePath, bytes, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    });
    if (upload.error) redirect(buildTerrainUrl(formData, "not-applied"));

    const finalized = await supabase.rpc("finalize_binary_artifact", {
      target_organization_id: viewer.organization.id,
      target_artifact_id: artifactId,
      target_actual_sha256: sha256,
      target_size_bytes: file.size,
      target_content_type: file.type || "application/octet-stream",
    });
    const finalizedRow = Array.isArray(finalized.data) ? finalized.data[0] as Record<string, unknown> | undefined : undefined;
    if (finalized.error || finalizedRow?.upload_status !== "FINALIZED") redirect(buildTerrainUrl(formData, "binary-conflict"));
  }

  if (kind === "SIGNATURE") {
    const signerName = String(formData.get("signerName") ?? "").trim().slice(0, 200);
    const signerRole = String(formData.get("signerRole") ?? "CUSTOMER");
    if (!signerName || !SIGNER_ROLES.has(signerRole)) redirect(buildTerrainUrl(formData, "invalid"));
    const signature = await supabase.rpc("submit_signature_evidence", {
      target_organization_id: viewer.organization.id,
      target_run_id: runId,
      target_artifact_id: artifactId,
      target_signer_name: signerName,
      target_signer_role: signerRole,
      target_consent_version: "sesira-terrain-emargement-v1",
    });
    if (signature.error) redirect(buildTerrainUrl(formData, "not-applied"));
  }

  const stepResult = await supabase.rpc("submit_step_result", {
    target_organization_id: viewer.organization.id,
    target_run_id: runId,
    target_step_id: stepId,
    target_value_json: { artifact_id: artifactId, kind },
    target_captured_at: capturedAt.toISOString(),
    target_actor_user_id: viewer.userId,
    target_offline_client_id: `web-binary-step:${runId}:${stepId}:${sha256}`.slice(0, 100),
    target_device_ref: "web-terrain",
  });
  const stepRow = Array.isArray(stepResult.data) ? stepResult.data[0] as Record<string, unknown> | undefined : undefined;
  if (stepResult.error) redirect(buildTerrainUrl(formData, "not-applied"));
  if (stepRow?.sync_status === "CONFLICT") redirect(buildTerrainUrl(formData, "procedure-conflict"));

  revalidatePath("/app/terrain");
  redirect(buildTerrainUrl(formData, kind === "PHOTO" ? "photo-saved" : "signature-saved"));
}

export async function markProcedureReadyAction(formData: FormData) {
  const viewer = await getViewerContext();
  if (!viewer) redirect("/login");
  const runId = String(formData.get("runId") ?? "");
  if (!runId) redirect(buildTerrainUrl(formData, "invalid"));
  const result = await (await client()).rpc("mark_run_ready_for_review", {
    target_organization_id: viewer.organization.id,
    target_run_id: runId,
  });
  revalidatePath("/app/terrain");
  redirect(buildTerrainUrl(formData, !result.error && result.data === true ? "procedure-ready" : "not-applied"));
}

export async function completeProcedureRunAction(formData: FormData) {
  const viewer = await getViewerContext();
  if (!viewer) redirect("/login");
  const runId = String(formData.get("runId") ?? "");
  const reviewNotes = String(formData.get("reviewNotes") ?? "").trim().slice(0, 2000);
  if (!runId) redirect(buildTerrainUrl(formData, "invalid"));
  const result = await (await client()).rpc("complete_run", {
    target_organization_id: viewer.organization.id,
    target_run_id: runId,
    target_review_notes: reviewNotes || null,
  });
  revalidatePath("/app/terrain");
  redirect(buildTerrainUrl(formData, !result.error && result.data === true ? "procedure-completed" : "not-applied"));
}

function procedureValue(kind: string, formData: FormData): Record<string, unknown> | null {
  if (kind === "CHECK" || kind === "REGULATORY_CONFIRMATION") {
    const checked = String(formData.get("checked") ?? "") === "yes";
    return checked ? { checked: true } : null;
  }
  if (kind === "TEXT") {
    const text = String(formData.get("text") ?? "").trim();
    return text ? { text } : null;
  }
  if (kind === "MEASUREMENT") {
    const rawValue = String(formData.get("value") ?? "");
    const value = Number(rawValue);
    const unit = String(formData.get("unit") ?? "").trim();
    return rawValue && Number.isFinite(value) ? { value, ...(unit ? { unit } : {}) } : null;
  }
  if (kind === "PART") {
    const partCode = String(formData.get("partCode") ?? "").trim();
    const partLabel = String(formData.get("partLabel") ?? "").trim();
    const rawQuantity = String(formData.get("quantity") ?? "");
    const quantity = Number(rawQuantity);
    return partLabel && rawQuantity && Number.isFinite(quantity) && quantity > 0
      ? { part_code: partCode || null, part_label: partLabel, quantity }
      : null;
  }
  return null;
}

function buildTerrainUrl(formData: FormData, result: string) {
  const params = new URLSearchParams({ result });
  const date = String(formData.get("date") ?? "");
  const focus = String(formData.get("focus") ?? formData.get("interventionId") ?? "");
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) params.set("date", date);
  if (focus) params.set("focus", focus);
  return `/app/terrain?${params.toString()}#intervention`;
}
