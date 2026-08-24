import { MarketingPublicationsScreen } from "@/components/growth/growth-screens";
import { getGrowthRepositoryForViewer } from "@/lib/growth/viewer-repository";

export const dynamic = "force-dynamic";

export default async function MarketingPublicationsPage() {
  const repository = await getGrowthRepositoryForViewer();
  if (!repository) return null;

  return <MarketingPublicationsScreen result={await repository.listPublications()} />;
}
