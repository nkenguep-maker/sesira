import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

interface Deps {
  client?: SupabaseClient<Database>;
}

export type ValuePolicyActionResult =
  | { status: "APPLIED" }
  | { status: "NOT_ELIGIBLE" }
  | { status: "ERROR"; reason: string };

export async function saveSoldNotScheduledPolicy(
  input: {
    organizationId: string;
    enabled: boolean;
    graceHours: number | null;
    highValueAmount: number | null;
    note: string | null;
  },
  deps: Deps = {},
): Promise<ValuePolicyActionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("set_sold_not_scheduled_policy" as never, {
    target_organization_id: input.organizationId,
    target_enabled: input.enabled,
    target_grace_hours: input.graceHours,
    target_high_value_amount: input.highValueAmount,
    target_note: input.note,
  } as never);
  if (error) return { status: "ERROR", reason: `set_sold_not_scheduled_policy: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

export async function setOpportunityOperationalNextStep(
  input: {
    organizationId: string;
    opportunityId: string;
    nextStepAt: Date | null;
    nextStepKind: string | null;
  },
  deps: Deps = {},
): Promise<ValuePolicyActionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("set_opportunity_operational_next_step" as never, {
    target_organization_id: input.organizationId,
    target_opportunity_id: input.opportunityId,
    target_next_step_at: input.nextStepAt?.toISOString() ?? null,
    target_next_step_kind: input.nextStepKind,
    target_source: "MANUAL",
  } as never);
  if (error) return { status: "ERROR", reason: `set_opportunity_operational_next_step: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}
