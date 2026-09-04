import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getViewerContext } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

export type OrganizationSnapshot = {
  schema_version: string;
  generated_at: string;
  organization_id: string;
  organization: Record<string, unknown> | null;
  counts: Record<string, number>;
  datasets: Record<string, Array<Record<string, unknown>>>;
};

export async function loadOrganizationSnapshot(): Promise<OrganizationSnapshot | null> {
  const viewer = await getViewerContext();
  if (!viewer) return null;
  const client = (await createClient()) as unknown as SupabaseClient;
  const result = await client.rpc("export_organization_snapshot", {
    target_organization_id: viewer.organization.id,
  });
  if (result.error || !isSnapshot(result.data)) return null;
  return result.data;
}

export function snapshotToCsv(snapshot: OrganizationSnapshot) {
  const lines = [["dataset", "row_index", "field", "value"]];
  if (snapshot.organization) pushObject(lines, "organization", 0, snapshot.organization);

  for (const [dataset, rows] of Object.entries(snapshot.datasets)) {
    rows.forEach((row, index) => pushObject(lines, dataset, index, row));
  }

  return lines.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

function pushObject(lines: string[][], dataset: string, rowIndex: number, row: Record<string, unknown>) {
  for (const [field, value] of Object.entries(row)) {
    lines.push([dataset, String(rowIndex), field, serializeValue(value)]);
  }
}

function serializeValue(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function isSnapshot(value: unknown): value is OrganizationSnapshot {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return row.schema_version === "C40_COMPLETE_ORGANIZATION_EXPORT_V2"
    && typeof row.generated_at === "string"
    && typeof row.organization_id === "string"
    && Boolean(row.datasets && typeof row.datasets === "object")
    && Boolean(row.counts && typeof row.counts === "object");
}
