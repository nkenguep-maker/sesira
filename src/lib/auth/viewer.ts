import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

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
  };
};

export const getViewerContext = cache(async (): Promise<ViewerContext | null> => {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims?.sub) {
    return null;
  }

  const userId = claimsData.claims.sub;
  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .limit(1)
    .maybeSingle();

  if (membershipError || !membership) {
    return null;
  }

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id, name, sector_key, status, feature_flags")
    .eq("id", membership.organization_id)
    .single();

  if (organizationError || !organization) {
    return null;
  }

  return {
    userId,
    email: typeof claimsData.claims.email === "string" ? claimsData.claims.email : null,
    role: membership.role,
    organization: {
      id: organization.id,
      name: organization.name,
      sectorKey: organization.sector_key,
      status: organization.status,
      featureFlags: jsonObject(organization.feature_flags),
    },
  };
});

function jsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
