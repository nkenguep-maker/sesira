import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

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
  client?: SupabaseClient<Database>;
}

export async function insertEventOnce(
  input: InsertEventOnceInput,
): Promise<InsertOnceResult> {
  const supabase = input.client ?? (await createClient());
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
  client?: SupabaseClient<Database>;
}

export async function insertAttentionOnce(
  input: InsertAttentionOnceInput,
): Promise<InsertOnceResult> {
  const supabase = input.client ?? (await createClient());
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
  client?: SupabaseClient<Database>;
}

export async function recordProviderDelivery(
  input: RecordProviderDeliveryInput,
): Promise<InsertOnceResult> {
  const supabase = input.client ?? (await createClient());
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
  client?: SupabaseClient<Database>;
}

export async function recordOutboundMessageIntent(
  input: RecordOutboundMessageIntentInput,
): Promise<InsertOnceResult> {
  const supabase = input.client ?? (await createClient());
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
  client?: SupabaseClient<Database>;
}

export async function markOutboundMessageSent(
  input: MarkOutboundMessageSentInput,
): Promise<boolean> {
  const supabase = input.client ?? (await createClient());
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
  client?: SupabaseClient<Database>;
}

export async function markOutboundMessageFailed(
  input: MarkOutboundMessageFailedInput,
): Promise<boolean> {
  const supabase = input.client ?? (await createClient());
  const { data, error } = await supabase.rpc("mark_outbound_message_failed", {
    target_organization_id: input.organizationId,
    target_message_id: input.messageId,
    target_error_class: input.errorClass,
    target_error_message: input.errorMessage,
  });
  if (error) throw new Error(`markOutboundMessageFailed: ${error.message}`);
  return data === true;
}
