import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { FieldConflictRow } from "@/lib/data/c40-ui";

type ReadResult<T> = { status: "OK"; data: T } | { status: "ERROR"; reason: string };

export async function getFieldConflicts(organizationId: string): Promise<ReadResult<FieldConflictRow[]>> {
  const client = (await createClient()) as unknown as SupabaseClient;
  const result = await client.rpc("pending_field_artifact_conflicts", {
    target_organization_id: organizationId,
  });
  if (result.error) return { status: "ERROR", reason: result.error.message };
  const rows = Array.isArray(result.data) ? result.data as Array<Record<string, unknown>> : [];
  return {
    status: "OK",
    data: rows.map((row) => ({
      artifactId: String(row.artifact_id),
      interventionId: String(row.intervention_id),
      artifactKind: String(row.artifact_kind),
      capturedAt: String(row.captured_at),
      conflictReason: typeof row.conflict_reason === "string" ? row.conflict_reason : null,
      uploadedAt: String(row.uploaded_at),
    })),
  };
}
