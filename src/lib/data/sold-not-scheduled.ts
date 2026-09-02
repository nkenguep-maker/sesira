import "server-only";

import { safeClient } from "@/lib/data/safe-client";

/**
 * C19 — detect WON opportunities that never got an operational
 * next step (an intervention scheduled, a report opened, etc.).
 * Marker event types default to the intervention pair; a caller
 * can supply a custom set once other operational subsystems ship.
 */

export type SoldNotScheduledRow = {
  opportunityId: string;
  customerId: string;
  estimatedValue: number | null;
  currency: string;
  closedAt: string;
  ageHours: number;
};

const DEFAULT_MARKER_TYPES = ["intervention.scheduled", "intervention.completed"] as const;

/**
 * Returns WON opportunities without an operational marker event
 * since `closedAt`, ordered by `closedAt` DESC. Default window: the
 * last 90 days. `markerTypes` override lets ops re-scope once other
 * subsystems (e.g. maintenance, invoices) declare their own marker.
 */
export async function getSoldNotScheduledOpportunities(
  organizationId: string,
  options: { since?: Date; markerTypes?: readonly string[] } = {},
): Promise<SoldNotScheduledRow[]> {
  const supabase = await safeClient();
  if (!supabase) return [];
  const since = options.since ?? new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const markers = (options.markerTypes ?? DEFAULT_MARKER_TYPES) as string[];

  const { data, error } = await supabase.rpc("sold_not_scheduled_opportunities", {
    target_organization_id: organizationId,
    target_since: since.toISOString(),
    target_marker_types: markers,
  });
  if (error) {
    console.error("[lib/data] getSoldNotScheduledOpportunities:", error.message);
    return [];
  }
  return (data ?? []).map((row) => ({
    opportunityId: row.opportunity_id as string,
    customerId: row.customer_id as string,
    estimatedValue: (row.estimated_value as number | null) ?? null,
    currency: row.currency as string,
    closedAt: row.closed_at as string,
    ageHours: Number(row.age_hours),
  }));
}
