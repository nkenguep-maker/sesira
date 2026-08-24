import { QuoteListScreen } from "@/components/quotes/quote-list-screen";
import { getViewerContext } from "@/lib/auth/viewer";
import {
  buildDescendingProductCursorFilter,
  decodeProductCursor,
  encodeProductCursor,
} from "@/lib/pagination/product-cursor";
import { isQuoteDateFilter, isQuoteStatus } from "@/lib/quotes/schema";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 25;

type QuoteSearchParams = Promise<{
  q?: string;
  status?: string;
  date?: string;
  cursor?: string;
}>;

export default async function QuotesPage({ searchParams }: { searchParams: QuoteSearchParams }) {
  const [viewer, params] = await Promise.all([getViewerContext(), searchParams]);

  if (!viewer) {
    return null;
  }

  const query = params.q?.trim().slice(0, 80) ?? "";
  const status = params.status && isQuoteStatus(params.status) ? params.status : "ALL";
  const date = params.date && isQuoteDateFilter(params.date) ? params.date : "ALL";
  const cursor = decodeProductCursor(params.cursor);
  const organizationId = viewer.organization.id;
  const supabase = await createClient();
  let customerIds: string[] = [];

  if (query) {
    const pattern = `%${escapeLikePattern(query)}%`;
    const { data: matchingCustomers, error } = await supabase
      .from("customers")
      .select("id")
      .eq("organization_id", organizationId)
      .or(`display_name.ilike.${quoteFilterValue(pattern)},company_name.ilike.${quoteFilterValue(pattern)}`)
      .limit(100);

    if (error) {
      throw new Error("Impossible de rechercher les devis.");
    }

    customerIds = (matchingCustomers ?? []).map((customer) => customer.id);
  }

  let listQuery = supabase
    .from("quotes")
    .select(
      "id, title, reference, amount, currency, status, owner_user_id, sent_at, expires_at, next_action_at, created_at, customers(id, display_name, company_name), requests(id, title)",
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (query) {
    const pattern = quoteFilterValue(`%${escapeLikePattern(query)}%`);
    const filters = [`title.ilike.${pattern}`, `reference.ilike.${pattern}`];

    if (customerIds.length) {
      filters.push(`customer_id.in.(${customerIds.join(",")})`);
    }

    listQuery = listQuery.or(filters.join(","));
  }

  if (status !== "ALL") {
    listQuery = listQuery.eq("status", status);
  }

  const now = new Date();

  if (date === "DUE") {
    listQuery = listQuery
      .in("status", ["SENT", "FOLLOWING_UP", "REPLIED", "NEEDS_HUMAN"])
      .not("next_action_at", "is", null)
      .lte("next_action_at", now.toISOString());
  }

  if (date === "NEXT_7_DAYS") {
    const nextWeek = new Date(now);
    nextWeek.setUTCDate(nextWeek.getUTCDate() + 7);
    listQuery = listQuery
      .not("next_action_at", "is", null)
      .gte("next_action_at", now.toISOString())
      .lte("next_action_at", nextWeek.toISOString());
  }

  if (date === "EXPIRING_30_DAYS") {
    const nextMonth = new Date(now);
    nextMonth.setUTCDate(nextMonth.getUTCDate() + 30);
    listQuery = listQuery
      .not("expires_at", "is", null)
      .gte("expires_at", now.toISOString())
      .lte("expires_at", nextMonth.toISOString());
  }

  if (cursor) {
    listQuery = listQuery.or(buildDescendingProductCursorFilter(cursor));
  }

  const [listResult, totalResult, draftResult, followingResult, wonResult] = await Promise.all([
    listQuery,
    supabase.from("quotes").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
    supabase.from("quotes").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("status", "DRAFT"),
    supabase.from("quotes").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).in("status", ["SENT", "FOLLOWING_UP", "REPLIED", "NEEDS_HUMAN"]),
    supabase.from("quotes").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("status", "WON"),
  ]);

  if (listResult.error || totalResult.error || draftResult.error || followingResult.error || wonResult.error) {
    throw new Error("Impossible de charger les devis.");
  }

  const hasNextPage = (listResult.data?.length ?? 0) > PAGE_SIZE;
  const quotes = (listResult.data ?? []).slice(0, PAGE_SIZE);
  const ownerIds = [...new Set(quotes.flatMap((quote) => quote.owner_user_id ? [quote.owner_user_id] : []))];
  const ownersResult = ownerIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", ownerIds)
    : { data: [], error: null };

  if (ownersResult.error) {
    throw new Error("Impossible de charger les propriétaires des devis.");
  }

  const ownerNames = Object.fromEntries(
    (ownersResult.data ?? []).map((profile) => [
      profile.id,
      profile.id === viewer.userId ? "Vous" : profile.full_name ?? "Membre de l’équipe",
    ]),
  );

  return (
    <QuoteListScreen
      quotes={quotes.map((quote) => ({
        ...quote,
        owner_name: quote.owner_user_id ? ownerNames[quote.owner_user_id] ?? "Membre de l’équipe" : null,
      }))}
      stats={{ total: totalResult.count ?? 0, drafts: draftResult.count ?? 0, following: followingResult.count ?? 0, won: wonResult.count ?? 0 }}
      query={query}
      status={status}
      date={date}
      nextCursor={
        hasNextPage && quotes.at(-1)
          ? encodeProductCursor({
              createdAt: quotes.at(-1)!.created_at,
              id: quotes.at(-1)!.id,
            })
          : undefined
      }
    />
  );
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

function quoteFilterValue(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}
