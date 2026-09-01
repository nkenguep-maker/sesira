import type { Database } from "@/types/database";

import { attentionReasonExplanation } from "@/lib/attention/format";

type AttentionRow = Database["public"]["Tables"]["attention_items"]["Row"];

export type AttentionRelatedEntity = {
  type: "customer" | "request" | "quote";
  label: string;
  detail?: string;
  href: string;
  amount?: string;
};

export type AttentionInboxItem = Pick<
  AttentionRow,
  | "id"
  | "category"
  | "priority"
  | "status"
  | "title"
  | "suggested_action"
  | "due_at"
  | "created_at"
  | "resolved_at"
> & {
  explanation: string;
  assigneeName: string | null;
  entity: AttentionRelatedEntity | null;
};

export function buildAttentionInboxItems(
  rows: AttentionRow[],
  {
    organizationId,
    entities = {},
    assignees = {},
  }: {
    organizationId: string;
    entities?: Record<string, AttentionRelatedEntity>;
    assignees?: Record<string, string>;
  },
): AttentionInboxItem[] {
  return rows
    .filter((row) => row.organization_id === organizationId)
    .map((row) => ({
      id: row.id,
      category: row.category,
      priority: row.priority,
      status: row.status,
      title: row.title,
      explanation: row.explanation?.trim() || attentionReasonExplanation(row.reason),
      suggested_action: row.suggested_action?.trim() || null,
      due_at: row.due_at,
      created_at: row.created_at,
      resolved_at: row.resolved_at,
      assigneeName: row.assigned_user_id ? assignees[row.assigned_user_id] ?? "Membre de l’équipe" : null,
      entity: row.entity_id ? entities[entityKey(row.entity_type, row.entity_id)] ?? null : null,
    }))
    .sort(compareAttentionItems);
}

export function entityKey(type: string | null, id: string): string {
  const normalized = type?.trim().toLowerCase().replace(/s$/, "") ?? "";
  return `${normalized}:${id}`;
}

function compareAttentionItems(a: AttentionInboxItem, b: AttentionInboxItem): number {
  const priorityRank: Record<string, number> = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
  const priorityDifference = (priorityRank[a.priority] ?? 4) - (priorityRank[b.priority] ?? 4);

  if (priorityDifference !== 0) {
    return priorityDifference;
  }

  if (a.due_at && b.due_at) {
    return Date.parse(a.due_at) - Date.parse(b.due_at);
  }

  if (a.due_at) return -1;
  if (b.due_at) return 1;

  return Date.parse(b.created_at) - Date.parse(a.created_at);
}
