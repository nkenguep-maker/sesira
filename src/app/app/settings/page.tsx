import { SettingsScreen } from "@/components/settings/settings-screen";
import { getViewerContext } from "@/lib/auth/viewer";
import {
  buildSettingsConnections,
  canManageOrganization,
  type SettingsMember,
} from "@/lib/settings/view-model";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const viewer = await getViewerContext();

  if (!viewer) {
    return null;
  }

  const organizationId = viewer.organization.id;
  const supabase = await createClient();
  const [organizationResult, membersResult, integrationsResult] = await Promise.all([
    supabase
      .from("organizations")
      .select("name, sector_key, status, timezone, language, currency")
      .eq("id", organizationId)
      .maybeSingle(),
    supabase
      .from("organization_members")
      .select("id, user_id, role, status, created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: true }),
    supabase
      .from("integrations")
      .select("id, provider, type, status, connected_at, last_sync_at")
      .eq("organization_id", organizationId)
      .order("updated_at", { ascending: false }),
  ]);

  if (organizationResult.error || !organizationResult.data || membersResult.error || integrationsResult.error) {
    throw new Error("Impossible de charger les réglages de l’organisation.");
  }

  const memberRows = membersResult.data ?? [];
  const profileResult = memberRows.length
    ? await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", memberRows.map((member) => member.user_id))
    : { data: [], error: null };

  if (profileResult.error) {
    throw new Error("Impossible de charger les membres de l’organisation.");
  }

  const names = new Map((profileResult.data ?? []).map((profile) => [profile.id, profile.full_name]));
  const members: SettingsMember[] = memberRows.map((member) => {
    const isCurrentViewer = member.user_id === viewer.userId;
    return {
      id: member.id,
      name: names.get(member.user_id) ?? (isCurrentViewer ? viewer.email?.split("@")[0] : null) ?? "Membre de l’équipe",
      email: isCurrentViewer ? viewer.email : null,
      role: member.role,
      status: member.status,
      isCurrentViewer,
    };
  });

  return (
    <SettingsScreen
      organization={{
        name: organizationResult.data.name,
        sectorKey: organizationResult.data.sector_key,
        status: organizationResult.data.status,
        timezone: organizationResult.data.timezone,
        language: organizationResult.data.language,
        currency: organizationResult.data.currency,
      }}
      members={members}
      connections={buildSettingsConnections(integrationsResult.data ?? [])}
      canManage={canManageOrganization(viewer.role)}
    />
  );
}
