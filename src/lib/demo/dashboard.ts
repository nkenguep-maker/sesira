import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

export type DemoDashboardMetrics = {
  activeQuotes: number | null;
  todayInterventions: number | null;
  overdueInvoices: number | null;
};

const ACTIVE_QUOTE_STATUSES = ["SENT", "FOLLOWING_UP", "REPLIED", "NEEDS_HUMAN"];

export async function getDemoDashboardMetrics(organizationId: string): Promise<DemoDashboardMetrics> {
  const supabase = (await createClient()) as unknown as SupabaseClient;
  const [quotes, interventions, invoices] = await Promise.all([
    supabase.from("quotes").select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId).in("status", ACTIVE_QUOTE_STATUSES).eq("is_current_revision", true),
    supabase.from("interventions").select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId).contains("metadata", { demo_today: true }),
    supabase.from("invoices").select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId).eq("status", "OVERDUE"),
  ]);

  return {
    activeQuotes: quotes.error ? null : (quotes.count ?? 0),
    todayInterventions: interventions.error ? null : (interventions.count ?? 0),
    overdueInvoices: invoices.error ? null : (invoices.count ?? 0),
  };
}
