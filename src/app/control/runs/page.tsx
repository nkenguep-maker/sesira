import { notFound } from "next/navigation";

import { ControlRunsScreen } from "@/components/control-center/control-center-screens";
import { getAuthorizedControlCenterRepository } from "@/lib/control-center/authorized-repository";

export default async function ControlRunsPage() {
  const repository = await getAuthorizedControlCenterRepository();
  if (!repository) notFound();
  const result = await repository.listRuns();
  return <ControlRunsScreen result={result} />;
}
