import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

/**
 * C25 — intervention server helpers. Two SECURITY DEFINER RPCs
 * wrapped as discriminated unions.
 */

interface Deps { client?: SupabaseClient<Database>; }

export type InterventionActionResult =
  | { status: "APPLIED" } | { status: "NOT_ELIGIBLE" } | { status: "ERROR"; reason: string };

export interface ScheduleInterventionInput {
  organizationId: string;
  interventionId: string;
  scheduledAt: Date;
  durationMinutes?: number | null;
}

export async function scheduleIntervention(
  input: ScheduleInterventionInput,
  deps: Deps = {},
): Promise<InterventionActionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("schedule_intervention", {
    target_organization_id: input.organizationId,
    target_intervention_id: input.interventionId,
    target_scheduled_at: input.scheduledAt.toISOString(),
    target_duration_minutes: input.durationMinutes ?? null,
  });
  if (error) return { status: "ERROR", reason: `schedule_intervention: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

export interface CompleteInterventionInput {
  organizationId: string;
  interventionId: string;
  notes?: string | null;
}

export async function completeIntervention(
  input: CompleteInterventionInput,
  deps: Deps = {},
): Promise<InterventionActionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("complete_intervention", {
    target_organization_id: input.organizationId,
    target_intervention_id: input.interventionId,
    target_notes: input.notes ?? null,
  });
  if (error) return { status: "ERROR", reason: `complete_intervention: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}
