import { AppShell } from "@/components/sesira/app-shell";
import { getViewerContext } from "@/lib/auth/viewer";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewerContext();

  return (
    <AppShell
      workspaceName={viewer?.organization.name ?? "SESIRA"}
      role={viewer?.role ?? "MEMBER"}
    >
      {children}
    </AppShell>
  );
}
