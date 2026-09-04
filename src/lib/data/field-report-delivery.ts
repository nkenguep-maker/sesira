import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { ReadResult } from "@/lib/data/c32-workspaces";
import { createClient } from "@/lib/supabase/server";

export type FieldReportDeliveryEvidenceRow = {
  reportId: string;
  provider: string | null;
  externalRef: string | null;
};

export async function getFieldReportDeliveryEvidence(
  organizationId: string,
): Promise<ReadResult<FieldReportDeliveryEvidenceRow>> {
  const client = (await createClient()) as SupabaseClient;
  const { data, error } = await client
    .from("field_reports")
    .select("id,delivery_provider,delivery_external_ref")
    .eq("organization_id", organizationId)
    .limit(250);

  if (error) return { status: "ERROR", reason: error.message };

  return {
    status: "OK",
    rows: (data ?? []).map((row) => ({
      reportId: row.id as string,
      provider: row.delivery_provider as string | null,
      externalRef: row.delivery_external_ref as string | null,
    })),
  };
}
