import { AutomationsScreen } from "@/components/automations/automations-screen";
import { getViewerContext } from "@/lib/auth/viewer";
import { findAutomationDefinition } from "@/lib/automations/catalog";
import type { AutomationRunsByConfig } from "@/lib/automations/contracts";
import { buildAutomationCards } from "@/lib/automations/view-model";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AutomationsPage() {
  const viewer = await getViewerContext();

  if (!viewer) {
    return null;
  }

  const organizationId = viewer.organization.id;
  const supabase = await createClient();
  const configsResult = await supabase
    .from("automation_configs")
    .select("id, template_key, enabled, level, updated_at")
    .eq("organization_id", organizationId)
    .eq("enabled", true)
    .order("updated_at", { ascending: false });

  if (configsResult.error) {
    throw new Error("Impossible de charger les automatisations.");
  }

  const configs = (configsResult.data ?? []).filter((config) =>
    Boolean(findAutomationDefinition(config.template_key)));
  const runResults = await Promise.all(configs.map(async (config) => {
    const result = await supabase
      .from("automation_runs")
      .select("id, automation_config_id, status, created_at, completed_at")
      .eq("organization_id", organizationId)
      .eq("automation_config_id", config.id)
      .order("created_at", { ascending: false })
      .limit(6);

    return [config.id, result.error ? null : (result.data ?? [])] as const;
  }));
  const runsByConfig: AutomationRunsByConfig = Object.fromEntries(runResults);

  return <AutomationsScreen cards={buildAutomationCards(configs, runsByConfig)} />;
}
