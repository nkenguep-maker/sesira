import "server-only";

import { safeClient } from "@/lib/data/safe-client";
import type { Json } from "@/types/database";

/**
 * C49 — Dashboard snapshot read helper.
 *
 * Wraps the `get_dashboard_snapshot(org, role, timezone)` RPC. The
 * server component MUST pass a role ∈ (viewer|admin|owner) and an
 * explicit IANA timezone. UI renders sections as-is; wording gates
 * (never "qualifié" etc.) live in the presentational layer.
 */

export type DashboardRole = "viewer" | "admin" | "owner";

export interface DashboardSnapshot {
  organizationId: string;
  role: DashboardRole;
  timezone: string;
  dayStartUtc: string;
  dayEndUtc: string;
  statusBar: Record<string, unknown>;
  decisions: Array<Record<string, unknown>>;
  money: Record<string, Record<string, unknown>>;
  fieldToday: Record<string, unknown>;
  regulatory: Record<string, unknown>;
  providerStates: Record<string, unknown>;
}

export async function getDashboardSnapshot(
  organizationId: string,
  role: DashboardRole,
  timezone: string,
): Promise<DashboardSnapshot | null> {
  const supabase = await safeClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("get_dashboard_snapshot", {
    target_organization_id: organizationId,
    target_role: role,
    target_timezone: timezone,
  });
  if (error) {
    console.error("[lib/data] getDashboardSnapshot:", error.message);
    return null;
  }
  const payload = (data ?? null) as Json | null;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const p = payload as Record<string, unknown>;
  return {
    organizationId: String(p.organization_id ?? organizationId),
    role: (p.role as DashboardRole) ?? role,
    timezone: String(p.timezone ?? timezone),
    dayStartUtc: String(p.day_start_utc ?? ""),
    dayEndUtc: String(p.day_end_utc ?? ""),
    statusBar: (p.status_bar as Record<string, unknown>) ?? {},
    decisions: (p.decisions as Array<Record<string, unknown>>) ?? [],
    money: (p.money as Record<string, Record<string, unknown>>) ?? {},
    fieldToday: (p.field_today as Record<string, unknown>) ?? {},
    regulatory: (p.regulatory as Record<string, unknown>) ?? {},
    providerStates: (p.provider_states as Record<string, unknown>) ?? {},
  };
}
