import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

/**
 * C22 — request lifecycle helpers. Two boolean RPCs wrapped as
 * discriminated unions.
 */

interface Deps { client?: SupabaseClient<Database>; }

export type RequestActionResult =
  | { status: "APPLIED" } | { status: "NOT_ELIGIBLE" } | { status: "ERROR"; reason: string };

export interface RecordFirstResponseInput {
  organizationId: string;
  requestId: string;
  responderUserId: string;
}

export async function recordRequestFirstResponse(
  input: RecordFirstResponseInput,
  deps: Deps = {},
): Promise<RequestActionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("record_request_first_response", {
    target_organization_id: input.organizationId,
    target_request_id: input.requestId,
    target_responder_user_id: input.responderUserId,
  });
  if (error) return { status: "ERROR", reason: `record_request_first_response: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

export interface RecordAcknowledgedInput {
  organizationId: string;
  requestId: string;
}

export async function recordRequestAcknowledged(
  input: RecordAcknowledgedInput,
  deps: Deps = {},
): Promise<RequestActionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("record_request_acknowledged", {
    target_organization_id: input.organizationId,
    target_request_id: input.requestId,
  });
  if (error) return { status: "ERROR", reason: `record_request_acknowledged: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}
