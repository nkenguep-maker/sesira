import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { quoteDraftGapsSchema, type QuoteDraftGap } from "@/lib/drafting/schema";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type RecordDraftGapsResult =
  | { status: "RECORDED" }
  | { status: "NOT_ELIGIBLE"; reason: string }
  | { status: "REJECTED"; reason: string }
  | { status: "ERROR"; reason: string };

export async function recordQuoteDraftGaps(
  input: {
    organizationId: string;
    quoteId: string;
    gaps: readonly QuoteDraftGap[];
  },
  deps: { client?: SupabaseClient<Database> } = {},
): Promise<RecordDraftGapsResult> {
  const validation = quoteDraftGapsSchema.safeParse(input.gaps);
  if (!validation.success) {
    return { status: "REJECTED", reason: validation.error.message.slice(0, 400) };
  }

  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("record_quote_draft_gaps" as never, {
    target_organization_id: input.organizationId,
    target_quote_id: input.quoteId,
    target_draft_gaps: validation.data,
  } as never);

  if (error) return { status: "ERROR", reason: `record_quote_draft_gaps: ${error.message}` };
  return data === true
    ? { status: "RECORDED" }
    : { status: "NOT_ELIGIBLE", reason: "Le devis n’est pas un brouillon modifiable de cette organisation." };
}
