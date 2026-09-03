import "server-only";

import { safeClient } from "@/lib/data/safe-client";
import { parseSoldNotScheduledPolicy, type SoldNotScheduledPolicy } from "@/lib/value-policies/contracts";

export async function getSoldNotScheduledPolicy(organizationId: string): Promise<SoldNotScheduledPolicy> {
  const supabase = await safeClient();
  if (!supabase) return parseSoldNotScheduledPolicy(null);
  const { data, error } = await supabase
    .from("organizations")
    .select("config")
    .eq("id", organizationId)
    .maybeSingle();
  if (error) {
    console.error("[lib/data] getSoldNotScheduledPolicy:", error.message);
    return parseSoldNotScheduledPolicy(null);
  }
  return parseSoldNotScheduledPolicy(data?.config ?? null);
}

export type OpportunityOperationalState = {
  opportunityId: string;
  nextStepAt: string | null;
  nextStepKind: string | null;
  nextStepSource: string | null;
  nextStepUpdatedAt: string | null;
};

export async function getOpportunityOperationalState(
  organizationId: string,
  opportunityId: string,
): Promise<OpportunityOperationalState | null> {
  const supabase = await safeClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("get_opportunity_operational_state" as never, {
    target_organization_id: organizationId,
    target_opportunity_id: opportunityId,
  } as never);
  if (error) {
    console.error("[lib/data] getOpportunityOperationalState:", error.message);
    return null;
  }
  const raw = Array.isArray(data) ? data[0] : data;
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.opportunity_id !== "string") return null;
  return {
    opportunityId: row.opportunity_id,
    nextStepAt: typeof row.next_step_at === "string" ? row.next_step_at : null,
    nextStepKind: typeof row.next_step_kind === "string" ? row.next_step_kind : null,
    nextStepSource: typeof row.next_step_source === "string" ? row.next_step_source : null,
    nextStepUpdatedAt: typeof row.next_step_updated_at === "string" ? row.next_step_updated_at : null,
  };
}
