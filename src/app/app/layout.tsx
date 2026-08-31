import { redirect } from "next/navigation";

import { AppShell } from "@/components/sesira/app-shell";
import { getViewerContext } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProductLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const viewer = await getViewerContext();

  if (!viewer) {
    redirect("/login");
  }

  const supabase = await createClient();
  const { data: automation } = await supabase
    .from("automation_configs")
    .select("level")
    .eq("organization_id", viewer.organization.id)
    .eq("enabled", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return <AppShell viewer={viewer} currentMode={automation?.level ?? null}>{children}</AppShell>;
}
