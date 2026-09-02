import "server-only";

import { safeClient } from "@/lib/data/safe-client";

/**
 * C23 — dormant-opportunity read model for the reactivation
 * workflow. Shadow-first: never transitions anything; the operator
 * (or a future scheduler) reads the list and decides.
 */

export type ReactivationCandidateRow = {
  opportunityId: string;
  customerId: string;
  commercialState: string;
  estimatedValue: number | null;
  currency: string;
  openedAt: string;
  lastActivityAt: string;
  dormantDays: number;
};

export async function getReactivationCandidates(
  organizationId: string,
  options: { dormantSinceDays?: number } = {},
): Promise<ReactivationCandidateRow[]> {
  const dormantSinceDays = Math.max(1, Math.min(options.dormantSinceDays ?? 60, 365));
  const supabase = await safeClient();
  if (!supabase) return [];

  const { data, error } = await supabase.rpc("dormant_opportunities", {
    target_organization_id: organizationId,
    target_dormant_since_days: dormantSinceDays,
  });
  if (error) {
    console.error("[lib/data] getReactivationCandidates:", error.message);
    return [];
  }
  return (data ?? []).map((row) => ({
    opportunityId: row.opportunity_id as string,
    customerId: row.customer_id as string,
    commercialState: row.commercial_state as string,
    estimatedValue: (row.estimated_value as number | null) ?? null,
    currency: row.currency as string,
    openedAt: row.opened_at as string,
    lastActivityAt: row.last_activity_at as string,
    dormantDays: Number(row.dormant_days),
  }));
}
