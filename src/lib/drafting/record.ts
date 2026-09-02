import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { QuoteDraftGap } from "@/lib/drafting/schema";
import { quoteDraftGapsSchema } from "@/lib/drafting/schema";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

/**
 * C23 — write the drafter output to `quotes.draft_gaps`. Zod-
 * validated at the boundary; malformed input surfaces REJECTED
 * without touching the DB.
 */

export interface RecordDraftGapsInput {
  organizationId: string;
  quoteId: string;
  gaps: readonly QuoteDraftGap[];
  client?: SupabaseClient<Database>;
}

export type RecordDraftGapsResult =
  | { status: "RECORDED" }
  | { status: "NOT_ELIGIBLE"; reason: string }
  | { status: "REJECTED"; reason: string }
  | { status: "ERROR"; reason: string };

export async function recordQuoteDraftGaps(
  input: RecordDraftGapsInput,
): Promise<RecordDraftGapsResult> {
  const validation = quoteDraftGapsSchema.safeParse(input.gaps);
  if (!validation.success) {
    return { status: "REJECTED", reason: validation.error.message.slice(0, 400) };
  }
  const supabase = input.client ?? (await createClient());
  const { data, error } = await supabase.rpc("record_quote_draft_gaps", {
    target_organization_id: input.organizationId,
    target_quote_id: input.quoteId,
    target_draft_gaps: validation.data as never,
  });
  if (error) return { status: "ERROR", reason: `record_quote_draft_gaps: ${error.message}` };
  if (data === true) return { status: "RECORDED" };
  return { status: "NOT_ELIGIBLE", reason: "quote is not DRAFT or does not belong to org" };
}
