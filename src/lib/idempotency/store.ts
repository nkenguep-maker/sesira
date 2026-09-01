import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Result shape shared by every replay-safe insert. `created` distinguishes
 * "we inserted this row now" from "this row already existed" so a caller
 * can suppress downstream duplicate effects (e.g. don't re-emit an event
 * for a row that was already there) without a second read.
 */
export interface InsertOnceResult {
  id: string;
  created: boolean;
}

interface RpcRow {
  id: string;
  created: boolean;
}

function unwrap(
  operation: string,
  data: RpcRow[] | RpcRow | null,
  error: { message: string } | null,
): InsertOnceResult {
  if (error) throw new Error(`${operation}: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error(`${operation}: RPC returned no row`);
  if (typeof row.id !== "string" || typeof row.created !== "boolean") {
    throw new Error(`${operation}: RPC returned malformed row`);
  }
  return { id: row.id, created: row.created };
}

export interface InsertEventOnceInput {
  organizationId: string;
  idempotencyKey: string;
  type: string;
  source: string;
  entityType?: string | null;
  entityId?: string | null;
  payload?: Record<string, unknown> | null;
}

/**
 * Insert an event exactly once. Two concurrent calls with the same
 * `(organizationId, idempotencyKey)` observe one row and one
 * `created=true` — the loser sees the winner's id with `created=false`.
 *
 * The caller MUST have computed `idempotencyKey` from stable
 * identifiers via `src/lib/idempotency/keys`. Passing user-supplied
 * text here silently defeats replay safety.
 */
export async function insertEventOnce(
  input: InsertEventOnceInput,
): Promise<InsertOnceResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("insert_event_once", {
    target_organization_id: input.organizationId,
    target_idempotency_key: input.idempotencyKey,
    target_type: input.type,
    target_source: input.source,
    target_entity_type: input.entityType ?? null,
    target_entity_id: input.entityId ?? null,
    target_payload: (input.payload ?? {}) as never,
  });
  return unwrap("insertEventOnce", data as RpcRow[] | null, error);
}

export interface InsertAttentionOnceInput {
  organizationId: string;
  idempotencyKey: string;
  category: string;
  reason: string;
  title: string;
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  entityType?: string | null;
  entityId?: string | null;
  explanation?: string | null;
  suggestedAction?: string | null;
  assignedUserId?: string | null;
  dueAt?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Insert an Attention exactly once. Same replay semantics as
 * `insertEventOnce`. Never dedupes on `title` / `explanation` — those
 * are mutable business values.
 */
export async function insertAttentionOnce(
  input: InsertAttentionOnceInput,
): Promise<InsertOnceResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("insert_attention_once", {
    target_organization_id: input.organizationId,
    target_idempotency_key: input.idempotencyKey,
    target_category: input.category,
    target_reason: input.reason,
    target_title: input.title,
    target_priority: input.priority ?? "NORMAL",
    target_entity_type: input.entityType ?? null,
    target_entity_id: input.entityId ?? null,
    target_explanation: input.explanation ?? null,
    target_suggested_action: input.suggestedAction ?? null,
    target_assigned_user_id: input.assignedUserId ?? null,
    target_due_at: input.dueAt ?? null,
    target_metadata: (input.metadata ?? {}) as never,
  });
  return unwrap("insertAttentionOnce", data as RpcRow[] | null, error);
}

export interface RecordProviderDeliveryInput {
  organizationId: string;
  provider: string;
  providerEventId: string;
  eventType: string;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  payload?: Record<string, unknown> | null;
  receivedAt?: Date | null;
}

/**
 * Record a provider delivery receipt exactly once. Restricted to
 * service_role callers (webhook receivers). The receipt is keyed by
 * `(organization_id, provider, provider_event_id)` — a retried
 * callback from the provider resolves to the same row.
 */
export async function recordProviderDelivery(
  input: RecordProviderDeliveryInput,
): Promise<InsertOnceResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("record_provider_delivery", {
    target_organization_id: input.organizationId,
    target_provider: input.provider,
    target_provider_event_id: input.providerEventId,
    target_event_type: input.eventType,
    target_related_entity_type: input.relatedEntityType ?? null,
    target_related_entity_id: input.relatedEntityId ?? null,
    target_payload: (input.payload ?? {}) as never,
    target_received_at: input.receivedAt?.toISOString() ?? null,
  });
  return unwrap("recordProviderDelivery", data as RpcRow[] | null, error);
}

export interface RecordOutboundMessageIntentInput {
  organizationId: string;
  idempotencyKey: string;
  integrationId: string | null;
  providerName: string;
  channel: "email";
  toEmail: string;
  fromEmail: string;
  replyTo: string | null;
  subject: string;
  bodyHash: string;
}

/**
 * Record an outbound message send *intent* exactly once. The returned
 * `created` flag decides whether the caller should proceed to the
 * provider (`created=true`) or short-circuit as a replay
 * (`created=false`). Never call the provider before this returns.
 *
 * See C9 header in `20260905000000_outbound_message_boundary.sql` for
 * the boundary contract.
 */
export async function recordOutboundMessageIntent(
  input: RecordOutboundMessageIntentInput,
): Promise<InsertOnceResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("record_outbound_message_intent", {
    target_organization_id: input.organizationId,
    target_idempotency_key: input.idempotencyKey,
    target_integration_id: input.integrationId,
    target_provider: input.providerName,
    target_channel: input.channel,
    target_to_email: input.toEmail,
    target_from_email: input.fromEmail,
    target_reply_to: input.replyTo,
    target_subject: input.subject,
    target_body_hash: input.bodyHash,
  });
  return unwrap("recordOutboundMessageIntent", data as RpcRow[] | null, error);
}

export interface MarkOutboundMessageSentInput {
  organizationId: string;
  messageId: string;
  providerMessageId: string;
}

/**
 * Transition a QUEUED outbound_messages row to SENT. Returns true iff
 * exactly one row transitioned — a replay on an already-SENT row
 * returns false without side effect.
 */
export async function markOutboundMessageSent(
  input: MarkOutboundMessageSentInput,
): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mark_outbound_message_sent", {
    target_organization_id: input.organizationId,
    target_message_id: input.messageId,
    target_provider_message_id: input.providerMessageId,
  });
  if (error) throw new Error(`markOutboundMessageSent: ${error.message}`);
  return data === true;
}

export interface MarkOutboundMessageFailedInput {
  organizationId: string;
  messageId: string;
  errorClass: "TRANSIENT" | "PERMANENT";
  errorMessage: string;
}

/**
 * Transition a QUEUED outbound_messages row to FAILED. The error class
 * mirrors the retry runner (TRANSIENT vs PERMANENT). Returns true iff
 * exactly one row transitioned.
 */
export async function markOutboundMessageFailed(
  input: MarkOutboundMessageFailedInput,
): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mark_outbound_message_failed", {
    target_organization_id: input.organizationId,
    target_message_id: input.messageId,
    target_error_class: input.errorClass,
    target_error_message: input.errorMessage,
  });
  if (error) throw new Error(`markOutboundMessageFailed: ${error.message}`);
  return data === true;
}
