import "server-only";

import { safeClient } from "@/lib/data/safe-client";

/**
 * V1 incidents feed. Returns OPEN / INVESTIGATING incidents for
 * the ops surface.
 */

export type OpenIncidentRow = {
  id: string;
  fingerprint: string;
  severity: string;
  category: string;
  title: string;
  description: string | null;
  entityType: string | null;
  entityId: string | null;
  recurrenceCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  status: string;
};

export async function getOpenIncidents(
  organizationId: string,
  options: { limit?: number } = {},
): Promise<OpenIncidentRow[]> {
  const supabase = await safeClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("incidents")
    .select(
      "id, fingerprint, severity, category, title, description, entity_type, entity_id, recurrence_count, first_seen_at, last_seen_at, status",
    )
    .eq("organization_id", organizationId)
    .in("status", ["OPEN", "INVESTIGATING"])
    .order("last_seen_at", { ascending: false })
    .limit(Math.min(options.limit ?? 50, 200));
  if (error) {
    console.error("[lib/data] getOpenIncidents:", error.message);
    return [];
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    fingerprint: row.fingerprint,
    severity: row.severity,
    category: row.category,
    title: row.title,
    description: row.description,
    entityType: row.entity_type,
    entityId: row.entity_id,
    recurrenceCount: row.recurrence_count,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    status: row.status,
  }));
}
