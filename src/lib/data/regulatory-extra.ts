import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

export type PendingCerfaUiRow = {
  interventionId: string;
  title: string;
  completedAt: string | null;
  customerId: string;
};

export async function getPendingCerfaInterventions(organizationId: string) {
  const client = (await createClient()) as unknown as SupabaseClient;
  const result = await client.rpc("pending_cerfa_interventions", {
    target_organization_id: organizationId,
  });
  if (result.error) return { status: "ERROR" as const, reason: result.error.message, rows: [] as PendingCerfaUiRow[] };
  const raw = Array.isArray(result.data) ? result.data as Array<Record<string, unknown>> : [];
  return {
    status: "OK" as const,
    rows: raw.map((row) => ({
      interventionId: String(row.intervention_id),
      title: String(row.title),
      completedAt: row.completed_at === null ? null : String(row.completed_at),
      customerId: String(row.customer_id),
    })),
  };
}
