import "server-only";

import { safeClient } from "@/lib/data/safe-client";

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

export async function getAttentionInbox(
  organizationId: string,
  options: { limit?: number } = {},
): Promise<AttentionInboxRow[]> {
  const supabase = await safeClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("attention_items")
    .select("id, category, reason, priority, title, explanation, suggested_action, entity_type, entity_id, created_at, assigned_user_id, due_at, metadata")
    .eq("organization_id", organizationId)
    .in("status", ["OPEN", "IN_PROGRESS"])
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(Math.min(options.limit ?? 100, 500));
  if (error) {
    console.error("[lib/data] getAttentionInbox:", error.message);
    return [];
  }
  const now = Date.now();
  return (data ?? [])
    .filter((row) => !row.due_at || Number.isNaN(new Date(row.due_at).getTime()) || new Date(row.due_at).getTime() <= now)
    .map((row) => ({
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

export async function getAttentionCountsByPriority(
  organizationId: string,
): Promise<AttentionCountsByPriority> {
  const empty: AttentionCountsByPriority = { URGENT: 0, HIGH: 0, NORMAL: 0, LOW: 0, total: 0 };
  const supabase = await safeClient();
  if (!supabase) return empty;
  const { data, error } = await supabase
    .from("attention_items")
    .select("priority, due_at")
    .eq("organization_id", organizationId)
    .in("status", ["OPEN", "IN_PROGRESS"]);
  if (error) {
    console.error("[lib/data] getAttentionCountsByPriority:", error.message);
    return empty;
  }
  const now = Date.now();
  const counts: AttentionCountsByPriority = { ...empty };
  for (const row of data ?? []) {
    if (row.due_at && !Number.isNaN(new Date(row.due_at).getTime()) && new Date(row.due_at).getTime() > now) continue;
    const p = row.priority as keyof AttentionCountsByPriority;
    if (p in counts && p !== "total") counts[p] += 1;
    counts.total += 1;
  }
  return counts;
}
