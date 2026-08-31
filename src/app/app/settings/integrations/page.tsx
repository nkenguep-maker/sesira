import { ConnectionsScreen } from "@/components/settings/connections-screen";
import { getViewerContext } from "@/lib/auth/viewer";
import { areExternalActionsEnabled } from "@/lib/automation/external-actions";
import { serverEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ConnectionsPage() {
  const viewer = await getViewerContext();
  if (!viewer) return null;
  const supabase = await createClient();
  const [integrations, automation] = await Promise.all([
    supabase.from("integrations").select("provider, status, last_sync_at").eq("organization_id", viewer.organization.id).ilike("type", "email").order("updated_at", { ascending: false }).limit(1),
    supabase.from("automation_configs").select("level").eq("organization_id", viewer.organization.id).eq("enabled", true).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (integrations.error) throw new Error("Impossible de vérifier l’état de vos connexions.");
  const externalActionsEnabled = areExternalActionsEnabled({ configuredValue: serverEnv.EXTERNAL_ACTIONS_ENABLED, deploymentEnvironment: process.env.VERCEL_ENV as "development" | "preview" | "production" | undefined });
  return <ConnectionsScreen connection={integrations.data?.[0] ?? null} mode={automation.data?.level ?? "OBSERVATION"} organizationPaused={viewer.organization.status === "SUSPENDED"} externalActionsEnabled={externalActionsEnabled} />;
}
