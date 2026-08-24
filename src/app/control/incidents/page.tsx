import { notFound } from "next/navigation";

import { ControlIncidentsScreen } from "@/components/control-center/control-center-screens";
import { getAuthorizedControlCenterRepository } from "@/lib/control-center/authorized-repository";

export default async function ControlIncidentsPage() {
  const repository = await getAuthorizedControlCenterRepository();
  if (!repository) notFound();
  const result = await repository.listIncidents();
  return <ControlIncidentsScreen result={result} />;
}
