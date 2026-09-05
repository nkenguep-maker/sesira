import { AppShell } from "@/components/sesira/app-shell";
import { getViewerContext, getViewerOrganizations } from "@/lib/auth/viewer";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [viewer, organizations] = await Promise.all([
    getViewerContext(),
    getViewerOrganizations(),
  ]);
  const growthEnabled = viewer?.organization.featureFlags.growth_enabled === true;

  return (
    <AppShell
      workspaceId={viewer?.organization.id ?? ""}
      workspaceName={viewer?.organization.name ?? "SESIRA"}
      role={viewer?.role ?? "MEMBER"}
      growthEnabled={growthEnabled}
      demoMode={viewer?.organization.demoMode === true}
      organizations={organizations}
    >
      {children}
    </AppShell>
  );
}
