import { MarketingIdeasScreen } from "@/components/growth/growth-screens";
import { getGrowthRepositoryForViewer } from "@/lib/growth/viewer-repository";

export const dynamic = "force-dynamic";

export default async function MarketingIdeasPage() {
  const repository = await getGrowthRepositoryForViewer();
  if (!repository) return null;

  return <MarketingIdeasScreen result={await repository.listIdeas()} />;
}
