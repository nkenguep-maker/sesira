import { notFound } from "next/navigation";

import { ControlIntegrationsScreen } from "@/components/control-center/control-center-screens";
import { getAuthorizedControlCenterRepository } from "@/lib/control-center/authorized-repository";

export default async function ControlIntegrationsPage() {
  const repository = await getAuthorizedControlCenterRepository();
  if (!repository) notFound();
  const result = await repository.listIntegrations();
  return <ControlIntegrationsScreen result={result} />;
}
