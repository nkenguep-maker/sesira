import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { ReplyClassifierProvider } from "@/lib/ai/provider";
import {
  REPLY_CLASSIFICATION_MIN_CONFIDENCE,
  REPLY_CLASSIFICATION_PROMPT_VERSION,
  isSensitiveIntent,
} from "@/lib/ai/schema";
import { aiRunKey } from "@/lib/idempotency/keys";
import { createServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/types/database";

/**
 * C11 reply classifier runner. Given an inbound message and a
 * provider adapter, this function:
 *
 *   1. Runs the classifier (never throws — the adapter classifies
 *      errors as TRANSIENT vs PERMANENT).
 *   2. Persists an `ai_runs` row via `insert_ai_run_once`, keyed by
 *      `aiRunKey('reply_classification', messageId, promptVersion)`.
 *      Success rows carry the parsed classification; failed rows
 *      carry the error class + message.
 *   3. On SUCCESS with confidence >= REPLY_CLASSIFICATION_MIN_CONFIDENCE,
 *      denormalizes intent + confidence on the messages row via
 *      `record_message_classification` (idempotent, service_role only).
 *      Below the threshold, the ai_run is recorded but the denorm is
 *      left NULL — the operator triages from the raw ai_run.
 *
 * The runner returns a discriminated union describing the outcome.
 * IT NEVER TRIGGERS AN AUTONOMOUS ACTION. Doctrine: AI confidence is
 * a signal for the operator, not an authorization.
 */

export type ClassifyMessageReplyResult =
  | {
      status: "CLASSIFIED";
      messageId: string;
      aiRunId: string;
      intent: string;
      confidence: number;
      denormalized: boolean;
      sensitive: boolean;
    }
  | {
      status: "SKIPPED_ALREADY_CLASSIFIED";
      messageId: string;
    }
  | {
      status: "FAILED";
      messageId: string;
      aiRunId: string;
      errorClass: "TRANSIENT" | "PERMANENT";
      errorMessage: string;
    }
  | {
      status: "ERROR";
      reason: string;
    };

export interface ClassifyMessageReplyInput {
  organizationId: string;
  messageId: string;
  subject: string;
  body: string;
  quoteContext?: {
    reference: string | null;
    amount: number | null;
    currency: string | null;
  };
  provider: ReplyClassifierProvider;
}

export interface ClassifyMessageReplyDeps {
  client?: SupabaseClient<Database>;
}

export async function classifyMessageReply(
  input: ClassifyMessageReplyInput,
  deps: ClassifyMessageReplyDeps = {},
): Promise<ClassifyMessageReplyResult> {
  const supabase = deps.client ?? createServiceClient();

  const idempotencyKey = aiRunKey(
    "reply_classification",
    input.messageId,
    REPLY_CLASSIFICATION_PROMPT_VERSION,
  );

  const result = await input.provider.classify({
    subject: input.subject,
    body: input.body,
    quoteContext: input.quoteContext,
  });

  const inputSummary = {
    message_id: input.messageId,
    subject_len: input.subject.length,
    body_len: input.body.length,
    prompt_version: REPLY_CLASSIFICATION_PROMPT_VERSION,
    has_quote_context: input.quoteContext !== undefined,
  };

  if (result.status === "FAILED") {
    const runRpc = await supabase.rpc("insert_ai_run_once", {
      target_organization_id: input.organizationId,
      target_idempotency_key: idempotencyKey,
      target_feature: "reply_classification",
      target_entity_type: "message",
      target_entity_id: input.messageId,
      target_provider: input.provider.name,
      target_model: result.model ?? input.provider.model,
      target_prompt_version: REPLY_CLASSIFICATION_PROMPT_VERSION,
      target_input_summary: inputSummary as never,
      target_output: null,
      target_confidence: null,
      target_action: null,
      target_status: "FAILED",
      target_latency_ms: result.latencyMs,
      target_input_tokens: null,
      target_output_tokens: null,
      target_estimated_cost: null,
      target_error: `${result.errorClass}: ${result.errorMessage}`,
    });
    if (runRpc.error) {
      return { status: "ERROR", reason: `insert_ai_run_once(FAILED): ${runRpc.error.message}` };
    }
    const runRow = extractInsertOnceRow(runRpc.data);
    if (!runRow) return { status: "ERROR", reason: "insert_ai_run_once returned no row" };
    return {
      status: "FAILED",
      messageId: input.messageId,
      aiRunId: runRow.id,
      errorClass: result.errorClass,
      errorMessage: result.errorMessage,
    };
  }

  const runRpc = await supabase.rpc("insert_ai_run_once", {
    target_organization_id: input.organizationId,
    target_idempotency_key: idempotencyKey,
    target_feature: "reply_classification",
    target_entity_type: "message",
    target_entity_id: input.messageId,
    target_provider: input.provider.name,
    target_model: result.model,
    target_prompt_version: REPLY_CLASSIFICATION_PROMPT_VERSION,
    target_input_summary: inputSummary as never,
    target_output: result.classification as never,
    target_confidence: result.classification.confidence,
    target_action: null,
    target_status: "SUCCEEDED",
    target_latency_ms: result.latencyMs,
    target_input_tokens: result.inputTokens,
    target_output_tokens: result.outputTokens,
    target_estimated_cost: null,
    target_error: null,
  });
  if (runRpc.error) {
    return { status: "ERROR", reason: `insert_ai_run_once(SUCCEEDED): ${runRpc.error.message}` };
  }
  const runRow = extractInsertOnceRow(runRpc.data);
  if (!runRow) return { status: "ERROR", reason: "insert_ai_run_once returned no row" };

  let denormalized = false;
  if (result.classification.confidence >= REPLY_CLASSIFICATION_MIN_CONFIDENCE) {
    const denormRpc = await supabase.rpc("record_message_classification", {
      target_organization_id: input.organizationId,
      target_message_id: input.messageId,
      target_intent: result.classification.intent,
      target_confidence: result.classification.confidence,
    });
    if (denormRpc.error) {
      return { status: "ERROR", reason: `record_message_classification: ${denormRpc.error.message}` };
    }
    if (denormRpc.data === true) denormalized = true;
    if (denormRpc.data === false && !runRow.created) {
      // Replay observed the same run; the message was already
      // denormalized on the winning invocation.
      return { status: "SKIPPED_ALREADY_CLASSIFIED", messageId: input.messageId };
    }
  }

  return {
    status: "CLASSIFIED",
    messageId: input.messageId,
    aiRunId: runRow.id,
    intent: result.classification.intent,
    confidence: result.classification.confidence,
    denormalized,
    sensitive: isSensitiveIntent(result.classification.intent),
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
