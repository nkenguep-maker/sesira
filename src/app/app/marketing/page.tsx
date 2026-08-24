import { MarketingHomeScreen } from "@/components/growth/growth-screens";
import { getGrowthRepositoryForViewer } from "@/lib/growth/viewer-repository";

export const dynamic = "force-dynamic";

export default async function MarketingPage() {
  const repository = await getGrowthRepositoryForViewer();
  if (!repository) return null;

  const [summary, knowledge, ideas, content, publications] = await Promise.all([
    repository.getSummary(),
    repository.getOrganizationKnowledge(),
    repository.listIdeas(),
    repository.listContent(),
    repository.listPublications(),
  ]);

  return <MarketingHomeScreen summary={summary} knowledge={knowledge} ideas={ideas} content={content} publications={publications} />;
}
