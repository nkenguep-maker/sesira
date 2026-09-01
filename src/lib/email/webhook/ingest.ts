import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createWorkflowAttention } from "@/lib/attention/create";
import type { InboundReplyEnvelope } from "@/lib/email/webhook/envelope";
import {
  inboundMessageKey,
  parseOutboundMessageIntentKey,
} from "@/lib/idempotency/keys";
import { createServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/types/database";

/**
 * C10 inbound reply ingest orchestrator. Runs as service_role via the
 * caller (webhook route handler). Steps:
 *
 *   1. Match: look up the outbound send this reply is answering by
 *      normalized In-Reply-To → outbound_messages.provider_message_id
 *      → (organization_id, idempotency_key). Extract the quote_id
 *      from the outbound key via `parseOutboundMessageIntentKey`.
 *      No match → return UNMATCHED (the webhook is acknowledged 200
 *      by the route so Svix does not keep retrying).
 *
 *   2. `record_inbound_message` insert-once by
 *      (organization_id, inboundMessageKey(provider, providerEventId)).
 *      This IS the dedup boundary — a Svix retry that reaches us
 *      after step 1 returns `created=false` and the rest of the
 *      pipeline no-ops (no duplicate event, no duplicate attention,
 *      no re-transition).
 *
 *   3. Emit `quote.reply_received` event, deduped on the message id.
 *   4. `mark_quote_replied` state transition (SENT/FOLLOWING_UP/
 *      NEEDS_HUMAN → REPLIED). Idempotent: returns false if the
 *      quote is already REPLIED or in a terminal state.
 *   5. Emit `REPLY_NEEDS_REVIEW` Attention linked to the quote.
 *
 * The orchestrator NEVER throws for provider-observable states — it
 * returns a discriminated union so the route can pick the response
 * shape without a try/catch.
 */

export type IngestInboundReplyResult =
  | {
      status: "ACCEPTED";
      organizationId: string;
      quoteId: string;
      messageId: string;
      created: boolean;
      quoteTransitioned: boolean;
      attentionId: string;
    }
  | { status: "REPLAY_MESSAGE"; organizationId: string; quoteId: string; messageId: string }
  | { status: "UNMATCHED"; providerEventId: string; inReplyTo: string | null }
  | { status: "ERROR"; reason: string };

interface OutboundMatch {
  organization_id: string;
  idempotency_key: string;
  integration_id: string | null;
  provider_message_id: string;
}

export interface IngestInboundReplyDeps {
  client?: SupabaseClient<Database>;
}

export async function ingestInboundReply(
  envelope: InboundReplyEnvelope,
  deps: IngestInboundReplyDeps = {},
): Promise<IngestInboundReplyResult> {
  const supabase = deps.client ?? createServiceClient();

  // 1. Match on In-Reply-To → outbound_messages.provider_message_id.
  if (!envelope.inReplyTo) {
    return { status: "UNMATCHED", providerEventId: envelope.providerEventId, inReplyTo: null };
  }
  const matchQuery = await supabase
    .from("outbound_messages")
    .select("organization_id, idempotency_key, integration_id, provider_message_id")
    .eq("provider_message_id", envelope.inReplyTo)
    .limit(1)
    .maybeSingle();
  if (matchQuery.error) {
    return { status: "ERROR", reason: `outbound_messages lookup: ${matchQuery.error.message}` };
  }
  const match = matchQuery.data as OutboundMatch | null;
  if (!match) {
    return { status: "UNMATCHED", providerEventId: envelope.providerEventId, inReplyTo: envelope.inReplyTo };
  }
  const parsed = parseOutboundMessageIntentKey(match.idempotency_key);
  if (!parsed || parsed.kind !== "quote_followup") {
    return { status: "UNMATCHED", providerEventId: envelope.providerEventId, inReplyTo: envelope.inReplyTo };
  }
  const organizationId = match.organization_id;
  const quoteId = parsed.entityId;

  const customerRow = await supabase
    .from("quotes")
    .select("customer_id")
    .eq("id", quoteId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  const customerId = (customerRow.data as { customer_id: string } | null)?.customer_id ?? null;

  // 2. Insert the inbound message — insert-once by (org, key).
  const messageKey = inboundMessageKey(envelope.provider, envelope.providerEventId);
  const messageRpc = await supabase.rpc("record_inbound_message", {
    target_organization_id: organizationId,
    target_idempotency_key: messageKey,
    target_provider: envelope.provider,
    target_provider_message_id: envelope.messageId,
    target_customer_id: customerId,
    target_quote_id: quoteId,
    target_request_id: null,
    target_from_email: envelope.from,
    target_subject: envelope.subject,
    target_body_text: envelope.text,
    target_in_reply_to: envelope.inReplyTo,
    target_references_headers: envelope.references,
    target_raw_headers: (envelope.raw as never) ?? ({} as never),
    target_received_at: envelope.receivedAt.toISOString(),
  });
  if (messageRpc.error) {
    return { status: "ERROR", reason: `record_inbound_message: ${messageRpc.error.message}` };
  }
  const messageRow = extractInsertOnceRow(messageRpc.data);
  if (!messageRow) {
    return { status: "ERROR", reason: "record_inbound_message returned no row" };
  }
  if (!messageRow.created) {
    return { status: "REPLAY_MESSAGE", organizationId, quoteId, messageId: messageRow.id };
  }

  // 3. Emit `quote.reply_received` event, deduped on message id.
  const eventRpc = await supabase.rpc("insert_event_once", {
    target_organization_id: organizationId,
    target_idempotency_key: `event:quote_reply_received:${messageRow.id}`,
    target_type: "quote.reply_received",
    target_source: "INBOUND_WEBHOOK",
    target_entity_type: "quote",
    target_entity_id: quoteId,
    target_payload: {
      message_id: messageRow.id,
      provider: envelope.provider,
      provider_message_id: envelope.messageId,
      in_reply_to: envelope.inReplyTo,
    } as never,
  });
  if (eventRpc.error) {
    return { status: "ERROR", reason: `insert_event_once: ${eventRpc.error.message}` };
  }

  // 4. Quote transition (idempotent; returns false if not applicable).
  const transitionRpc = await supabase.rpc("mark_quote_replied", {
    target_organization_id: organizationId,
    target_quote_id: quoteId,
  });
  if (transitionRpc.error) {
    return { status: "ERROR", reason: `mark_quote_replied: ${transitionRpc.error.message}` };
  }
  const quoteTransitioned = transitionRpc.data === true;

  // 5. Attention — REPLY_NEEDS_REVIEW, scoped to (quote_reply, message.id)
  //    so a replay of the same webhook collapses onto the same item.
  const attention = await createWorkflowAttention({
    organizationId,
    reason: "REPLY_NEEDS_REVIEW",
    sourceKind: "quote_reply",
    sourceId: messageRow.id,
    title: envelope.subject.length > 0 ? envelope.subject : "Réponse client à traiter",
    explanation: buildReplyExplanation(envelope, quoteTransitioned),
    entity: { type: "quote", id: quoteId },
    metadata: {
      provider: envelope.provider,
      provider_event_id: envelope.providerEventId,
      inbound_message_id: messageRow.id,
      quote_transitioned: quoteTransitioned,
    },
    client: supabase,
  });

  return {
    status: "ACCEPTED",
    organizationId,
    quoteId,
    messageId: messageRow.id,
    created: messageRow.created,
    quoteTransitioned,
    attentionId: attention.id,
  };
}

interface InsertOnceRow {
  id: string;
  created: boolean;
}

function extractInsertOnceRow(data: unknown): InsertOnceRow | null {
  if (!data) return null;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.created !== "boolean") return null;
  return { id: r.id, created: r.created };
}

function buildReplyExplanation(envelope: InboundReplyEnvelope, transitioned: boolean): string {
  const base = `Reçu de ${envelope.from} · ${envelope.receivedAt.toISOString()}`;
  if (transitioned) return `${base}. Devis passé à REPLIED — à qualifier.`;
  return `${base}. Réponse enregistrée sans changement d'état (devis déjà terminal ou dans un état incompatible).`;
}
