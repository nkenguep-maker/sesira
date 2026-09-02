import "server-only";

import { safeClient } from "@/lib/data/safe-client";

/**
 * V1 Attention read models.
 *
 * All getters take `organizationId` explicitly — the caller
 * (server component / server action) MUST derive it from
 * `getViewerContext()` and never from a URL / FormData / query
 * param. RLS is authoritative but the seam still filters
 * server-side by `organizationId` so an outer bug that leaked a
 * viewer with the wrong org would not silently succeed.
 */

export type AttentionInboxRow = {
  id: string;
  category: string;
  reason: string;
  priority: string;
  title: string;
  explanation: string | null;
  suggestedAction: string | null;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
  assignedUserId: string | null;
  metadata: Record<string, unknown>;
};

/**
 * Open / in-progress Attention items for an org, ordered by
 * priority (URGENT > HIGH > NORMAL > LOW) then by age (oldest
 * first). Bounded by `limit`.
 */
export async function getAttentionInbox(
  organizationId: string,
  options: { limit?: number } = {},
): Promise<AttentionInboxRow[]> {
  const supabase = await safeClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("attention_items")
    .select(
      "id, category, reason, priority, title, explanation, suggested_action, entity_type, entity_id, created_at, assigned_user_id, metadata",
    )
    .eq("organization_id", organizationId)
    .in("status", ["OPEN", "IN_PROGRESS"])
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(Math.min(options.limit ?? 100, 500));
  if (error) {
    console.error("[lib/data] getAttentionInbox:", error.message);
    return [];
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    category: row.category,
    reason: row.reason,
    priority: row.priority,
    title: row.title,
    explanation: row.explanation,
    suggestedAction: row.suggested_action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    createdAt: row.created_at,
    assignedUserId: row.assigned_user_id,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  }));
}

export type AttentionCountsByPriority = {
  URGENT: number;
  HIGH: number;
  NORMAL: number;
  LOW: number;
  total: number;
};

/**
 * Counts of open Attention items grouped by priority. Used by the
 * top-nav badge and the ops summary. Missing priorities default to
 * 0 (a caller can render a full grid without a lookup guard).
 */
export async function getAttentionCountsByPriority(
  organizationId: string,
): Promise<AttentionCountsByPriority> {
  const empty: AttentionCountsByPriority = { URGENT: 0, HIGH: 0, NORMAL: 0, LOW: 0, total: 0 };
  const supabase = await safeClient();
  if (!supabase) return empty;
  const { data, error } = await supabase
    .from("attention_items")
    .select("priority")
    .eq("organization_id", organizationId)
    .in("status", ["OPEN", "IN_PROGRESS"]);
  if (error) {
    console.error("[lib/data] getAttentionCountsByPriority:", error.message);
    return empty;
  }
  const counts: AttentionCountsByPriority = { ...empty };
  for (const row of data ?? []) {
    const p = row.priority as keyof AttentionCountsByPriority;
    if (p in counts && p !== "total") counts[p] += 1;
    counts.total += 1;
  }
  return counts;
}
