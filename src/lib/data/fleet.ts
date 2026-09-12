import "server-only";

import { safeClient } from "@/lib/data/safe-client";

/**
 * C42 — Fleet telemetry read models.
 *
 * getLatestVehiclePositions: one row per ACTIVE vehicle of the org,
 * with the latest ping data (or nulls if no ping recorded), plus a
 * server-computed `age_seconds` and `is_fresh` flag using the org's
 * `freshness_seconds` policy.
 *
 * getDispatchEtaSnapshot: exposes the LATEST fleet_route_estimate row
 * for a given dispatch_assignment. status is passed through as-is —
 * UNAVAILABLE / FAILED must be rendered honestly by the UI.
 */

export type FleetEstimateStatus = "READY" | "UNAVAILABLE" | "FAILED" | "STALE";
export type FleetProviderKind =
  | "TEST"
  | "PENDING_PRODUCTION"
  | "GOOGLE"
  | "HERE"
  | "MAPBOX"
  | "OSRM"
  | "OTHER";

export interface LatestVehiclePositionRow {
  vehicleId: string;
  vehicleLabel: string;
  latestPingId: string | null;
  capturedAt: string | null;
  receivedAt: string | null;
  latitude: number | null;
  longitude: number | null;
  speedKph: number | null;
  heading: number | null;
  ageSeconds: number | null;
  isFresh: boolean;
}

export async function getLatestVehiclePositions(
  organizationId: string,
): Promise<LatestVehiclePositionRow[]> {
  const supabase = await safeClient();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("latest_vehicle_positions", {
    target_organization_id: organizationId,
  });
  if (error) {
    console.error("[lib/data] getLatestVehiclePositions:", error.message);
    return [];
  }
  const rows = (data ?? []) as Array<{
    vehicle_id: string;
    vehicle_label: string;
    latest_ping_id: string | null;
    captured_at: string | null;
    received_at: string | null;
    latitude: number | null;
    longitude: number | null;
    speed_kph: number | null;
    heading: number | null;
    age_seconds: number | null;
    is_fresh: boolean;
  }>;
  return rows.map((r) => ({
    vehicleId: r.vehicle_id,
    vehicleLabel: r.vehicle_label,
    latestPingId: r.latest_ping_id,
    capturedAt: r.captured_at,
    receivedAt: r.received_at,
    latitude: r.latitude,
    longitude: r.longitude,
    speedKph: r.speed_kph,
    heading: r.heading,
    ageSeconds: r.age_seconds,
    isFresh: r.is_fresh,
  }));
}

export interface DispatchEtaSnapshot {
  estimateId: string;
  status: FleetEstimateStatus;
  providerKind: FleetProviderKind;
  distanceMeters: number | null;
  durationSeconds: number | null;
  calculatedAt: string;
  failureReason: string | null;
}

export async function getDispatchEtaSnapshot(
  organizationId: string,
  dispatchAssignmentId: string,
): Promise<DispatchEtaSnapshot | null> {
  const supabase = await safeClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("dispatch_eta_snapshot", {
    target_organization_id: organizationId,
    target_dispatch_assignment_id: dispatchAssignmentId,
  });
  if (error) {
    console.error("[lib/data] getDispatchEtaSnapshot:", error.message);
    return null;
  }
  const rows = (data ?? []) as Array<{
    estimate_id: string;
    status: string;
    provider_kind: string;
    distance_m: number | null;
    duration_seconds: number | null;
    calculated_at: string;
    failure_reason: string | null;
  }>;
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    estimateId: r.estimate_id,
    status: r.status as FleetEstimateStatus,
    providerKind: r.provider_kind as FleetProviderKind,
    distanceMeters: r.distance_m,
    durationSeconds: r.duration_seconds,
    calculatedAt: r.calculated_at,
    failureReason: r.failure_reason,
  };
}
