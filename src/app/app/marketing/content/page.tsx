import { MarketingContentScreen } from "@/components/growth/growth-screens";
import { getGrowthRepositoryForViewer } from "@/lib/growth/viewer-repository";

export const dynamic = "force-dynamic";

export default async function MarketingContentPage() {
  const repository = await getGrowthRepositoryForViewer();
  if (!repository) return null;

  return <MarketingContentScreen result={await repository.listContent()} />;
}
