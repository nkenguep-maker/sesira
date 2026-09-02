import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { ReplyObjectionInput } from "@/lib/objections/schema";
import { replyObjectionSchema } from "@/lib/objections/schema";
import { createServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/types/database";

/**
 * C20 — record an objection extracted by the C11 classifier (or a
 * future upstream). Service-role only (matches inbound record path).
 * Malformed input FAILS SAFELY — Zod validation errors surface as
 * REJECTED without touching the DB.
 */

export interface RecordReplyObjectionInput extends ReplyObjectionInput {
  organizationId: string;
  messageId: string;
  quoteId?: string | null;
  client?: SupabaseClient<Database>;
}

export type RecordReplyObjectionResult =
  | { status: "RECORDED"; objectionId: string; created: boolean }
  | { status: "REJECTED"; reason: string }
  | { status: "ERROR"; reason: string };

export async function recordReplyObjection(
  input: RecordReplyObjectionInput,
): Promise<RecordReplyObjectionResult> {
  const validation = replyObjectionSchema.safeParse({
    class: input.class,
    severity: input.severity,
    extractedAmount: input.extractedAmount ?? null,
    extractedCurrency: input.extractedCurrency ?? null,
    summary: input.summary ?? null,
    confidence: input.confidence ?? null,
  });
  if (!validation.success) {
    return { status: "REJECTED", reason: validation.error.message.slice(0, 400) };
  }

  const supabase = input.client ?? createServiceClient();
  const { data, error } = await supabase.rpc("record_reply_objection", {
    target_organization_id: input.organizationId,
    target_message_id: input.messageId,
    target_quote_id: input.quoteId ?? null,
    target_class: validation.data.class,
    target_severity: validation.data.severity,
    target_extracted_amount: validation.data.extractedAmount ?? null,
    target_extracted_currency: validation.data.extractedCurrency ?? null,
    target_summary: validation.data.summary ?? null,
    target_confidence: validation.data.confidence ?? null,
  });
  if (error) return { status: "ERROR", reason: `record_reply_objection: ${error.message}` };
  const row = Array.isArray(data) ? data[0] : (data as { id?: unknown; created?: unknown } | null);
  if (!row || typeof row.id !== "string" || typeof row.created !== "boolean") {
    return { status: "ERROR", reason: "record_reply_objection returned malformed row" };
  }
  return { status: "RECORDED", objectionId: row.id, created: row.created };
}
