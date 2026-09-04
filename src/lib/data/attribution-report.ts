import "server-only";

import { getAttributionWorkspace } from "@/lib/data/c32-workspaces";

const REPORT_WINDOW_DAYS = 90;

export async function getRecentAttributionWorkspace(organizationId: string) {
  const until = new Date();
  const since = new Date(until.getTime() - REPORT_WINDOW_DAYS * 86_400_000);
  return getAttributionWorkspace(organizationId, since, until);
}
