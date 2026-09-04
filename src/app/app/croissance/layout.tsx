import { redirect } from "next/navigation";

import { getViewerContext } from "@/lib/auth/viewer";

export default async function GrowthLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewerContext();
  if (!viewer || viewer.organization.featureFlags.growth_enabled !== true) {
    redirect("/app");
  }

  return children;
}
