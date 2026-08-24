import { notFound } from "next/navigation";

import { ControlOverviewScreen } from "@/components/control-center/control-center-screens";
import { getAuthorizedControlCenterRepository } from "@/lib/control-center/authorized-repository";

export default async function ControlOverviewPage() {
  const repository = await getAuthorizedControlCenterRepository();
  if (!repository) notFound();
  const result = await repository.getOverview();
  return <ControlOverviewScreen result={result} />;
}
