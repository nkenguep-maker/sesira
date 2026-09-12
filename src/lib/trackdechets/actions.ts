import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/database";

/**
 * C46 — Trackdéchets server helpers.
 *
 * create/prepare/cancel are authenticated. mark_submitted /
 * acknowledged / rejected are service_role (only the server path
 * that actually called the provider or received a webhook writes those).
 */

interface Deps { client?: SupabaseClient<Database>; }

export type TrackdechetsSubmissionStatus =
  | "PREPARING" | "READY" | "PROVIDER_PENDING" | "SUBMITTED"
  | "ACKNOWLEDGED" | "REJECTED" | "FAILED" | "CANCELLED";

export interface CreateWasteDossierInput {
  organizationId: string;
  interventionId?: string | null;
  customerId?: string | null;
  siteId?: string | null;
  wasteCategory: string;
  wasteCode?: string | null;
  quantity: number;
  unit: string;
  producerRef?: string | null;
  carrierRef?: string | null;
  destinationRef?: string | null;
}

export async function createWasteDossier(
  input: CreateWasteDossierInput,
  deps: Deps = {},
): Promise<{ status: "APPLIED"; dossierId: string } | { status: "ERROR"; reason: string }> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("create_waste_dossier", {
    target_organization_id: input.organizationId,
    target_intervention_id: input.interventionId ?? null,
    target_customer_id: input.customerId ?? null,
    target_site_id: input.siteId ?? null,
    target_waste_category: input.wasteCategory,
    target_waste_code: input.wasteCode ?? null,
    target_quantity: input.quantity,
    target_unit: input.unit,
    target_producer_ref: input.producerRef ?? null,
    target_carrier_ref: input.carrierRef ?? null,
    target_destination_ref: input.destinationRef ?? null,
  });
  if (error) return { status: "ERROR", reason: `create_waste_dossier: ${error.message}` };
  return { status: "APPLIED", dossierId: data as string };
}

export interface PrepareTrackdechetsSubmissionInput {
  organizationId: string;
  wasteDossierId: string;
  providerId?: string | null;
  idempotencyKey: string;
  payloadSnapshot: Json;
}

export type PrepareTrackdechetsResult =
  | { status: TrackdechetsSubmissionStatus; submissionId: string; gaps: string[]; created: boolean }
  | { status: "ERROR"; reason: string };

export async function prepareTrackdechetsSubmission(
  input: PrepareTrackdechetsSubmissionInput,
  deps: Deps = {},
): Promise<PrepareTrackdechetsResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("prepare_trackdechets_submission", {
    target_organization_id: input.organizationId,
    target_waste_dossier_id: input.wasteDossierId,
    target_provider_id: input.providerId ?? null,
    target_idempotency_key: input.idempotencyKey,
    target_payload_snapshot: input.payloadSnapshot,
  });
  if (error) return { status: "ERROR", reason: `prepare_trackdechets_submission: ${error.message}` };
  const rows = (data ?? []) as Array<{
    submission_id: string; status: string; gaps: string[]; created: boolean;
  }>;
  if (rows.length === 0) return { status: "ERROR", reason: "prepare returned no rows" };
  const r = rows[0];
  return {
    status: r.status as TrackdechetsSubmissionStatus,
    submissionId: r.submission_id,
    gaps: r.gaps ?? [],
    created: r.created,
  };
}

export type TrackdechetsTransitionResult =
  | { status: "APPLIED" } | { status: "NOT_ELIGIBLE" } | { status: "ERROR"; reason: string };

export async function markTrackdechetsProviderPending(
  organizationId: string, submissionId: string, deps: Deps = {},
): Promise<TrackdechetsTransitionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("mark_trackdechets_provider_pending", {
    target_organization_id: organizationId,
    target_submission_id: submissionId,
  });
  if (error) return { status: "ERROR", reason: `mark_trackdechets_provider_pending: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

export async function markTrackdechetsSubmitted(
  organizationId: string, submissionId: string, externalRef: string, deps: Deps = {},
): Promise<TrackdechetsTransitionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("mark_trackdechets_submitted", {
    target_organization_id: organizationId,
    target_submission_id: submissionId,
    target_external_ref: externalRef,
  });
  if (error) return { status: "ERROR", reason: `mark_trackdechets_submitted: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

export async function markTrackdechetsAcknowledged(
  organizationId: string, submissionId: string, providerRef: string, deps: Deps = {},
): Promise<TrackdechetsTransitionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("mark_trackdechets_acknowledged", {
    target_organization_id: organizationId,
    target_submission_id: submissionId,
    target_provider_ref: providerRef,
  });
  if (error) return { status: "ERROR", reason: `mark_trackdechets_acknowledged: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

export async function markTrackdechetsRejected(
  organizationId: string, submissionId: string, reason: string, deps: Deps = {},
): Promise<TrackdechetsTransitionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("mark_trackdechets_rejected", {
    target_organization_id: organizationId,
    target_submission_id: submissionId,
    target_reason: reason,
  });
  if (error) return { status: "ERROR", reason: `mark_trackdechets_rejected: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

export async function cancelTrackdechetsSubmission(
  organizationId: string, submissionId: string, reason: string, deps: Deps = {},
): Promise<TrackdechetsTransitionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("cancel_trackdechets_submission", {
    target_organization_id: organizationId,
    target_submission_id: submissionId,
    target_reason: reason,
  });
  if (error) return { status: "ERROR", reason: `cancel_trackdechets_submission: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}
