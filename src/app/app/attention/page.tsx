import { AttentionInbox } from "@/components/attention/attention-inbox";
import { ATTENTION_CLOSED_STATUSES, ATTENTION_OPEN_STATUSES } from "@/lib/attention/schema";
import {
  buildAttentionInboxItems,
  entityKey,
  type AttentionRelatedEntity,
} from "@/lib/attention/view-model";
import { getViewerContext } from "@/lib/auth/viewer";
import { formatQuoteAmount } from "@/lib/quotes/format";
import { createClient } from "@/lib/supabase/server";

const EMPTY_UUID = "00000000-0000-0000-0000-000000000000";

type AttentionSearchParams = Promise<{ view?: string }>;

export default async function AttentionPage({ searchParams }: { searchParams: AttentionSearchParams }) {
  const [viewer, params] = await Promise.all([getViewerContext(), searchParams]);

  if (!viewer) {
    return null;
  }

  const organizationId = viewer.organization.id;
  const view = params.view === "resolved" ? "resolved" : "open";
  const statuses = view === "resolved" ? ATTENTION_CLOSED_STATUSES : ATTENTION_OPEN_STATUSES;
  const supabase = await createClient();
  const now = new Date().toISOString();

  const [itemsResult, openResult, urgentResult, dueResult, resolvedResult] = await Promise.all([
    supabase
      .from("attention_items")
      .select("*")
      .eq("organization_id", organizationId)
      .in("status", [...statuses])
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("attention_items")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .in("status", [...ATTENTION_OPEN_STATUSES]),
    supabase
      .from("attention_items")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .in("status", [...ATTENTION_OPEN_STATUSES])
      .eq("priority", "URGENT"),
    supabase
      .from("attention_items")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .in("status", [...ATTENTION_OPEN_STATUSES])
      .not("due_at", "is", null)
      .lt("due_at", now),
    supabase
      .from("attention_items")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .in("status", [...ATTENTION_CLOSED_STATUSES]),
  ]);

  if (itemsResult.error || openResult.error || urgentResult.error || dueResult.error || resolvedResult.error) {
    throw new Error("Impossible de charger les éléments à traiter.");
  }

  const rows = itemsResult.data ?? [];
  const customerIds = entityIds(rows, "customer");
  const requestIds = entityIds(rows, "request");
  const quoteIds = entityIds(rows, "quote");
  const assignedUserIds = [...new Set(rows.flatMap((item) => item.assigned_user_id ? [item.assigned_user_id] : []))];

  const [customersResult, requestsResult, quotesResult, membersResult] = await Promise.all([
    supabase
      .from("customers")
      .select("id, display_name, company_name")
      .eq("organization_id", organizationId)
      .in("id", customerIds.length ? customerIds : [EMPTY_UUID]),
    supabase
      .from("requests")
      .select("id, title, customers(display_name)")
      .eq("organization_id", organizationId)
      .in("id", requestIds.length ? requestIds : [EMPTY_UUID]),
    supabase
      .from("quotes")
      .select("id, title, amount, currency, customers(display_name)")
      .eq("organization_id", organizationId)
      .in("id", quoteIds.length ? quoteIds : [EMPTY_UUID]),
    supabase
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", organizationId)
      .in("user_id", assignedUserIds.length ? assignedUserIds : [EMPTY_UUID]),
  ]);

  if (customersResult.error || requestsResult.error || quotesResult.error || membersResult.error) {
    throw new Error("Impossible de charger le contexte des éléments à traiter.");
  }

  const memberIds = (membersResult.data ?? []).map((member) => member.user_id);
  const profilesResult = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", memberIds.length ? memberIds : [EMPTY_UUID]);

  if (profilesResult.error) {
    throw new Error("Impossible de charger les responsables des éléments à traiter.");
  }

  const entities: Record<string, AttentionRelatedEntity> = {};

  for (const customer of customersResult.data ?? []) {
    entities[entityKey("customer", customer.id)] = {
      type: "customer",
      label: customer.display_name,
      detail: customer.company_name ?? undefined,
      href: `/app/customers/${customer.id}`,
    };
  }

  for (const request of requestsResult.data ?? []) {
    const customer = oneRelation(request.customers);
    entities[entityKey("request", request.id)] = {
      type: "request",
      label: request.title,
      detail: customer?.display_name,
      href: `/app/requests/${request.id}`,
    };
  }

  for (const quote of quotesResult.data ?? []) {
    const customer = oneRelation(quote.customers);
    entities[entityKey("quote", quote.id)] = {
      type: "quote",
      label: quote.title,
      detail: customer?.display_name,
      amount: formatQuoteAmount(quote.amount, quote.currency),
      href: `/app/quotes/${quote.id}`,
    };
  }

  const assignees = Object.fromEntries(
    (profilesResult.data ?? []).map((profile) => [profile.id, profile.full_name?.trim() || "Membre de l’équipe"]),
  );
  const items = buildAttentionInboxItems(rows, { organizationId, entities, assignees });

  return (
    <AttentionInbox
      items={items}
      view={view}
      stats={{
        open: openResult.count ?? 0,
        urgent: urgentResult.count ?? 0,
        due: dueResult.count ?? 0,
        resolved: resolvedResult.count ?? 0,
      }}
    />
  );
}

function entityIds(
  rows: Array<{ entity_type: string | null; entity_id: string | null }>,
  expectedType: "customer" | "request" | "quote",
): string[] {
  return [...new Set(rows.flatMap((row) => {
    const type = row.entity_type?.trim().toLowerCase().replace(/s$/, "");
    return type === expectedType && row.entity_id ? [row.entity_id] : [];
  }))];
}

function oneRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}
