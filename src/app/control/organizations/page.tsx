import { notFound } from "next/navigation";

import { ControlOrganizationsScreen } from "@/components/control-center/control-center-screens";
import { getAuthorizedControlCenterRepository } from "@/lib/control-center/authorized-repository";

export default async function ControlOrganizationsPage() {
  const repository = await getAuthorizedControlCenterRepository();
  if (!repository) notFound();
  const result = await repository.listOrganizations();
  return <ControlOrganizationsScreen result={result} />;
}
