import { RequestListScreen } from "@/components/requests/request-list-screen";
import { getViewerContext } from "@/lib/auth/viewer";
import {
  buildDescendingProductCursorFilter,
  decodeProductCursor,
  encodeProductCursor,
} from "@/lib/pagination/product-cursor";
import { isRequestSource, isRequestStatus } from "@/lib/requests/schema";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 25;

type RequestSearchParams = Promise<{
  q?: string;
  status?: string;
  source?: string;
  cursor?: string;
}>;

export default async function RequestsPage({ searchParams }: { searchParams: RequestSearchParams }) {
  const [viewer, params] = await Promise.all([getViewerContext(), searchParams]);

  if (!viewer) {
    return null;
  }

  const query = params.q?.trim().slice(0, 80) ?? "";
  const status = params.status && isRequestStatus(params.status) ? params.status : "ALL";
  const source = params.source && isRequestSource(params.source) ? params.source : "ALL";
  const cursor = decodeProductCursor(params.cursor);
  const organizationId = viewer.organization.id;
  const supabase = await createClient();

  let listQuery = supabase
    .from("requests")
    .select(
      "id, title, source, status, qualification_score, created_at, customers(id, display_name, company_name), service_catalog_items(id, name)",
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (query) {
    listQuery = listQuery.ilike("title", `%${escapeLikePattern(query)}%`);
  }

  if (status !== "ALL") {
    listQuery = listQuery.eq("status", status);
  }

  if (source !== "ALL") {
    listQuery = listQuery.eq("source", source);
  }

  if (cursor) {
    listQuery = listQuery.or(buildDescendingProductCursorFilter(cursor));
  }

  const [listResult, totalResult, newResult, needsInfoResult, readyResult] = await Promise.all([
    listQuery,
    supabase.from("requests").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
    supabase
      .from("requests")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "NEW"),
    supabase
      .from("requests")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "NEEDS_INFO"),
    supabase
      .from("requests")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .in("status", ["QUALIFIED", "READY"]),
  ]);

  if (
    listResult.error ||
    totalResult.error ||
    newResult.error ||
    needsInfoResult.error ||
    readyResult.error
  ) {
    throw new Error("Impossible de charger les demandes.");
  }

  const hasNextPage = (listResult.data?.length ?? 0) > PAGE_SIZE;
  const requests = (listResult.data ?? []).slice(0, PAGE_SIZE);

  return (
    <RequestListScreen
      requests={requests}
      stats={{
        total: totalResult.count ?? 0,
        new: newResult.count ?? 0,
        needsInfo: needsInfoResult.count ?? 0,
        ready: readyResult.count ?? 0,
      }}
      query={query}
      status={status}
      source={source}
      nextCursor={
        hasNextPage && requests.at(-1)
          ? encodeProductCursor({
              createdAt: requests.at(-1)!.created_at,
              id: requests.at(-1)!.id,
            })
          : undefined
      }
    />
  );
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}
