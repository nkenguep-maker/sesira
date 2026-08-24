import { ResultsScreen } from "@/components/results/results-screen";
import { getViewerContext } from "@/lib/auth/viewer";
import { buildResultsPeriod, parseResultsPeriod } from "@/lib/results/period";
import { createSupabaseResultsRepository } from "@/lib/results/supabase-results-repository";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ResultsSearchParams = Promise<{ period?: string }>;

export default async function ResultsPage({ searchParams }: { searchParams: ResultsSearchParams }) {
  const [viewer, params] = await Promise.all([getViewerContext(), searchParams]);

  if (!viewer) {
    return null;
  }

  const period = buildResultsPeriod(parseResultsPeriod(params.period));
  const repository = createSupabaseResultsRepository(await createClient());
  const summary = await repository.getSummary({
    organizationId: viewer.organization.id,
    period,
  });

  return <ResultsScreen summary={summary} />;
}
