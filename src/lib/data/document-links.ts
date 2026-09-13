import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { DocumentEntityType } from "@/lib/documents/linking";

export type DocumentLinkView = {
  id: string;
  documentId: string;
  entityType: DocumentEntityType;
  entityId: string;
  relationKind: "PRIMARY" | "RELATED";
  source: string;
  confidence: number;
  status: "SUGGESTED" | "CONFIRMED" | "REJECTED";
  reason: string | null;
  isPrimary: boolean;
  label: string | null;
};

export async function getConfirmedDocumentLinkCounts(
  organizationId: string,
  entityType: DocumentEntityType,
  entityIds: string[],
) {
  const counts = new Map<string, number>();
  if (!entityIds.length) return counts;

  const client = (await createClient()) as SupabaseClient;
  const { data, error } = await client
    .from("document_links")
    .select("entity_id")
    .eq("organization_id", organizationId)
    .eq("entity_type", entityType)
    .eq("status", "CONFIRMED")
    .in("entity_id", entityIds.slice(0, 1000));

  if (error) {
    console.error("document link count read failed", {
      organizationId,
      entityType,
      message: error.message,
    });
    return counts;
  }

  for (const row of data ?? []) {
    const entityId = typeof row.entity_id === "string" ? row.entity_id : null;
    if (!entityId) continue;
    counts.set(entityId, (counts.get(entityId) ?? 0) + 1);
  }
  return counts;
}

export async function getDocumentLinksForOrganization(organizationId: string) {
  const client = (await createClient()) as SupabaseClient;
  const { data, error } = await client
    .from("document_links")
    .select("id,document_id,entity_type,entity_id,relation_kind,source,confidence,status,reason,is_primary,metadata")
    .eq("organization_id", organizationId)
    .neq("status", "REJECTED")
    .order("is_primary", { ascending: false })
    .order("confidence", { ascending: false })
    .limit(3000);

  if (error) {
    return { status: "ERROR" as const, reason: error.message, rows: [] as DocumentLinkView[] };
  }

  return {
    status: "OK" as const,
    rows: (data ?? []).map((row) => {
      const metadata = row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? row.metadata as Record<string, unknown>
        : {};
      return {
        id: String(row.id),
        documentId: String(row.document_id),
        entityType: String(row.entity_type) as DocumentEntityType,
        entityId: String(row.entity_id),
        relationKind: String(row.relation_kind) as "PRIMARY" | "RELATED",
        source: String(row.source),
        confidence: Number(row.confidence),
        status: String(row.status) as "SUGGESTED" | "CONFIRMED" | "REJECTED",
        reason: typeof row.reason === "string" ? row.reason : null,
        isPrimary: row.is_primary === true,
        label: typeof metadata.label === "string" ? metadata.label : null,
      } satisfies DocumentLinkView;
    }),
  };
}
