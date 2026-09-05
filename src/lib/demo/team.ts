import "server-only";

import { createClient } from "@/lib/supabase/server";

export type DemoTeamMember = {
  id: string;
  email: string | null;
  fullName: string | null;
  role: string;
  status: string;
  createdAt: string;
};

export async function getDemoTeamMembers(organizationId: string): Promise<DemoTeamMember[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("organizations").select("config").eq("id", organizationId).maybeSingle();
  if (error || !data) return [];

  const config = data.config && typeof data.config === "object" && !Array.isArray(data.config)
    ? data.config as Record<string, unknown>
    : {};
  const rawTeam = Array.isArray(config.demo_team) ? config.demo_team : [];

  return rawTeam.flatMap((row): DemoTeamMember[] => {
    if (!row || typeof row !== "object" || Array.isArray(row)) return [];
    const item = row as Record<string, unknown>;
    const id = text(item.id);
    const role = text(item.role);
    const status = text(item.status);
    const createdAt = text(item.created_at);
    if (!id || !role || !status || !createdAt) return [];
    return [{ id, role, status, createdAt, email: nullable(item.email), fullName: nullable(item.full_name) }];
  });
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function nullable(value: unknown) {
  return text(value) || null;
}
