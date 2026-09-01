import { getControlAccess, isControlAccessGranted } from "@/lib/control-center/access";
import type { ControlCenterRepository } from "@/lib/control-center/contracts";
import { controlCenterRepository } from "@/lib/control-center/unavailable-repository";

/**
 * Data loaders must obtain the repository through this gate. This keeps page
 * reads ordered after authorization even when Next.js renders layouts and
 * pages concurrently.
 */
export async function getAuthorizedControlCenterRepository(): Promise<ControlCenterRepository | null> {
  const access = await getControlAccess();
  return isControlAccessGranted(access) ? controlCenterRepository : null;
}
