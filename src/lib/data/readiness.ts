import "server-only";

import { safeClient } from "@/lib/data/safe-client";

/**
 * V1 readiness reads. An operator opening the app on day 1 needs an
 * honest answer to two questions:
 *
 *   * "Is my email connected?" — an `integrations` row with
 *     type='email' AND status='CONNECTED' AND
 *     expires_at IS NULL OR expires_at > now.
 *   * "Is at least one automation ready to fire?" — an
 *     `automation_configs` row with enabled=true AND level in
 *     ('SHADOW', 'APPROVAL', 'AUTOMATIC'). OBSERVATION does not
 *     count — the org is watching, not acting.
 *
 * Both getters yield a discriminated union so the UI can render a
 * concrete next step (connect email / enable an automation) instead
 * of a generic "not ready" empty state.
 */

export type EmailConnectionReadiness =
  | { status: "READY"; provider: string; connectedAt: string }
  | { status: "NOT_CONNECTED" }
  | { status: "EXPIRED"; provider: string; expiresAt: string }
  | { status: "DEGRADED"; provider: string; note: string };

export async function getEmailConnectionReadiness(
  organizationId: string,
): Promise<EmailConnectionReadiness> {
  const supabase = await safeClient();
  if (!supabase) return { status: "NOT_CONNECTED" };
  const { data, error } = await supabase
    .from("integrations")
    .select("provider, status, connected_at, expires_at, error")
    .eq("organization_id", organizationId)
    .ilike("type", "email")
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[lib/data] getEmailConnectionReadiness:", error.message);
    return { status: "NOT_CONNECTED" };
  }
  const row = data as {
    provider: string;
    status: string;
    connected_at: string | null;
    expires_at: string | null;
    error: string | null;
  } | null;
  if (!row) return { status: "NOT_CONNECTED" };
  if (row.status === "EXPIRED") {
    return { status: "EXPIRED", provider: row.provider, expiresAt: row.expires_at ?? "" };
  }
  if (row.status === "DEGRADED" || row.status === "FAILED") {
    return { status: "DEGRADED", provider: row.provider, note: row.error ?? "no detail" };
  }
  if (row.status === "CONNECTED") {
    return { status: "READY", provider: row.provider, connectedAt: row.connected_at ?? "" };
  }
  return { status: "NOT_CONNECTED" };
}

export type AutomationReadiness = {
  configuredCount: number;
  actionableCount: number;
  observationOnlyCount: number;
  disabledCount: number;
};

const AUTOMATION_EMPTY: AutomationReadiness = {
  configuredCount: 0,
  actionableCount: 0,
  observationOnlyCount: 0,
  disabledCount: 0,
};

export async function getAutomationReadiness(
  organizationId: string,
): Promise<AutomationReadiness> {
  const supabase = await safeClient();
  if (!supabase) return { ...AUTOMATION_EMPTY };
  const { data, error } = await supabase
    .from("automation_configs")
    .select("enabled, level")
    .eq("organization_id", organizationId);
  if (error) {
    console.error("[lib/data] getAutomationReadiness:", error.message);
    return { ...AUTOMATION_EMPTY };
  }
  const summary = { ...AUTOMATION_EMPTY };
  for (const row of data ?? []) {
    summary.configuredCount += 1;
    if (!row.enabled) {
      summary.disabledCount += 1;
      continue;
    }
    if (row.level === "OBSERVATION") {
      summary.observationOnlyCount += 1;
      continue;
    }
    if (row.level === "SHADOW" || row.level === "APPROVAL" || row.level === "AUTOMATIC") {
      summary.actionableCount += 1;
    }
  }
  return summary;
}
