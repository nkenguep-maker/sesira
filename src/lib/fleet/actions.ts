import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/database";

import type {
  Coordinate,
  RoutingEstimate,
  RoutingProvider,
  RoutingProviderKind,
} from "./routing/provider";

/**
 * C42 — Fleet telemetry server helpers.
 *
 * Server-only wrappers for the C42 RPCs. Provider seam
 * (`RoutingProvider`) is invoked from `computeAndRecordRouteEstimate`
 * which then persists the outcome as-is via `record_fleet_route_estimate`
 * — never coerces UNAVAILABLE/FAILED into READY.
 */

interface Deps {
  client?: SupabaseClient<Database>;
}

// -------- configure_fleet_tracking_policy --------

export interface ConfigureFleetTrackingPolicyInput {
  organizationId: string;
  enabled: boolean;
  purpose: string;
  retentionDays: number;
  allowedHours?: Json | null;
  sessionBased: boolean;
  freshnessSeconds: number;
}

export type ConfigureFleetTrackingPolicyResult =
  | { status: "APPLIED"; policyId: string }
  | { status: "ERROR"; reason: string };

export async function configureFleetTrackingPolicy(
  input: ConfigureFleetTrackingPolicyInput,
  deps: Deps = {},
): Promise<ConfigureFleetTrackingPolicyResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("configure_fleet_tracking_policy", {
    target_organization_id: input.organizationId,
    target_enabled: input.enabled,
    target_purpose: input.purpose,
    target_retention_days: input.retentionDays,
    target_allowed_hours: (input.allowedHours ?? null) as Json,
    target_session_based: input.sessionBased,
    target_freshness_seconds: input.freshnessSeconds,
  });
  if (error) return { status: "ERROR", reason: `configure_fleet_tracking_policy: ${error.message}` };
  return { status: "APPLIED", policyId: data as string };
}

// -------- record_fleet_location_ping --------

export interface RecordFleetLocationPingInput {
  organizationId: string;
  vehicleId: string;
  technicianUserId: string | null;
  dispatchAssignmentId: string | null;
  capturedAt: Date;
  latitude: number;
  longitude: number;
  accuracyMeters?: number | null;
  speedKph?: number | null;
  heading?: number | null;
  source: "MOBILE_APP" | "HARDWARE_TRACKER" | "PROVIDER_WEBHOOK" | "MANUAL_IMPORT";
  providerRef?: string | null;
  deviceRef?: string | null;
  offlineClientId?: string | null;
}

export type RecordFleetLocationPingResult =
  | { status: "CREATED"; pingId: string }
  | { status: "REPLAYED"; pingId: string }
  | { status: "ERROR"; reason: string };

export async function recordFleetLocationPing(
  input: RecordFleetLocationPingInput,
  deps: Deps = {},
): Promise<RecordFleetLocationPingResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("record_fleet_location_ping", {
    target_organization_id: input.organizationId,
    target_vehicle_id: input.vehicleId,
    target_technician_user_id: input.technicianUserId,
    target_dispatch_assignment_id: input.dispatchAssignmentId,
    target_captured_at: input.capturedAt.toISOString(),
    target_latitude: input.latitude,
    target_longitude: input.longitude,
    target_accuracy_m: input.accuracyMeters ?? null,
    target_speed_kph: input.speedKph ?? null,
    target_heading: input.heading ?? null,
    target_source: input.source,
    target_provider_ref: input.providerRef ?? null,
    target_device_ref: input.deviceRef ?? null,
    target_offline_client_id: input.offlineClientId ?? null,
  });
  if (error) return { status: "ERROR", reason: `record_fleet_location_ping: ${error.message}` };
  const rows = (data ?? []) as Array<{ ping_id: string; created: boolean }>;
  if (rows.length === 0) return { status: "ERROR", reason: "record_fleet_location_ping returned no rows" };
  const r = rows[0];
  return r.created ? { status: "CREATED", pingId: r.ping_id } : { status: "REPLAYED", pingId: r.ping_id };
}

// -------- record_fleet_route_estimate --------

export interface RecordFleetRouteEstimateInput {
  organizationId: string;
  dispatchAssignmentId: string;
  providerKind: RoutingProviderKind;
  providerRef?: string | null;
  estimate: RoutingEstimate;
}

export type RecordFleetRouteEstimateResult =
  | { status: "APPLIED"; estimateId: string }
  | { status: "ERROR"; reason: string };

export async function recordFleetRouteEstimate(
  input: RecordFleetRouteEstimateInput,
  deps: Deps = {},
): Promise<RecordFleetRouteEstimateResult> {
  const supabase = deps.client ?? (await createClient());
  const est = input.estimate;
  const args =
    est.status === "READY"
      ? {
          target_status: "READY" as const,
          target_distance_m: est.distanceMeters,
          target_duration_seconds: est.durationSeconds,
          target_failure_reason: null,
        }
      : est.status === "UNAVAILABLE"
        ? {
            target_status: "UNAVAILABLE" as const,
            target_distance_m: null,
            target_duration_seconds: null,
            target_failure_reason: est.reason ?? null,
          }
        : {
            target_status: "FAILED" as const,
            target_distance_m: null,
            target_duration_seconds: null,
            target_failure_reason: est.reason,
          };
  const { data, error } = await supabase.rpc("record_fleet_route_estimate", {
    target_organization_id: input.organizationId,
    target_dispatch_assignment_id: input.dispatchAssignmentId,
    target_provider_kind: input.providerKind,
    target_provider_ref: input.providerRef ?? null,
    ...args,
  });
  if (error) return { status: "ERROR", reason: `record_fleet_route_estimate: ${error.message}` };
  return { status: "APPLIED", estimateId: data as string };
}

/**
 * Convenience: invoke a RoutingProvider then persist the outcome as-is.
 * The RPC accepts all three status kinds — READY / UNAVAILABLE / FAILED —
 * so the audit trail records provider behaviour honestly.
 */
export async function computeAndRecordRouteEstimate(
  input: {
    organizationId: string;
    dispatchAssignmentId: string;
    from: Coordinate;
    to: Coordinate;
    providerRef?: string | null;
  },
  provider: RoutingProvider,
  deps: Deps = {},
): Promise<RecordFleetRouteEstimateResult> {
  const estimate = await provider.estimateRoute(input.from, input.to);
  return recordFleetRouteEstimate(
    {
      organizationId: input.organizationId,
      dispatchAssignmentId: input.dispatchAssignmentId,
      providerKind: provider.kind,
      providerRef: input.providerRef,
      estimate,
    },
    deps,
  );
}

// -------- purge_expired_fleet_pings --------

export type PurgeFleetPingsResult =
  | { status: "APPLIED"; deleted: number }
  | { status: "ERROR"; reason: string };

export async function purgeExpiredFleetPings(
  organizationId: string,
  deps: Deps = {},
): Promise<PurgeFleetPingsResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("purge_expired_fleet_pings", {
    target_organization_id: organizationId,
  });
  if (error) return { status: "ERROR", reason: `purge_expired_fleet_pings: ${error.message}` };
  return { status: "APPLIED", deleted: (data as number) ?? 0 };
}

// -------- scan_fleet_telemetry_attentions --------

export type ScanFleetTelemetryAttentionsResult =
  | { status: "APPLIED"; inserted: number }
  | { status: "ERROR"; reason: string };

export async function scanFleetTelemetryAttentions(
  organizationId: string,
  deps: Deps = {},
): Promise<ScanFleetTelemetryAttentionsResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("scan_fleet_telemetry_attentions", {
    target_organization_id: organizationId,
  });
  if (error) return { status: "ERROR", reason: `scan_fleet_telemetry_attentions: ${error.message}` };
  return { status: "APPLIED", inserted: (data as number) ?? 0 };
}
