import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

/**
 * SESIRA incident writer — thin wrapper around `record_incident_once`.
 *
 * Fingerprint format: `{sourceKind}:{entityType}:{entityId}:{errorClass}`.
 * Two occurrences with the same tuple collapse to one OPEN incident;
 * the RPC bumps recurrence_count and last_seen_at.
 *
 * `severity` is a business decision — the caller chooses P1..P4 based
 * on the surface (a payment failure is P1; a Shadow proposal failure
 * is P3). The classifier does NOT assign severity.
 */

export type IncidentSeverity = "P1" | "P2" | "P3" | "P4";

const FINGERPRINT_MAX = 300;

export function incidentFingerprint(
  sourceKind: string,
  entityType: string,
  entityId: string,
  errorClass: string,
): string {
  const parts = [sourceKind, entityType, entityId, errorClass];
  for (const part of parts) {
    if (typeof part !== "string" || part.length === 0) {
      throw new RangeError(
        `incidentFingerprint: all four parts must be non-empty strings (got ${JSON.stringify(parts)})`,
      );
    }
  }
  const combined = parts.join(":");
  if (combined.length > FINGERPRINT_MAX) {
    throw new RangeError(
      `incidentFingerprint: combined key exceeds ${FINGERPRINT_MAX} chars (${combined.length})`,
    );
  }
  return combined;
}

export interface RecordIncidentOnceInput {
  organizationId: string;
  fingerprint: string;
  severity: IncidentSeverity;
  category: string;
  title: string;
  description?: string | null;
  entity?: { type: string; id: string } | null;
  metadata?: Record<string, unknown> | null;
  client?: SupabaseClient<Database>;
}

export interface RecordIncidentOnceResult {
  id: string;
  created: boolean;
  recurrenceCount: number;
}

interface RpcRow {
  id: string;
  created: boolean;
  recurrence_count: number;
}

export async function recordIncidentOnce(
  input: RecordIncidentOnceInput,
): Promise<RecordIncidentOnceResult> {
  const supabase = input.client ?? (await createClient());
  const { data, error } = await supabase.rpc("record_incident_once", {
    target_organization_id: input.organizationId,
    target_fingerprint: input.fingerprint,
    target_severity: input.severity,
    target_category: input.category,
    target_title: input.title,
    target_description: input.description ?? null,
    target_entity_type: input.entity?.type ?? null,
    target_entity_id: input.entity?.id ?? null,
    target_metadata: (input.metadata ?? {}) as never,
  });
  if (error) throw new Error(`recordIncidentOnce: ${error.message}`);
  const row = Array.isArray(data) ? (data[0] as RpcRow | undefined) : (data as RpcRow | null);
  if (!row || typeof row.id !== "string" || typeof row.created !== "boolean") {
    throw new Error("recordIncidentOnce: RPC returned no row");
  }
  return { id: row.id, created: row.created, recurrenceCount: row.recurrence_count };
}
