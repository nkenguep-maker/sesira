import "server-only";

import { safeClient } from "@/lib/data/safe-client";

/**
 * C18 — opportunities read models.
 */

export type OpportunityFeedRow = {
  id: string;
  customerId: string;
  requestId: string | null;
  commercialState: string;
  ownerUserId: string | null;
  estimatedValue: number | null;
  currency: string;
  openedAt: string;
  expectedCloseDate: string | null;
  closedAt: string | null;
  variantCount: number;
  currentRevisionQuoteIds: string[];
};

/**
 * Feed of open (non-terminal) opportunities for an org, ordered by
 * opened_at DESC. Bundles the current-revision quote ids per variant
 * so the UI can render "3 variants, revision 2 on standard" without
 * a second query.
 */
export async function getOpportunitiesFeed(
  organizationId: string,
  options: { limit?: number; includeTerminal?: boolean } = {},
): Promise<OpportunityFeedRow[]> {
  const supabase = await safeClient();
  if (!supabase) return [];

  const opportunitiesQuery = supabase
    .from("opportunities")
    .select(
      "id, customer_id, request_id, commercial_state, owner_user_id, estimated_value, currency, opened_at, expected_close_date, closed_at",
    )
    .eq("organization_id", organizationId)
    .order("opened_at", { ascending: false })
    .limit(Math.min(options.limit ?? 100, 500));

  const opportunities = options.includeTerminal
    ? await opportunitiesQuery
    : await opportunitiesQuery.not("commercial_state", "in", "(WON,LOST,CANCELLED)");

  if (opportunities.error) {
    console.error("[lib/data] getOpportunitiesFeed:", opportunities.error.message);
    return [];
  }
  const oppRows = (opportunities.data ?? []) as Array<{
    id: string; customer_id: string; request_id: string | null;
    commercial_state: string; owner_user_id: string | null;
    estimated_value: number | null; currency: string;
    opened_at: string; expected_close_date: string | null; closed_at: string | null;
  }>;
  if (oppRows.length === 0) return [];

  const oppIds = oppRows.map((r) => r.id);
  const quotesQuery = await supabase
    .from("quotes")
    .select("id, opportunity_id, variant_key, is_current_revision")
    .eq("organization_id", organizationId)
    .in("opportunity_id", oppIds);
  if (quotesQuery.error) {
    console.error("[lib/data] getOpportunitiesFeed quotes:", quotesQuery.error.message);
  }
  const quoteRows = (quotesQuery.data ?? []) as Array<{
    id: string; opportunity_id: string; variant_key: string; is_current_revision: boolean;
  }>;

  const variantMap = new Map<string, Set<string>>();
  const currentQuoteMap = new Map<string, string[]>();
  for (const q of quoteRows) {
    const variants = variantMap.get(q.opportunity_id) ?? new Set<string>();
    variants.add(q.variant_key);
    variantMap.set(q.opportunity_id, variants);
    if (q.is_current_revision) {
      const list = currentQuoteMap.get(q.opportunity_id) ?? [];
      list.push(q.id);
      currentQuoteMap.set(q.opportunity_id, list);
    }
  }

  return oppRows.map((o) => ({
    id: o.id,
    customerId: o.customer_id,
    requestId: o.request_id,
    commercialState: o.commercial_state,
    ownerUserId: o.owner_user_id,
    estimatedValue: o.estimated_value,
    currency: o.currency,
    openedAt: o.opened_at,
    expectedCloseDate: o.expected_close_date,
    closedAt: o.closed_at,
    variantCount: variantMap.get(o.id)?.size ?? 0,
    currentRevisionQuoteIds: currentQuoteMap.get(o.id) ?? [],
  }));
}

export type OpportunityDetail = {
  id: string;
  customerId: string;
  commercialState: string;
  estimatedValue: number | null;
  currency: string;
  variants: Array<{
    variantKey: string;
    revisions: Array<{
      quoteId: string;
      revision: number;
      isCurrent: boolean;
      status: string;
      amount: number | null;
    }>;
  }>;
  options: Array<{
    id: string;
    quoteId: string;
    optionKey: string;
    name: string;
    amount: number | null;
    currency: string;
    status: string;
    ordinal: number;
  }>;
};

/**
 * Full detail of one opportunity — used by the drill-down view.
 * Returns null when the opportunity does not exist or is invisible
 * under RLS.
 */
export async function getOpportunityDetail(
  organizationId: string,
  opportunityId: string,
): Promise<OpportunityDetail | null> {
  const supabase = await safeClient();
  if (!supabase) return null;

  const [opp, quotes, options] = await Promise.all([
    supabase.from("opportunities")
      .select("id, customer_id, commercial_state, estimated_value, currency")
      .eq("organization_id", organizationId)
      .eq("id", opportunityId)
      .maybeSingle(),
    supabase.from("quotes")
      .select("id, variant_key, revision, is_current_revision, status, amount")
      .eq("organization_id", organizationId)
      .eq("opportunity_id", opportunityId)
      .order("variant_key", { ascending: true })
      .order("revision", { ascending: true }),
    supabase.from("quote_options")
      .select("id, quote_id, option_key, name, amount, currency, status, ordinal, quotes!inner(opportunity_id)")
      .eq("organization_id", organizationId)
      .eq("quotes.opportunity_id", opportunityId),
  ]);
  if (opp.error) {
    console.error("[lib/data] getOpportunityDetail opp:", opp.error.message);
    return null;
  }
  const oppRow = opp.data as {
    id: string; customer_id: string; commercial_state: string;
    estimated_value: number | null; currency: string;
  } | null;
  if (!oppRow) return null;

  const quoteRows = (quotes.data ?? []) as Array<{
    id: string; variant_key: string; revision: number; is_current_revision: boolean;
    status: string; amount: number | null;
  }>;
  const variantMap = new Map<string, OpportunityDetail["variants"][number]>();
  for (const q of quoteRows) {
    let variant = variantMap.get(q.variant_key);
    if (!variant) {
      variant = { variantKey: q.variant_key, revisions: [] };
      variantMap.set(q.variant_key, variant);
    }
    variant.revisions.push({
      quoteId: q.id,
      revision: q.revision,
      isCurrent: q.is_current_revision,
      status: q.status,
      amount: q.amount,
    });
  }

  const optionRows = (options.data ?? []) as Array<{
    id: string; quote_id: string; option_key: string; name: string;
    amount: number | null; currency: string; status: string; ordinal: number;
  }>;

  return {
    id: oppRow.id,
    customerId: oppRow.customer_id,
    commercialState: oppRow.commercial_state,
    estimatedValue: oppRow.estimated_value,
    currency: oppRow.currency,
    variants: Array.from(variantMap.values()),
    options: optionRows.map((o) => ({
      id: o.id,
      quoteId: o.quote_id,
      optionKey: o.option_key,
      name: o.name,
      amount: o.amount,
      currency: o.currency,
      status: o.status,
      ordinal: o.ordinal,
    })),
  };
}
