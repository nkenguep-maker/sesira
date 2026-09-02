import "server-only";

import { quoteDraftGapsSchema, type QuoteDraftGap } from "@/lib/drafting/schema";
import { safeClient } from "@/lib/data/safe-client";

export type QuoteDraftReadinessRow = {
  quoteId: string;
  analyzedAt: string | null;
  gapCount: number;
  gaps: QuoteDraftGap[];
  sendEligible: boolean;
};

export async function getQuoteDraftReadiness(organizationId: string): Promise<QuoteDraftReadinessRow[]> {
  const supabase = await safeClient();
  if (!supabase) return [];

  const { data, error } = await supabase.rpc("get_quote_draft_readiness" as never, {
    target_organization_id: organizationId,
  } as never);
  if (error) {
    console.error("[lib/data] getQuoteDraftReadiness:", error.message);
    return [];
  }

  const rows = Array.isArray(data) ? data : [];
  return rows.flatMap((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return [];
    const row = value as Record<string, unknown>;
    if (typeof row.quote_id !== "string" || typeof row.gap_count !== "number" || typeof row.send_eligible !== "boolean") return [];
    const parsedGaps = quoteDraftGapsSchema.safeParse(row.gaps);
    if (!parsedGaps.success) return [];
    return [{
      quoteId: row.quote_id,
      analyzedAt: typeof row.analyzed_at === "string" ? row.analyzed_at : null,
      gapCount: row.gap_count,
      gaps: parsedGaps.data,
      sendEligible: row.send_eligible,
    }];
  });
}
