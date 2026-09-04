import { AppShell } from "@/components/sesira/app-shell";
import { getViewerContext } from "@/lib/auth/viewer";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewerContext();
  const growthEnabled = viewer?.organization.featureFlags.growth_enabled === true;

  return (
    <AppShell
      workspaceName={viewer?.organization.name ?? "SESIRA"}
      role={viewer?.role ?? "MEMBER"}
      growthEnabled={growthEnabled}
    >
      {children}
    </AppShell>
  );
}
