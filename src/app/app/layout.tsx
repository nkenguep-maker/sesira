import { redirect } from "next/navigation";

import { AppShell } from "@/components/sesira/app-shell";
import { getViewerContext } from "@/lib/auth/viewer";

export const dynamic = "force-dynamic";

export default async function ProductLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const viewer = await getViewerContext();

  if (!viewer) {
    redirect("/login");
  }

  return <AppShell viewer={viewer}>{children}</AppShell>;
}
