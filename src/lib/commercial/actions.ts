import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { CommercialObjectionKind } from "@/lib/commercial/objections";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export async function correctCommercialObjection(
  input: { organizationId: string; messageId: string; kind: CommercialObjectionKind | null; summary: string | null },
  deps: { client?: SupabaseClient<Database> } = {},
): Promise<{ status: "APPLIED" } | { status: "NOT_ELIGIBLE" } | { status: "ERROR"; reason: string }> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("correct_commercial_objection" as never, {
    target_organization_id: input.organizationId,
    target_message_id: input.messageId,
    target_kind: input.kind,
    target_summary: input.summary,
  } as never);
  if (error) return { status: "ERROR", reason: `correct_commercial_objection: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}
