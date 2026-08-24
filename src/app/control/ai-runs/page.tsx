import { notFound } from "next/navigation";

import { ControlAiRunsScreen } from "@/components/control-center/control-center-screens";
import { getAuthorizedControlCenterRepository } from "@/lib/control-center/authorized-repository";

export default async function ControlAiRunsPage() {
  const repository = await getAuthorizedControlCenterRepository();
  if (!repository) notFound();
  const result = await repository.listAiRuns();
  return <ControlAiRunsScreen result={result} />;
}
