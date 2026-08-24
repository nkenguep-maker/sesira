import { getViewerContext } from "@/lib/auth/viewer";
import { createDemoGrowthRepository } from "@/lib/growth/demo-repository";

/**
 * Organization context is derived server-side from the authenticated viewer.
 * The browser never supplies organization authority.
 */
export async function getGrowthRepositoryForViewer() {
  const viewer = await getViewerContext();
  if (!viewer) return null;

  return createDemoGrowthRepository({
    organizationName: viewer.organization.name,
    sectorKey: viewer.organization.sectorKey,
  });
}
