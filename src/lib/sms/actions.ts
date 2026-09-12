import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/database";

/**
 * C44 — SMS transactional server helpers.
 *
 * record_sms_intent is the only public entry. mark_sms_sent /
 * mark_sms_delivered / mark_sms_undeliverable are service_role RPCs
 * invoked from the send worker + webhook handler respectively.
 */

interface Deps { client?: SupabaseClient<Database>; }

export type SmsExecutionMode = "SHADOW" | "APPROVAL" | "AUTOMATIC";

export type OutboundSmsStatus =
  | "DRAFT" | "WAITING_FOR_APPROVAL" | "QUEUED" | "SENT" | "DELIVERED"
  | "FAILED" | "UNDELIVERED" | "CANCELLED" | "OPTED_OUT";

// -------- record_sms_intent --------

export interface RecordSmsIntentInput {
  organizationId: string;
  idempotencyKey: string;
  templateKey: string;
  templateVersion: number;
  toPhone: string;
  bodyText: string;
  variables?: Json | null;
  executionMode: SmsExecutionMode;
}

export type RecordSmsIntentResult =
  | { status: OutboundSmsStatus; messageId: string; created: boolean }
  | { status: "ERROR"; reason: string };

export async function recordSmsIntent(
  input: RecordSmsIntentInput,
  deps: Deps = {},
): Promise<RecordSmsIntentResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("record_sms_intent", {
    target_organization_id: input.organizationId,
    target_idempotency_key: input.idempotencyKey,
    target_template_key: input.templateKey,
    target_template_version: input.templateVersion,
    target_to_phone: input.toPhone,
    target_body_text: input.bodyText,
    target_variables_json: (input.variables ?? {}) as Json,
    target_execution_mode: input.executionMode,
  });
  if (error) return { status: "ERROR", reason: `record_sms_intent: ${error.message}` };
  const rows = (data ?? []) as Array<{ message_id: string; status: string; created: boolean }>;
  if (rows.length === 0) return { status: "ERROR", reason: "record_sms_intent returned no rows" };
  const r = rows[0];
  return { status: r.status as OutboundSmsStatus, messageId: r.message_id, created: r.created };
}

// -------- approve_sms --------

export interface ApproveSmsInput {
  organizationId: string;
  messageId: string;
  approverUserId: string;
}

export type ApproveSmsResult =
  | { status: "APPLIED" } | { status: "NOT_ELIGIBLE" } | { status: "ERROR"; reason: string };

export async function approveSms(
  input: ApproveSmsInput,
  deps: Deps = {},
): Promise<ApproveSmsResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("approve_sms", {
    target_organization_id: input.organizationId,
    target_message_id: input.messageId,
    target_approver_user_id: input.approverUserId,
  });
  if (error) return { status: "ERROR", reason: `approve_sms: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

// -------- record_sms_opt_out --------

export interface RecordSmsOptOutInput {
  organizationId: string;
  phoneE164: string;
  source: "MANUAL" | "SMS_REPLY" | "IMPORT" | "PROVIDER";
  note?: string | null;
}

export async function recordSmsOptOut(
  input: RecordSmsOptOutInput,
  deps: Deps = {},
): Promise<{ status: "APPLIED"; optOutId: string } | { status: "ERROR"; reason: string }> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("record_sms_opt_out", {
    target_organization_id: input.organizationId,
    target_phone_e164: input.phoneE164,
    target_source: input.source,
    target_note: input.note ?? null,
  });
  if (error) return { status: "ERROR", reason: `record_sms_opt_out: ${error.message}` };
  return { status: "APPLIED", optOutId: data as string };
}

// -------- mark_sms_sent / delivered / undeliverable (service_role paths) --------

export async function markSmsSent(
  organizationId: string,
  messageId: string,
  integrationId: string,
  providerMessageId: string,
  sentAt: Date,
  deps: Deps = {},
): Promise<{ status: "APPLIED" } | { status: "NOT_ELIGIBLE" } | { status: "ERROR"; reason: string }> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("mark_sms_sent", {
    target_organization_id: organizationId,
    target_message_id: messageId,
    target_integration_id: integrationId,
    target_provider_message_id: providerMessageId,
    target_sent_at: sentAt.toISOString(),
  });
  if (error) return { status: "ERROR", reason: `mark_sms_sent: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

export async function markSmsDelivered(
  organizationId: string,
  messageId: string,
  deliveredAt: Date,
  deps: Deps = {},
): Promise<{ status: "APPLIED" } | { status: "NOT_ELIGIBLE" } | { status: "ERROR"; reason: string }> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("mark_sms_delivered", {
    target_organization_id: organizationId,
    target_message_id: messageId,
    target_delivered_at: deliveredAt.toISOString(),
  });
  if (error) return { status: "ERROR", reason: `mark_sms_delivered: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

export async function markSmsUndeliverable(
  organizationId: string,
  messageId: string,
  errorClass: "TRANSIENT" | "PERMANENT",
  errorMessage: string,
  deps: Deps = {},
): Promise<{ status: "APPLIED" } | { status: "NOT_ELIGIBLE" } | { status: "ERROR"; reason: string }> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("mark_sms_undeliverable", {
    target_organization_id: organizationId,
    target_message_id: messageId,
    target_error_class: errorClass,
    target_error_message: errorMessage,
  });
  if (error) return { status: "ERROR", reason: `mark_sms_undeliverable: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}
