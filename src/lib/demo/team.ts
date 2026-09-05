import "server-only";

import { createClient } from "@/lib/supabase/server";

export type DemoTeamMember = {
  id: string;
  userId: string;
  email: string | null;
  fullName: string | null;
  role: string;
  status: string;
  createdAt: string;
};

export async function getDemoTeamMembers(organizationId: string): Promise<DemoTeamMember[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("config")
    .eq("id", organizationId)
    .maybeSingle();

  if (error || !data) return [];
  const config = data.config && typeof data.config === "object" && !Array.isArray(data.config)
    ? data.config as Record<string, unknown>
    : {};
  const rawTeam = Array.isArray(config.demo_team) ? config.demo_team : [];

  return rawTeam.flatMap((row): DemoTeamMember[] => {
    if (!row || typeof row !== "object" || Array.isArray(row)) return [];
    const item = row as Record<string, unknown>;
    const id = stringValue(item.id);
    const role = stringValue(item.role);
    const status = stringValue(item.status);
    const createdAt = stringValue(item.created_at);
    if (!id || !role || !status || !createdAt) return [];

    return [{
      id,
      userId: id,
      email: nullableString(item.email),
      fullName: nullableString(item.full_name),
      role,
      status,
      createdAt,
    }];
  });
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim().length ? value.trim() : "";
}

function nullableString(value: unknown) {
  const result = stringValue(value);
  return result || null;
}
