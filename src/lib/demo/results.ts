import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

export type DemoResults = {
  customers: number | null;
  requests: number | null;
  quotes: number | null;
  quoteSentEvents: number | null;
  resolvedAttentions: number | null;
};

export async function getDemoResults(organizationId: string): Promise<DemoResults> {
  const supabase = (await createClient()) as unknown as SupabaseClient;
  const [customers, requests, quotes, quoteSentEvents, resolvedAttentions] = await Promise.all([
    count(supabase, "customers", organizationId),
    count(supabase, "requests", organizationId),
    count(supabase, "quotes", organizationId),
    count(supabase, "events", organizationId, { column: "type", value: "quote.sent" }),
    count(supabase, "attention_items", organizationId, { column: "status", value: "RESOLVED" }),
  ]);
  return { customers, requests, quotes, quoteSentEvents, resolvedAttentions };
}

async function count(client: SupabaseClient, table: string, organizationId: string, filter?: { column: string; value: string }) {
  let query = client.from(table).select("id", { count: "exact", head: true }).eq("organization_id", organizationId);
  if (filter) query = query.eq(filter.column, filter.value);
  const result = await query;
  return result.error ? null : (result.count ?? 0);
}
