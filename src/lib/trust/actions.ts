import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/database";

/**
 * C45 — Document trust server helpers.
 *
 * create_document_version, request_document_trust, mark_ready are
 * authenticated. mark_submitted and record_evidence are service_role
 * (only the server-side path that actually called the provider can
 * write those transitions). verify_trust_evidence + cancel_trust_request
 * are authenticated.
 */

interface Deps { client?: SupabaseClient<Database>; }

export type TrustCapability = "TIMESTAMP" | "SIGNATURE" | "SEAL";
export type TrustRequestStatus =
  | "DRAFT" | "READY" | "SUBMITTED" | "CONFIRMED" | "REJECTED" | "FAILED" | "CANCELLED";
export type TrustEvidenceOutcome = "CONFIRMED" | "REJECTED" | "FAILED";
export type TrustVerificationResult = "PASS" | "FAIL" | "UNKNOWN";

// -------- create_document_version --------

export interface CreateDocumentVersionInput {
  organizationId: string;
  documentId: string;
  sha256: string;
  storageBucket: string;
  storagePath: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  sourceReference?: string | null;
}

export async function createDocumentVersion(
  input: CreateDocumentVersionInput,
  deps: Deps = {},
): Promise<{ status: "APPLIED"; versionId: string } | { status: "ERROR"; reason: string }> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("create_document_version", {
    target_organization_id: input.organizationId,
    target_document_id: input.documentId,
    target_sha256: input.sha256,
    target_storage_bucket: input.storageBucket,
    target_storage_path: input.storagePath,
    target_mime_type: input.mimeType ?? null,
    target_size_bytes: input.sizeBytes ?? null,
    target_source_reference: input.sourceReference ?? null,
  });
  if (error) return { status: "ERROR", reason: `create_document_version: ${error.message}` };
  return { status: "APPLIED", versionId: data as string };
}

// -------- request_document_trust --------

export interface RequestDocumentTrustInput {
  organizationId: string;
  documentVersionId: string;
  capability: TrustCapability;
  requestedLevel: string;
  providerId?: string | null;
  idempotencyKey: string;
}

export type RequestDocumentTrustResult =
  | { status: TrustRequestStatus; requestId: string; created: boolean }
  | { status: "ERROR"; reason: string };

export async function requestDocumentTrust(
  input: RequestDocumentTrustInput,
  deps: Deps = {},
): Promise<RequestDocumentTrustResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("request_document_trust", {
    target_organization_id: input.organizationId,
    target_document_version_id: input.documentVersionId,
    target_capability: input.capability,
    target_requested_level: input.requestedLevel,
    target_provider_id: input.providerId ?? null,
    target_idempotency_key: input.idempotencyKey,
  });
  if (error) return { status: "ERROR", reason: `request_document_trust: ${error.message}` };
  const rows = (data ?? []) as Array<{ request_id: string; status: string; created: boolean }>;
  if (rows.length === 0) return { status: "ERROR", reason: "request_document_trust returned no rows" };
  const r = rows[0];
  return { status: r.status as TrustRequestStatus, requestId: r.request_id, created: r.created };
}

// -------- mark_trust_request_ready + submitted --------

export type TrustTransitionResult =
  | { status: "APPLIED" } | { status: "NOT_ELIGIBLE" } | { status: "ERROR"; reason: string };

export async function markTrustRequestReady(
  organizationId: string, requestId: string, deps: Deps = {},
): Promise<TrustTransitionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("mark_trust_request_ready", {
    target_organization_id: organizationId,
    target_request_id: requestId,
  });
  if (error) return { status: "ERROR", reason: `mark_trust_request_ready: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

export async function markTrustRequestSubmitted(
  organizationId: string, requestId: string, externalRef: string, deps: Deps = {},
): Promise<TrustTransitionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("mark_trust_request_submitted", {
    target_organization_id: organizationId,
    target_request_id: requestId,
    target_external_ref: externalRef,
  });
  if (error) return { status: "ERROR", reason: `mark_trust_request_submitted: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

// -------- record_trust_evidence (service_role) --------

export interface RecordTrustEvidenceInput {
  organizationId: string;
  requestId: string;
  providerRef: string;
  confirmedAt: Date;
  rawEvidenceStoragePath?: string | null;
  certificateMetadata?: Json | null;
  timestampTokenReference?: string | null;
  signatureSealLevelReportedByProvider?: string | null;
  outcome: TrustEvidenceOutcome;
}

export async function recordTrustEvidence(
  input: RecordTrustEvidenceInput,
  deps: Deps = {},
): Promise<{ status: "APPLIED"; evidenceId: string | null } | { status: "ERROR"; reason: string }> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("record_trust_evidence", {
    target_organization_id: input.organizationId,
    target_request_id: input.requestId,
    target_provider_ref: input.providerRef,
    target_confirmed_at: input.confirmedAt.toISOString(),
    target_raw_evidence_storage_path: input.rawEvidenceStoragePath ?? null,
    target_certificate_metadata: (input.certificateMetadata ?? {}) as Json,
    target_timestamp_token_reference: input.timestampTokenReference ?? null,
    target_signature_seal_level_reported_by_provider:
      input.signatureSealLevelReportedByProvider ?? null,
    target_outcome: input.outcome,
  });
  if (error) return { status: "ERROR", reason: `record_trust_evidence: ${error.message}` };
  return { status: "APPLIED", evidenceId: (data as string | null) ?? null };
}

// -------- verify_trust_evidence --------

export async function verifyTrustEvidence(
  organizationId: string,
  evidenceId: string,
  result: "PASS" | "FAIL",
  notes: string | null,
  deps: Deps = {},
): Promise<TrustTransitionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("verify_trust_evidence", {
    target_organization_id: organizationId,
    target_evidence_id: evidenceId,
    target_verification_result: result,
    target_verification_notes: notes,
  });
  if (error) return { status: "ERROR", reason: `verify_trust_evidence: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

// -------- cancel_trust_request --------

export async function cancelTrustRequest(
  organizationId: string, requestId: string, reason: string, deps: Deps = {},
): Promise<TrustTransitionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("cancel_trust_request", {
    target_organization_id: organizationId,
    target_request_id: requestId,
    target_reason: reason,
  });
  if (error) return { status: "ERROR", reason: `cancel_trust_request: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}
