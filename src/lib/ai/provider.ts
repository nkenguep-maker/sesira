import "server-only";

import type { ReplyClassification } from "@/lib/ai/schema";

/**
 * Provider-neutral input for the reply classifier. The runner keeps
 * the caller (`classifyMessageReply`) responsible for supplying the
 * business context (subject, body, optional quote metadata); the
 * provider adapter only knows how to talk to the LLM API.
 */
export interface ClassifyReplyInput {
  subject: string;
  body: string;
  quoteContext?: {
    reference: string | null;
    amount: number | null;
    currency: string | null;
  };
}

export interface ClassifyReplySuccess {
  status: "SUCCEEDED";
  classification: ReplyClassification;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  latencyMs: number;
}

export interface ClassifyReplyFailure {
  status: "FAILED";
  errorClass: "TRANSIENT" | "PERMANENT";
  errorMessage: string;
  model: string | null;
  latencyMs: number;
}

export type ClassifyReplyResult = ClassifyReplySuccess | ClassifyReplyFailure;

/**
 * Every LLM classifier adapter (Claude, OpenAI, ...) implements this
 * interface. Adapters MUST:
 *   * classify 5xx / 429 / network / timeout as TRANSIENT;
 *   * classify 4xx (except 429), invalid tool_use payload, or
 *     schema-invalid output as PERMANENT;
 *   * never throw for provider-observable errors — return a FAILED
 *     result so the runner can persist an ai_runs row with the class.
 */
export interface ReplyClassifierProvider {
  readonly name: string;
  readonly model: string;
  classify(input: ClassifyReplyInput): Promise<ClassifyReplyResult>;
}
