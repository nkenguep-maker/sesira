import "server-only";

import { safeClient } from "@/lib/data/safe-client";

/**
 * C41 — Dispatch board read model.
 *
 * getTeamDispatchDay: one call powers the dispatch board for a given
 * day (grouped by technician, ordered by route position). Timezone is
 * mandatory — the server derives the day window via `AT TIME ZONE`,
 * never assumes UTC.
 *
 * getDispatchConflicts: safety-net scanner over the next N days.
 * Returns rows for TECH_DOUBLE_BOOKING, VEHICLE_DOUBLE_BOOKING,
 * INACTIVE_TECHNICIAN, AVAILABILITY_BLOCKED. The dispatch board renders
 * these as inline warnings; the Today engine emits attention items via
 * scan_dispatch_attentions.
 */

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

export type DispatchConflictKind =
  | "TECH_DOUBLE_BOOKING"
  | "VEHICLE_DOUBLE_BOOKING"
  | "INACTIVE_TECHNICIAN"
  | "AVAILABILITY_BLOCKED";

export interface TeamDispatchDayRow {
  technicianUserId: string;
  assignmentId: string;
  interventionId: string;
  vehicleId: string | null;
  dispatchStatus: DispatchStatus;
  scheduledStart: string;
  scheduledEnd: string;
  routeOrder: number | null;
  version: number;
  interventionTitle: string;
  interventionStatus: string;
  customerId: string;
  customerDisplayName: string | null;
  addressLine1: string | null;
  addressCity: string | null;
}

export async function getTeamDispatchDay(
  organizationId: string,
  day: string,
  timezone: string,
): Promise<TeamDispatchDayRow[]> {
  const supabase = await safeClient();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("get_team_dispatch_day", {
    target_organization_id: organizationId,
    target_day: day,
    target_timezone: timezone,
  });
  if (error) {
    console.error("[lib/data] getTeamDispatchDay:", error.message);
    return [];
  }
  const rows = (data ?? []) as Array<{
    technician_user_id: string;
    assignment_id: string;
    intervention_id: string;
    vehicle_id: string | null;
    dispatch_status: string;
    scheduled_start: string;
    scheduled_end: string;
    route_order: number | null;
    version: number;
    intervention_title: string;
    intervention_status: string;
    customer_id: string;
    customer_display_name: string | null;
    address_line1: string | null;
    address_city: string | null;
  }>;
  return rows.map((r) => ({
    technicianUserId: r.technician_user_id,
    assignmentId: r.assignment_id,
    interventionId: r.intervention_id,
    vehicleId: r.vehicle_id,
    dispatchStatus: r.dispatch_status as DispatchStatus,
    scheduledStart: r.scheduled_start,
    scheduledEnd: r.scheduled_end,
    routeOrder: r.route_order,
    version: r.version,
    interventionTitle: r.intervention_title,
    interventionStatus: r.intervention_status,
    customerId: r.customer_id,
    customerDisplayName: r.customer_display_name,
    addressLine1: r.address_line1,
    addressCity: r.address_city,
  }));
}

export interface DispatchConflictRow {
  conflictKind: DispatchConflictKind;
  technicianUserId: string | null;
  vehicleId: string | null;
  assignmentIdA: string;
  assignmentIdB: string | null;
  detail: string;
}

export async function getDispatchConflicts(
  organizationId: string,
  horizonDays = 7,
): Promise<DispatchConflictRow[]> {
  const supabase = await safeClient();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("get_dispatch_conflicts", {
    target_organization_id: organizationId,
    target_horizon_days: horizonDays,
  });
  if (error) {
    console.error("[lib/data] getDispatchConflicts:", error.message);
    return [];
  }
  const rows = (data ?? []) as Array<{
    conflict_kind: string;
    technician_user_id: string | null;
    vehicle_id: string | null;
    assignment_id_a: string;
    assignment_id_b: string | null;
    detail: string;
  }>;
  return rows.map((r) => ({
    conflictKind: r.conflict_kind as DispatchConflictKind,
    technicianUserId: r.technician_user_id,
    vehicleId: r.vehicle_id,
    assignmentIdA: r.assignment_id_a,
    assignmentIdB: r.assignment_id_b,
    detail: r.detail,
  }));
}
