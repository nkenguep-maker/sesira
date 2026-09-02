import "server-only";

import { safeClient } from "@/lib/data/safe-client";

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
  const dormantSinceDays = Math.max(1, Math.min(Math.trunc(options.dormantSinceDays ?? 60), 365));
  const supabase = await safeClient();
  if (!supabase) return [];

  const { data, error } = await supabase.rpc("dormant_opportunities" as never, {
    target_organization_id: organizationId,
    target_dormant_since_days: dormantSinceDays,
  } as never);
  if (error) {
    console.error("[lib/data] getReactivationCandidates:", error.message);
    return [];
  }

  const rows = Array.isArray(data) ? data : [];
  return rows.flatMap((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return [];
    const row = value as Record<string, unknown>;
    if (
      typeof row.opportunity_id !== "string" ||
      typeof row.customer_id !== "string" ||
      typeof row.commercial_state !== "string" ||
      typeof row.currency !== "string" ||
      typeof row.opened_at !== "string" ||
      typeof row.last_activity_at !== "string"
    ) return [];
    const dormantDays = Number(row.dormant_days);
    if (!Number.isFinite(dormantDays) || dormantDays < 0) return [];
    return [{
      opportunityId: row.opportunity_id,
      customerId: row.customer_id,
      commercialState: row.commercial_state,
      estimatedValue: row.estimated_value === null || row.estimated_value === undefined ? null : Number(row.estimated_value),
      currency: row.currency,
      openedAt: row.opened_at,
      lastActivityAt: row.last_activity_at,
      dormantDays: Math.trunc(dormantDays),
    }];
  });
}
