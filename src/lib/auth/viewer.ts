import { cookies } from "next/headers";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

export type ViewerOrganization = {
  id: string;
  name: string;
  role: string;
  demoMode: boolean;
};

export type ViewerContext = {
  userId: string;
  email: string | null;
  role: string;
  organization: {
    id: string;
    name: string;
    sectorKey: string;
    status: string;
    featureFlags: Record<string, unknown>;
    demoMode: boolean;
  };
};

type ViewerSelection = {
  userId: string;
  email: string | null;
  organizations: Array<ViewerOrganization & {
    sectorKey: string;
    status: string;
    featureFlags: Record<string, unknown>;
  }>;
  selected: ViewerOrganization & {
    sectorKey: string;
    status: string;
    featureFlags: Record<string, unknown>;
  };
};

const getViewerSelection = cache(async (): Promise<ViewerSelection | null> => {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims?.sub) {
    return null;
  }

  const userId = claimsData.claims.sub;
  const { data: memberships, error: membershipsError } = await supabase
    .from("organization_members")
    .select("organization_id, role, created_at")
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .order("created_at", { ascending: true });

  if (membershipsError || !memberships?.length) {
    return null;
  }

  const organizationIds = memberships.map((membership) => membership.organization_id);
  const { data: organizations, error: organizationsError } = await supabase
    .from("organizations")
    .select("id, name, sector_key, status, feature_flags, config")
    .in("id", organizationIds);

  if (organizationsError || !organizations?.length) {
    return null;
  }

  const membershipByOrganization = new Map(
    memberships.map((membership) => [membership.organization_id, membership] as const),
  );

  const available = organizations
    .map((organization) => {
      const membership = membershipByOrganization.get(organization.id);
      if (!membership) return null;
      const featureFlags = jsonObject(organization.feature_flags);
      const config = jsonObject(organization.config);
      const demoMode = featureFlags.demo_mode === true || config.demo_mode === true || config.demo_data === true;
      return {
        id: organization.id,
        name: organization.name,
        role: membership.role,
        sectorKey: organization.sector_key,
        status: organization.status,
        featureFlags,
        demoMode,
      };
    })
    .filter((organization): organization is NonNullable<typeof organization> => organization !== null);

  if (!available.length) return null;

  const cookieStore = await cookies();
  const preferredOrganizationId = cookieStore.get("sesira_organization")?.value;
  const selected = available.find((organization) => organization.id === preferredOrganizationId)
    ?? available.find((organization) => !organization.demoMode)
    ?? available[0];

  return {
    userId,
    email: typeof claimsData.claims.email === "string" ? claimsData.claims.email : null,
    organizations: available,
    selected,
  };
});

export const getViewerContext = cache(async (): Promise<ViewerContext | null> => {
  const selection = await getViewerSelection();
  if (!selection) return null;

  return {
    userId: selection.userId,
    email: selection.email,
    role: selection.selected.role,
    organization: {
      id: selection.selected.id,
      name: selection.selected.name,
      sectorKey: selection.selected.sectorKey,
      status: selection.selected.status,
      featureFlags: selection.selected.featureFlags,
      demoMode: selection.selected.demoMode,
    },
  };
});

export const getViewerOrganizations = cache(async (): Promise<ViewerOrganization[]> => {
  const selection = await getViewerSelection();
  if (!selection) return [];
  return selection.organizations.map(({ id, name, role, demoMode }) => ({ id, name, role, demoMode }));
});

function jsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
