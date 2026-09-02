import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type Deps = { client?: SupabaseClient<Database> };

export type SpeedToLeadActionResult =
  | { status: "APPLIED" }
  | { status: "NOT_ELIGIBLE" }
  | { status: "ERROR"; reason: string };

export async function saveSpeedToLeadPolicy(
  input: { organizationId: string; enabled: boolean; targetMinutes: number | null; note: string | null },
  deps: Deps = {},
): Promise<SpeedToLeadActionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("set_speed_to_lead_policy" as never, {
    target_organization_id: input.organizationId,
    target_enabled: input.enabled,
    target_minutes: input.targetMinutes,
    target_note: input.note,
  } as never);
  if (error) return { status: "ERROR", reason: `set_speed_to_lead_policy: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

export async function evaluateSpeedToLead(
  organizationId: string,
  limit = 500,
  deps: Deps = {},
): Promise<{ status: "APPLIED"; evaluated: number } | { status: "ERROR"; reason: string }> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("evaluate_speed_to_lead" as never, {
    target_organization_id: organizationId,
    target_limit: limit,
  } as never);
  if (error) return { status: "ERROR", reason: `evaluate_speed_to_lead: ${error.message}` };
  return { status: "APPLIED", evaluated: typeof data === "number" ? data : 0 };
}
