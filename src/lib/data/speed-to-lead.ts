import "server-only";

import { safeClient } from "@/lib/data/safe-client";
import { parseSpeedToLeadPolicy, parseSpeedToLeadSummary, type SpeedToLeadPolicy, type SpeedToLeadSummary } from "@/lib/speed-to-lead/contracts";

export async function getSpeedToLeadPolicy(organizationId: string): Promise<SpeedToLeadPolicy> {
  const supabase = await safeClient();
  if (!supabase) return parseSpeedToLeadPolicy(null);
  const { data, error } = await supabase
    .from("organizations")
    .select("config")
    .eq("id", organizationId)
    .maybeSingle();
  if (error) {
    console.error("[lib/data] getSpeedToLeadPolicy:", error.message);
    return parseSpeedToLeadPolicy(null);
  }
  return parseSpeedToLeadPolicy(data?.config ?? null);
}

export async function getSpeedToLeadSummary(organizationId: string): Promise<SpeedToLeadSummary | null> {
  const supabase = await safeClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("get_speed_to_lead_summary" as never, {
    target_organization_id: organizationId,
  } as never);
  if (error) {
    console.error("[lib/data] getSpeedToLeadSummary:", error.message);
    return null;
  }
  return parseSpeedToLeadSummary(data);
}
