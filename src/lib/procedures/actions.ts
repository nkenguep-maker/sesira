import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/database";

/**
 * C43 — Guided procedures server helpers.
 *
 * All mutations go through SECURITY DEFINER RPCs. Binaries use a two-phase
 * protocol: reserve_binary_artifact → client uploads to Storage →
 * finalize_binary_artifact (SHA-256 verify). Wording rule: client signature
 * is "Émargement client" in UI — NEVER "eIDAS qualifié" / "signature
 * électronique qualifiée" (see C45 for the real trust provider seam).
 */

interface Deps { client?: SupabaseClient<Database>; }

export type ProcedureRunStatus =
  | "NOT_STARTED" | "IN_PROGRESS" | "READY_FOR_REVIEW" | "COMPLETED" | "NEEDS_ATTENTION";

export type StepResultSyncStatus = "SYNCED" | "CONFLICT" | "IGNORED";

export type BinaryUploadStatus =
  | "RESERVED" | "UPLOADED" | "FINALIZED" | "CONFLICT" | "IGNORED";

export type BinaryKind = "PHOTO" | "SIGNATURE" | "DOCUMENT";

export type SignerRole = "CUSTOMER" | "SITE_MANAGER" | "TECHNICIAN" | "OTHER";

// -------- start_procedure_run --------

export interface StartProcedureRunInput {
  organizationId: string;
  interventionId: string;
  templateId: string;
  actorUserId: string;
}

export type StartProcedureRunResult =
  | { status: "APPLIED"; runId: string }
  | { status: "ERROR"; reason: string };

export async function startProcedureRun(
  input: StartProcedureRunInput,
  deps: Deps = {},
): Promise<StartProcedureRunResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("start_procedure_run", {
    target_organization_id: input.organizationId,
    target_intervention_id: input.interventionId,
    target_template_id: input.templateId,
    target_actor_user_id: input.actorUserId,
  });
  if (error) return { status: "ERROR", reason: `start_procedure_run: ${error.message}` };
  return { status: "APPLIED", runId: data as string };
}

// -------- submit_step_result --------

export interface SubmitStepResultInput {
  organizationId: string;
  runId: string;
  stepId: string;
  valueJson: Json;
  capturedAt: Date;
  actorUserId: string;
  offlineClientId?: string | null;
  deviceRef?: string | null;
}

export type SubmitStepResultResult =
  | { status: "SYNCED"; resultId: string; created: boolean }
  | { status: "CONFLICT"; resultId: string; created: boolean }
  | { status: "IGNORED"; resultId: string; created: boolean }
  | { status: "ERROR"; reason: string };

export async function submitStepResult(
  input: SubmitStepResultInput,
  deps: Deps = {},
): Promise<SubmitStepResultResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("submit_step_result", {
    target_organization_id: input.organizationId,
    target_run_id: input.runId,
    target_step_id: input.stepId,
    target_value_json: input.valueJson,
    target_captured_at: input.capturedAt.toISOString(),
    target_actor_user_id: input.actorUserId,
    target_offline_client_id: input.offlineClientId ?? null,
    target_device_ref: input.deviceRef ?? null,
  });
  if (error) return { status: "ERROR", reason: `submit_step_result: ${error.message}` };
  const rows = (data ?? []) as Array<{ result_id: string; sync_status: string; created: boolean }>;
  if (rows.length === 0) return { status: "ERROR", reason: "submit_step_result returned no rows" };
  const r = rows[0];
  return { status: r.sync_status as StepResultSyncStatus, resultId: r.result_id, created: r.created };
}

// -------- reserve_binary_artifact --------

export interface ReserveBinaryArtifactInput {
  organizationId: string;
  interventionId: string;
  runId?: string | null;
  kind: BinaryKind;
  expectedSha256: string;
  capturedAt: Date;
  uploadedByUserId: string;
  offlineClientId?: string | null;
  payloadSnapshot?: Json | null;
}

export type ReserveBinaryArtifactResult =
  | {
      status: "APPLIED";
      artifactId: string;
      storageBucket: string;
      storagePath: string;
      uploadStatus: BinaryUploadStatus;
      created: boolean;
    }
  | { status: "ERROR"; reason: string };

export async function reserveBinaryArtifact(
  input: ReserveBinaryArtifactInput,
  deps: Deps = {},
): Promise<ReserveBinaryArtifactResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("reserve_binary_artifact", {
    target_organization_id: input.organizationId,
    target_intervention_id: input.interventionId,
    target_run_id: input.runId ?? null,
    target_kind: input.kind,
    target_expected_sha256: input.expectedSha256,
    target_captured_at: input.capturedAt.toISOString(),
    target_uploaded_by_user_id: input.uploadedByUserId,
    target_offline_client_id: input.offlineClientId ?? null,
    target_payload_snapshot: (input.payloadSnapshot ?? {}) as Json,
  });
  if (error) return { status: "ERROR", reason: `reserve_binary_artifact: ${error.message}` };
  const rows = (data ?? []) as Array<{
    artifact_id: string; storage_bucket: string; storage_path: string;
    upload_status: string; created: boolean;
  }>;
  if (rows.length === 0) return { status: "ERROR", reason: "reserve_binary_artifact returned no rows" };
  const r = rows[0];
  return {
    status: "APPLIED",
    artifactId: r.artifact_id,
    storageBucket: r.storage_bucket,
    storagePath: r.storage_path,
    uploadStatus: r.upload_status as BinaryUploadStatus,
    created: r.created,
  };
}

/**
 * Convenience: reserve + create a signed upload URL for the client.
 * The client uploads to that URL, then the app calls finalizeBinaryArtifact.
 */
export async function reserveAndSignUpload(
  input: ReserveBinaryArtifactInput,
  deps: Deps = {},
): Promise<
  | {
      status: "APPLIED";
      artifactId: string;
      signedUrl: string;
      storagePath: string;
      created: boolean;
    }
  | { status: "ERROR"; reason: string }
> {
  const supabase = deps.client ?? (await createClient());
  const reserved = await reserveBinaryArtifact(input, { client: supabase });
  if (reserved.status !== "APPLIED") return reserved;
  const { data, error } = await supabase.storage
    .from(reserved.storageBucket)
    .createSignedUploadUrl(reserved.storagePath);
  if (error || !data) {
    return {
      status: "ERROR",
      reason: `createSignedUploadUrl: ${error?.message ?? "no url returned"}`,
    };
  }
  return {
    status: "APPLIED",
    artifactId: reserved.artifactId,
    signedUrl: data.signedUrl,
    storagePath: reserved.storagePath,
    created: reserved.created,
  };
}

// -------- finalize_binary_artifact --------

export interface FinalizeBinaryArtifactInput {
  organizationId: string;
  artifactId: string;
  actualSha256: string;
  sizeBytes: number;
  contentType: string;
}

export type FinalizeBinaryArtifactResult =
  | { status: "FINALIZED"; artifactId: string }
  | { status: "CONFLICT"; artifactId: string; reason: string }
  | { status: "ERROR"; reason: string };

export async function finalizeBinaryArtifact(
  input: FinalizeBinaryArtifactInput,
  deps: Deps = {},
): Promise<FinalizeBinaryArtifactResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("finalize_binary_artifact", {
    target_organization_id: input.organizationId,
    target_artifact_id: input.artifactId,
    target_actual_sha256: input.actualSha256,
    target_size_bytes: input.sizeBytes,
    target_content_type: input.contentType,
  });
  if (error) return { status: "ERROR", reason: `finalize_binary_artifact: ${error.message}` };
  const rows = (data ?? []) as Array<{ artifact_id: string; upload_status: string; conflict_reason: string | null }>;
  if (rows.length === 0) return { status: "ERROR", reason: "finalize_binary_artifact returned no rows" };
  const r = rows[0];
  if (r.upload_status === "FINALIZED") return { status: "FINALIZED", artifactId: r.artifact_id };
  return { status: "CONFLICT", artifactId: r.artifact_id, reason: r.conflict_reason ?? "unknown conflict" };
}

// -------- submit_signature_evidence --------

export interface SubmitSignatureEvidenceInput {
  organizationId: string;
  runId: string;
  artifactId: string;
  signerName: string;
  signerRole: SignerRole;
  consentVersion: string;
}

export type SubmitSignatureEvidenceResult =
  | { status: "APPLIED" }
  | { status: "REPLAYED" }
  | { status: "ERROR"; reason: string };

export async function submitSignatureEvidence(
  input: SubmitSignatureEvidenceInput,
  deps: Deps = {},
): Promise<SubmitSignatureEvidenceResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("submit_signature_evidence", {
    target_organization_id: input.organizationId,
    target_run_id: input.runId,
    target_artifact_id: input.artifactId,
    target_signer_name: input.signerName,
    target_signer_role: input.signerRole,
    target_consent_version: input.consentVersion,
  });
  if (error) return { status: "ERROR", reason: `submit_signature_evidence: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "REPLAYED" };
}

// -------- mark_run_ready_for_review + complete_run + resolve_step_conflict --------

export type RunTransitionResult =
  | { status: "APPLIED" }
  | { status: "NOT_ELIGIBLE" }
  | { status: "ERROR"; reason: string };

export async function markRunReadyForReview(
  organizationId: string,
  runId: string,
  deps: Deps = {},
): Promise<RunTransitionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("mark_run_ready_for_review", {
    target_organization_id: organizationId,
    target_run_id: runId,
  });
  if (error) return { status: "ERROR", reason: `mark_run_ready_for_review: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

export async function completeRun(
  organizationId: string,
  runId: string,
  reviewNotes: string | null,
  deps: Deps = {},
): Promise<RunTransitionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("complete_run", {
    target_organization_id: organizationId,
    target_run_id: runId,
    target_review_notes: reviewNotes,
  });
  if (error) return { status: "ERROR", reason: `complete_run: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

export interface ResolveStepConflictInput {
  organizationId: string;
  resultId: string;
  actorUserId: string;
  decision: "SYNCED" | "IGNORED";
  note?: string | null;
}

export async function resolveStepConflict(
  input: ResolveStepConflictInput,
  deps: Deps = {},
): Promise<RunTransitionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("resolve_step_conflict", {
    target_organization_id: input.organizationId,
    target_result_id: input.resultId,
    target_actor_user_id: input.actorUserId,
    target_decision: input.decision,
    target_note: input.note ?? null,
  });
  if (error) return { status: "ERROR", reason: `resolve_step_conflict: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}
