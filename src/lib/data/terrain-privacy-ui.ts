import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

export type TerrainTrackingPolicy = {
  enabled: boolean;
  purpose: string;
  retentionDays: number;
  allowedHours: Record<string, unknown> | null;
  sessionBased: boolean;
  freshnessSeconds: number;
};

export type TerrainLastPosition = {
  capturedAt: string;
  receivedAt: string;
  source: string;
  accuracyM: number | null;
};

export type TerrainPrivacyUi = {
  policy: TerrainTrackingPolicy | null;
  lastPosition: TerrainLastPosition | null;
  available: boolean;
};

export async function getTerrainPrivacyUi(
  organizationId: string,
  userId: string,
): Promise<TerrainPrivacyUi> {
  const client = (await createClient()) as unknown as SupabaseClient;
  const [policyResult, pingResult] = await Promise.all([
    client
      .from("fleet_tracking_policies")
      .select("enabled,purpose,retention_days,allowed_hours_json,session_based,freshness_seconds")
      .eq("organization_id", organizationId)
      .maybeSingle(),
    client
      .from("fleet_location_pings")
      .select("captured_at,received_at,source,accuracy_m")
      .eq("organization_id", organizationId)
      .eq("technician_user_id", userId)
      .order("captured_at", { ascending: false })
      .limit(1),
  ]);

  if (policyResult.error && isMissingRelation(policyResult.error.message)) {
    return { policy: null, lastPosition: null, available: false };
  }

  const policy = policyResult.data ? {
    enabled: Boolean(policyResult.data.enabled),
    purpose: String(policyResult.data.purpose),
    retentionDays: Number(policyResult.data.retention_days),
    allowedHours: isObject(policyResult.data.allowed_hours_json) ? policyResult.data.allowed_hours_json as Record<string, unknown> : null,
    sessionBased: Boolean(policyResult.data.session_based),
    freshnessSeconds: Number(policyResult.data.freshness_seconds),
  } : null;

  const ping = !pingResult.error && Array.isArray(pingResult.data) ? pingResult.data[0] as Record<string, unknown> | undefined : undefined;
  const lastPosition = ping ? {
    capturedAt: String(ping.captured_at),
    receivedAt: String(ping.received_at),
    source: String(ping.source),
    accuracyM: ping.accuracy_m === null ? null : Number(ping.accuracy_m),
  } : null;

  return { policy, lastPosition, available: true };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isMissingRelation(message: string) {
  return /fleet_tracking_policies|does not exist|schema cache/i.test(message);
}
