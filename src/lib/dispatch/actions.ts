import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

/**
 * C41 — Dispatch planning server helpers.
 *
 * Backend contract for the dispatch board. All mutations go through
 * SECURITY DEFINER RPCs — no direct table writes. Every RPC checks
 * `private.is_organization_member` server-side; the browser never sees
 * a tenant boundary decision.
 *
 * Compare-and-set : callers pass `versionExpected` and the RPC raises
 * `40001` (serialization_failure) on mismatch. We surface this as a
 * discriminated `VERSION_CONFLICT` result so the UI can prompt the user
 * to refresh their view before retrying.
 *
 * Idempotency : `assignDispatch` accepts an `idempotencyKey` — a retry
 * with the same key returns the existing row (`created=false`) and does
 * not mutate anything. The recommended key builder is
 * `dispatchAssignmentKey` in `@/lib/idempotency/keys`.
 */

interface Deps {
  client?: SupabaseClient<Database>;
}

export type DispatchStatus =
  | "DRAFT"
  | "ASSIGNED"
  | "ACKNOWLEDGED"
  | "EN_ROUTE"
  | "ARRIVED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "NEEDS_ATTENTION";

function isVersionConflict(errorMessage: string): boolean {
  return errorMessage.includes("version conflict");
}

// -------- assign_dispatch --------

export interface AssignDispatchInput {
  organizationId: string;
  interventionId: string;
  technicianUserId: string;
  vehicleId: string | null;
  scheduledStart: Date;
  scheduledEnd: Date;
  idempotencyKey?: string | null;
  versionExpected?: number | null;
}

export type AssignDispatchResult =
  | { status: "CREATED"; assignmentId: string; version: number }
  | { status: "UPDATED"; assignmentId: string; version: number }
  | { status: "REPLAYED"; assignmentId: string; version: number }
  | { status: "VERSION_CONFLICT" }
  | { status: "ERROR"; reason: string };

export async function assignDispatch(
  input: AssignDispatchInput,
  deps: Deps = {},
): Promise<AssignDispatchResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("assign_dispatch", {
    target_organization_id: input.organizationId,
    target_intervention_id: input.interventionId,
    target_technician_user_id: input.technicianUserId,
    target_vehicle_id: input.vehicleId,
    target_scheduled_start: input.scheduledStart.toISOString(),
    target_scheduled_end: input.scheduledEnd.toISOString(),
    target_idempotency_key: input.idempotencyKey ?? null,
    target_version_expected: input.versionExpected ?? null,
  });
  if (error) {
    if (isVersionConflict(error.message)) return { status: "VERSION_CONFLICT" };
    return { status: "ERROR", reason: `assign_dispatch: ${error.message}` };
  }
  const rows = (data ?? []) as Array<{
    assignment_id: string;
    version: number;
    created: boolean;
  }>;
  if (rows.length === 0) {
    return { status: "ERROR", reason: "assign_dispatch returned no rows" };
  }
  const row = rows[0];
  if (row.created) {
    return { status: "CREATED", assignmentId: row.assignment_id, version: row.version };
  }
  if (input.idempotencyKey && row.version === (input.versionExpected ?? 1)) {
    return { status: "REPLAYED", assignmentId: row.assignment_id, version: row.version };
  }
  return { status: "UPDATED", assignmentId: row.assignment_id, version: row.version };
}

// -------- acknowledge_dispatch --------

export interface AcknowledgeDispatchInput {
  organizationId: string;
  assignmentId: string;
  acknowledgedByUserId: string;
  versionExpected: number;
}

export type DispatchTransitionResult =
  | { status: "APPLIED" }
  | { status: "NOT_ELIGIBLE" }
  | { status: "VERSION_CONFLICT" }
  | { status: "ERROR"; reason: string };

export async function acknowledgeDispatch(
  input: AcknowledgeDispatchInput,
  deps: Deps = {},
): Promise<DispatchTransitionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("acknowledge_dispatch", {
    target_organization_id: input.organizationId,
    target_assignment_id: input.assignmentId,
    target_acknowledged_by_user_id: input.acknowledgedByUserId,
    target_version_expected: input.versionExpected,
  });
  if (error) {
    if (isVersionConflict(error.message)) return { status: "VERSION_CONFLICT" };
    return { status: "ERROR", reason: `acknowledge_dispatch: ${error.message}` };
  }
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

// -------- mark_en_route --------

export interface MarkEnRouteInput {
  organizationId: string;
  assignmentId: string;
  at: Date;
  versionExpected: number;
}

export async function markEnRoute(
  input: MarkEnRouteInput,
  deps: Deps = {},
): Promise<DispatchTransitionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("mark_en_route", {
    target_organization_id: input.organizationId,
    target_assignment_id: input.assignmentId,
    target_at: input.at.toISOString(),
    target_version_expected: input.versionExpected,
  });
  if (error) {
    if (isVersionConflict(error.message)) return { status: "VERSION_CONFLICT" };
    return { status: "ERROR", reason: `mark_en_route: ${error.message}` };
  }
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

// -------- release_assignment --------

export interface ReleaseAssignmentInput {
  organizationId: string;
  assignmentId: string;
  reason: string;
  versionExpected: number;
}

export async function releaseAssignment(
  input: ReleaseAssignmentInput,
  deps: Deps = {},
): Promise<DispatchTransitionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("release_assignment", {
    target_organization_id: input.organizationId,
    target_assignment_id: input.assignmentId,
    target_reason: input.reason,
    target_version_expected: input.versionExpected,
  });
  if (error) {
    if (isVersionConflict(error.message)) return { status: "VERSION_CONFLICT" };
    return { status: "ERROR", reason: `release_assignment: ${error.message}` };
  }
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

// -------- reorder_route --------

export interface ReorderRouteInput {
  organizationId: string;
  technicianUserId: string;
  day: string; // YYYY-MM-DD
  timezone: string;
  orderedAssignmentIds: string[];
}

export type ReorderRouteResult =
  | { status: "APPLIED"; updated: number }
  | { status: "ERROR"; reason: string };

export async function reorderRoute(
  input: ReorderRouteInput,
  deps: Deps = {},
): Promise<ReorderRouteResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("reorder_route", {
    target_organization_id: input.organizationId,
    target_technician_user_id: input.technicianUserId,
    target_day: input.day,
    target_timezone: input.timezone,
    target_ordered_assignment_ids: input.orderedAssignmentIds,
  });
  if (error) return { status: "ERROR", reason: `reorder_route: ${error.message}` };
  return { status: "APPLIED", updated: (data as number) ?? 0 };
}

// -------- scan_dispatch_attentions --------

export type ScanDispatchAttentionsResult =
  | { status: "APPLIED"; inserted: number }
  | { status: "ERROR"; reason: string };

export async function scanDispatchAttentions(
  organizationId: string,
  deps: Deps = {},
): Promise<ScanDispatchAttentionsResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("scan_dispatch_attentions", {
    target_organization_id: organizationId,
  });
  if (error) return { status: "ERROR", reason: `scan_dispatch_attentions: ${error.message}` };
  return { status: "APPLIED", inserted: (data as number) ?? 0 };
}
