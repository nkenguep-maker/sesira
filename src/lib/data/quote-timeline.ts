import "server-only";

import { safeClient } from "@/lib/data/safe-client";

/**
 * V1 quote timeline read model. Returns an interleaved chronological
 * feed of the messages and events attached to a quote:
 *
 *   * outbound_messages (QUEUED / SENT / FAILED) — what SESIRA
 *     attempted or actually sent, with provider + status
 *   * inbound messages (from `messages` table, direction=INBOUND) —
 *     replies from the customer, with classification if available
 *   * events (quote.* types) — audit trail of workflow decisions
 *
 * The timeline is bounded by `limit` per stream and merged at the
 * end. A caller displaying "latest N items" will typically call this
 * with `limit=50` and slice further after render.
 */

export type QuoteTimelineItem =
  | {
      kind: "outbound";
      id: string;
      at: string;
      status: string;
      subject: string;
      toEmail: string;
      providerMessageId: string | null;
      errorClass: string | null;
    }
  | {
      kind: "inbound";
      id: string;
      at: string;
      subject: string | null;
      fromEmail: string;
      intent: string | null;
      confidence: number | null;
    }
  | {
      kind: "event";
      id: string;
      at: string;
      type: string;
      source: string;
      payload: Record<string, unknown>;
    };

export async function getQuoteTimeline(
  organizationId: string,
  quoteId: string,
  options: { limit?: number } = {},
): Promise<QuoteTimelineItem[]> {
  const supabase = await safeClient();
  if (!supabase) return [];
  const perStream = Math.min(options.limit ?? 50, 200);

  const [outbound, inbound, events] = await Promise.all([
    supabase
      .from("outbound_messages")
      .select("id, status, subject, to_email, provider_message_id, error_class, created_at, sent_at, failed_at")
      .eq("organization_id", organizationId)
      .ilike("idempotency_key", `outbound:quote_followup:${quoteId}:step:%`)
      .order("created_at", { ascending: false })
      .limit(perStream),
    supabase
      .from("messages")
      .select("id, subject, metadata, intent, confidence, received_at, created_at")
      .eq("organization_id", organizationId)
      .eq("quote_id", quoteId)
      .eq("direction", "INBOUND")
      .order("received_at", { ascending: false })
      .limit(perStream),
    supabase
      .from("events")
      .select("id, type, source, payload, created_at")
      .eq("organization_id", organizationId)
      .eq("entity_type", "quote")
      .eq("entity_id", quoteId)
      .order("created_at", { ascending: false })
      .limit(perStream),
  ]);

  const items: QuoteTimelineItem[] = [];

  for (const row of outbound.data ?? []) {
    items.push({
      kind: "outbound",
      id: row.id,
      at: row.sent_at ?? row.failed_at ?? row.created_at,
      status: row.status,
      subject: row.subject,
      toEmail: row.to_email,
      providerMessageId: row.provider_message_id,
      errorClass: row.error_class,
    });
  }
  for (const row of inbound.data ?? []) {
    const meta = (row.metadata as Record<string, unknown>) ?? {};
    items.push({
      kind: "inbound",
      id: row.id,
      at: row.received_at ?? row.created_at,
      subject: row.subject,
      fromEmail: typeof meta.from_email === "string" ? meta.from_email : "",
      intent: row.intent,
      confidence: row.confidence,
    });
  }
  for (const row of events.data ?? []) {
    items.push({
      kind: "event",
      id: row.id,
      at: row.created_at,
      type: row.type,
      source: row.source,
      payload: (row.payload as Record<string, unknown>) ?? {},
    });
  }

  items.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  return items;
}
