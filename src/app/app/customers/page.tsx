import { CustomerListScreen } from "@/components/customers/customer-list-screen";
import { getViewerContext } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 25;

type CustomerSearchParams = Promise<{
  q?: string;
  type?: string;
  cursor?: string;
}>;

export default async function CustomersPage({ searchParams }: { searchParams: CustomerSearchParams }) {
  const [viewer, params] = await Promise.all([getViewerContext(), searchParams]);

  if (!viewer) {
    return null;
  }

  const query = params.q?.trim().slice(0, 80) ?? "";
  const type = params.type === "PERSON" || params.type === "COMPANY" ? params.type : "ALL";
  const cursor = isValidDate(params.cursor) ? params.cursor : undefined;
  const organizationId = viewer.organization.id;
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const supabase = await createClient();
  let listQuery = supabase
    .from("customers")
    .select("id, type, display_name, company_name, email, phone, created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (query) {
    listQuery = listQuery.ilike("display_name", `%${escapeLikePattern(query)}%`);
  }

  if (type !== "ALL") {
    listQuery = listQuery.eq("type", type);
  }

  if (cursor) {
    listQuery = listQuery.lt("created_at", cursor);
  }

  const [listResult, totalResult, companyResult, recentResult] = await Promise.all([
    listQuery,
    supabase.from("customers").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("type", "COMPANY"),
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .gte("created_at", monthStart.toISOString()),
  ]);

  if (listResult.error || totalResult.error || companyResult.error || recentResult.error) {
    throw new Error("Impossible de charger les clients.");
  }

  const hasNextPage = (listResult.data?.length ?? 0) > PAGE_SIZE;
  const customers = (listResult.data ?? []).slice(0, PAGE_SIZE);

  return (
    <CustomerListScreen
      customers={customers}
      stats={{
        total: totalResult.count ?? 0,
        companies: companyResult.count ?? 0,
        recent: recentResult.count ?? 0,
      }}
      query={query}
      type={type}
      nextCursor={hasNextPage ? customers.at(-1)?.created_at : undefined}
    />
  );
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

function isValidDate(value: string | undefined): value is string {
  return Boolean(value && !Number.isNaN(Date.parse(value)));
}
