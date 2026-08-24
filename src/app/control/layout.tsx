import { notFound } from "next/navigation";

import { ControlCenterShell } from "@/components/control-center/control-center-shell";
import { getControlAccess, isControlAccessGranted } from "@/lib/control-center/access";

export const dynamic = "force-dynamic";

export default async function ControlLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const access = await getControlAccess();

  if (!isControlAccessGranted(access)) {
    notFound();
  }

  return <ControlCenterShell>{children}</ControlCenterShell>;
}
