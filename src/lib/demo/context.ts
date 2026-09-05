import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

export const DEMO_ORGANIZATION_ID = "10000000-0000-4000-8000-000000000001";

export type DemoContext = {
  userId: string;
  role: string;
  organization: {
    id: string;
    name: string;
  };
};

export const getDemoContext = cache(async (): Promise<DemoContext | null> => {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (claimsError || !userId) return null;

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", DEMO_ORGANIZATION_ID)
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .maybeSingle();
  if (membershipError || !membership) return null;

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id,name,feature_flags")
    .eq("id", DEMO_ORGANIZATION_ID)
    .maybeSingle();
  if (organizationError || !organization) return null;

  const flags = organization.feature_flags && typeof organization.feature_flags === "object" && !Array.isArray(organization.feature_flags)
    ? organization.feature_flags as Record<string, unknown>
    : {};
  if (flags.demo_mode !== true) return null;

  return {
    userId,
    role: membership.role,
    organization: { id: organization.id, name: organization.name },
  };
});
