import "server-only";

import { getOpenCommercialSignals as readOpen } from "@/lib/commercial-signals/read";
import type { OpenCommercialSignalRow } from "@/lib/commercial-signals/schema";

/**
 * Data-layer re-export for the attention feed. Kept as a thin passthrough
 * so page/component code never imports `@/lib/commercial-signals/*`
 * directly — it stays behind the `@/lib/data` seam (see
 * `~/.claude/rules/supabase-security.md` §4).
 */
export type { OpenCommercialSignalRow };

export async function getOpenCommercialSignals(
  organizationId: string,
): Promise<OpenCommercialSignalRow[]> {
  return readOpen(organizationId);
}
