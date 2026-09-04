import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/database";

/**
 * C36 — technician field server helpers.
 *
 * Backend contract for the mobile technician app (U36 UI ships on
 * codex/product-workflows). Everything here is designed for
 * OFFLINE-FIRST clients:
 *   * Every mutation carries an offline_client_id for idempotent
 *     sync (dedup by (org, intervention, offline_client_id)).
 *   * captured_at is the CLIENT clock (when the tech pressed the
 *     button in the field). uploaded_at (server) is separate so we
 *     can measure sync delay honestly.
 *   * When an artifact arrives for a terminal intervention, it is
 *     PERSISTED with upload_status='CONFLICT' + conflict_reason —
 *     never silently dropped.
 *
 * AI MUST NEVER call these RPCs — captured_by_user_id must be a
 * real ACTIVE org member. AI can help STRUCTURE (e.g. NOTE payload
 * with ai_structured=true), never FABRICATE the underlying facts.
 */

interface Deps { client?: SupabaseClient<Database>; }

export type FieldActionResult =
  | { status: "APPLIED" } | { status: "NOT_ELIGIBLE" } | { status: "ERROR"; reason: string };

export type FieldArtifactKind =
  | "PHOTO" | "PART_USED" | "MEASUREMENT" | "ANOMALY" | "SIGNATURE" | "NOTE";

export type FieldArtifactUploadStatus = "SYNCED" | "CONFLICT" | "IGNORED";

export type MeasurementKind =
  | "PRESSURE" | "TEMPERATURE" | "CURRENT" | "VOLTAGE" | "LEAK_RATE"
  | "VOLUME_ADDED_KG" | "VOLUME_RECOVERED_KG" | "OTHER";

export type AnomalySeverity = "LOW" | "NORMAL" | "HIGH" | "URGENT";

// -------- Discriminated payload types --------

export interface PhotoPayload {
  url: string;
  thumbnailUrl?: string;
  gps?: { lat: number; lon: number };
  caption?: string;
  exif?: Record<string, unknown>;
}

export interface PartUsedPayload {
  partCode: string;
  partLabel: string;
  quantity: number;
  unitPrice?: number;
  currency?: string;
}

export interface MeasurementPayload {
  measurementKind: MeasurementKind;
  value: number;
  unit: string;
  notes?: string;
}

export interface AnomalyPayload {
  severity: AnomalySeverity;
  summary: string;
  notes?: string;
}

export interface SignaturePayload {
  signerRole: "TECH" | "CUSTOMER";
  signerName: string;
  signatureHash: string;
  signatureMethod?: string;
}

export interface NotePayload {
  text: string;
  aiStructured?: boolean;
  aiModel?: string;
}

export type FieldArtifactPayload =
  | { kind: "PHOTO"; data: PhotoPayload }
  | { kind: "PART_USED"; data: PartUsedPayload }
  | { kind: "MEASUREMENT"; data: MeasurementPayload }
  | { kind: "ANOMALY"; data: AnomalyPayload }
  | { kind: "SIGNATURE"; data: SignaturePayload }
  | { kind: "NOTE"; data: NotePayload };

function serializePayload(p: FieldArtifactPayload): Json {
  switch (p.kind) {
    case "PHOTO":
      return {
        url: p.data.url,
        thumbnail_url: p.data.thumbnailUrl ?? null,
        gps: p.data.gps as unknown as Json,
        caption: p.data.caption ?? null,
        exif: (p.data.exif ?? null) as unknown as Json,
      } as unknown as Json;
    case "PART_USED":
      return {
        part_code: p.data.partCode,
        part_label: p.data.partLabel,
        quantity: p.data.quantity,
        unit_price: p.data.unitPrice ?? null,
        currency: p.data.currency ?? null,
      } as unknown as Json;
    case "MEASUREMENT":
      return {
        measurement_kind: p.data.measurementKind,
        value: p.data.value,
        unit: p.data.unit,
        notes: p.data.notes ?? null,
      } as unknown as Json;
    case "ANOMALY":
      return {
        severity: p.data.severity,
        summary: p.data.summary,
        notes: p.data.notes ?? null,
      } as unknown as Json;
    case "SIGNATURE":
      return {
        signer_role: p.data.signerRole,
        signer_name: p.data.signerName,
        signature_hash: p.data.signatureHash,
        signature_method: p.data.signatureMethod ?? null,
      } as unknown as Json;
    case "NOTE":
      return {
        text: p.data.text,
        ai_structured: p.data.aiStructured ?? false,
        ai_model: p.data.aiModel ?? null,
      } as unknown as Json;
  }
}

// -------- Arrive / start --------

export interface ArriveAtInterventionInput {
  organizationId: string;
  interventionId: string;
  actorUserId: string;
  arrivedAt: Date;
  offlineClientId?: string | null;
}

export async function arriveAtIntervention(
  input: ArriveAtInterventionInput,
  deps: Deps = {},
): Promise<FieldActionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("arrive_at_intervention", {
    target_organization_id: input.organizationId,
    target_intervention_id: input.interventionId,
    target_actor_user_id: input.actorUserId,
    target_arrived_at: input.arrivedAt.toISOString(),
    target_offline_client_id: input.offlineClientId ?? null,
  });
  if (error) return { status: "ERROR", reason: `arrive_at_intervention: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

export interface StartInterventionInput {
  organizationId: string;
  interventionId: string;
  actorUserId: string;
  startedAt: Date;
}

export async function startInterventionWork(
  input: StartInterventionInput,
  deps: Deps = {},
): Promise<FieldActionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("start_intervention_work", {
    target_organization_id: input.organizationId,
    target_intervention_id: input.interventionId,
    target_actor_user_id: input.actorUserId,
    target_started_at: input.startedAt.toISOString(),
  });
  if (error) return { status: "ERROR", reason: `start_intervention_work: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

// -------- Field artifacts --------

export interface SubmitFieldArtifactInput {
  organizationId: string;
  interventionId: string;
  capturedByUserId: string;
  capturedAt: Date;
  offlineClientId: string;
  artifact: FieldArtifactPayload;
}

export type SubmitFieldArtifactResult =
  | { status: "SYNCED"; artifactId: string }
  | { status: "CONFLICT"; artifactId: string; reason: string }
  | { status: "IGNORED"; artifactId: string }
  | { status: "ERROR"; reason: string };

export async function submitInterventionFieldArtifact(
  input: SubmitFieldArtifactInput,
  deps: Deps = {},
): Promise<SubmitFieldArtifactResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("submit_intervention_field_artifact", {
    target_organization_id: input.organizationId,
    target_intervention_id: input.interventionId,
    target_artifact_kind: input.artifact.kind,
    target_payload: serializePayload(input.artifact),
    target_captured_at: input.capturedAt.toISOString(),
    target_captured_by_user_id: input.capturedByUserId,
    target_offline_client_id: input.offlineClientId,
  });
  if (error) return { status: "ERROR", reason: `submit_intervention_field_artifact: ${error.message}` };
  const rows = (data ?? []) as Array<{ artifact_id: string; upload_status: string; conflict_reason: string | null }>;
  if (rows.length === 0) return { status: "ERROR", reason: "submit_intervention_field_artifact returned no rows" };
  const r = rows[0];
  if (r.upload_status === "SYNCED") return { status: "SYNCED", artifactId: r.artifact_id };
  if (r.upload_status === "IGNORED") return { status: "IGNORED", artifactId: r.artifact_id };
  return { status: "CONFLICT", artifactId: r.artifact_id, reason: r.conflict_reason ?? "unknown conflict" };
}

export interface ResolveFieldArtifactConflictInput {
  organizationId: string;
  artifactId: string;
  actorUserId: string;
  newStatus: "SYNCED" | "IGNORED";
  note?: string | null;
}

export async function resolveFieldArtifactConflict(
  input: ResolveFieldArtifactConflictInput,
  deps: Deps = {},
): Promise<FieldActionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("resolve_field_artifact_conflict", {
    target_organization_id: input.organizationId,
    target_artifact_id: input.artifactId,
    target_actor_user_id: input.actorUserId,
    target_new_status: input.newStatus,
    target_note: input.note ?? null,
  });
  if (error) return { status: "ERROR", reason: `resolve_field_artifact_conflict: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

// -------- Read helpers --------

export interface TechnicianDayRow {
  interventionId: string;
  title: string;
  status: string;
  customerId: string;
  customerDisplayName: string | null;
  customerPhone: string | null;
  address: {
    line1: string | null;
    line2: string | null;
    postalCode: string | null;
    city: string | null;
  };
  scheduledAt: string | null;
  durationMinutes: number | null;
  arrivedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  equipmentId: string | null;
  quoteId: string | null;
  opportunityId: string | null;
  notes: string | null;
}

export type TechnicianDayResult =
  | { status: "APPLIED"; interventions: TechnicianDayRow[] }
  | { status: "ERROR"; reason: string };

export interface TechnicianDayInput {
  organizationId: string;
  userId: string;
  date: string; // ISO date YYYY-MM-DD
}

export async function technicianDay(
  input: TechnicianDayInput,
  deps: Deps = {},
): Promise<TechnicianDayResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("technician_day", {
    target_organization_id: input.organizationId,
    target_user_id: input.userId,
    target_date: input.date,
  });
  if (error) return { status: "ERROR", reason: `technician_day: ${error.message}` };
  const rows = (data ?? []) as Array<{
    intervention_id: string; title: string; status: string;
    customer_id: string; customer_display_name: string | null; customer_phone: string | null;
    address_line1: string | null; address_line2: string | null;
    address_postal_code: string | null; address_city: string | null;
    scheduled_at: string | null; duration_minutes: number | null;
    arrived_at: string | null; started_at: string | null; completed_at: string | null;
    equipment_id: string | null; quote_id: string | null; opportunity_id: string | null;
    notes: string | null;
  }>;
  return {
    status: "APPLIED",
    interventions: rows.map((r) => ({
      interventionId: r.intervention_id,
      title: r.title,
      status: r.status,
      customerId: r.customer_id,
      customerDisplayName: r.customer_display_name,
      customerPhone: r.customer_phone,
      address: {
        line1: r.address_line1,
        line2: r.address_line2,
        postalCode: r.address_postal_code,
        city: r.address_city,
      },
      scheduledAt: r.scheduled_at,
      durationMinutes: r.duration_minutes,
      arrivedAt: r.arrived_at,
      startedAt: r.started_at,
      completedAt: r.completed_at,
      equipmentId: r.equipment_id,
      quoteId: r.quote_id,
      opportunityId: r.opportunity_id,
      notes: r.notes,
    })),
  };
}

export interface FieldArtifactRow {
  artifactId: string;
  artifactKind: FieldArtifactKind;
  payload: Json;
  capturedAt: string;
  capturedByUserId: string;
  offlineClientId: string;
  uploadStatus: FieldArtifactUploadStatus;
  conflictReason: string | null;
  uploadedAt: string;
}

export type FieldArtifactsResult =
  | { status: "APPLIED"; artifacts: FieldArtifactRow[] }
  | { status: "ERROR"; reason: string };

export async function interventionFieldArtifactsFor(
  organizationId: string,
  interventionId: string,
  deps: Deps = {},
): Promise<FieldArtifactsResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("intervention_field_artifacts_for", {
    target_organization_id: organizationId,
    target_intervention_id: interventionId,
  });
  if (error) return { status: "ERROR", reason: `intervention_field_artifacts_for: ${error.message}` };
  const rows = (data ?? []) as Array<{
    artifact_id: string; artifact_kind: string; payload: Json;
    captured_at: string; captured_by_user_id: string; offline_client_id: string;
    upload_status: string; conflict_reason: string | null; uploaded_at: string;
  }>;
  return {
    status: "APPLIED",
    artifacts: rows.map((r) => ({
      artifactId: r.artifact_id,
      artifactKind: r.artifact_kind as FieldArtifactKind,
      payload: r.payload,
      capturedAt: r.captured_at,
      capturedByUserId: r.captured_by_user_id,
      offlineClientId: r.offline_client_id,
      uploadStatus: r.upload_status as FieldArtifactUploadStatus,
      conflictReason: r.conflict_reason,
      uploadedAt: r.uploaded_at,
    })),
  };
}

export interface PendingConflictRow {
  artifactId: string;
  interventionId: string;
  artifactKind: FieldArtifactKind;
  capturedAt: string;
  capturedByUserId: string;
  conflictReason: string | null;
  uploadedAt: string;
}

export type PendingConflictsResult =
  | { status: "APPLIED"; conflicts: PendingConflictRow[] }
  | { status: "ERROR"; reason: string };

export async function pendingFieldArtifactConflicts(
  organizationId: string,
  deps: Deps = {},
): Promise<PendingConflictsResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("pending_field_artifact_conflicts", {
    target_organization_id: organizationId,
  });
  if (error) return { status: "ERROR", reason: `pending_field_artifact_conflicts: ${error.message}` };
  const rows = (data ?? []) as Array<{
    artifact_id: string; intervention_id: string; artifact_kind: string;
    captured_at: string; captured_by_user_id: string; conflict_reason: string | null;
    uploaded_at: string;
  }>;
  return {
    status: "APPLIED",
    conflicts: rows.map((r) => ({
      artifactId: r.artifact_id,
      interventionId: r.intervention_id,
      artifactKind: r.artifact_kind as FieldArtifactKind,
      capturedAt: r.captured_at,
      capturedByUserId: r.captured_by_user_id,
      conflictReason: r.conflict_reason,
      uploadedAt: r.uploaded_at,
    })),
  };
}
