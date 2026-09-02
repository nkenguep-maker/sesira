import "server-only";

import type {
  ClassifyReplyInput,
  ClassifyReplyResult,
  ReplyClassifierProvider,
} from "@/lib/ai/provider";
import {
  REPLY_INTENTS,
  replyClassificationSchema,
} from "@/lib/ai/schema";

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const CLAUDE_API_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-haiku-4-5-20251001";

/**
 * Claude reply classifier — uses the Anthropic Messages API with a
 * tool_use spec to force a strict JSON output. We do NOT rely on
 * loose text parsing: the tool schema is the contract, and the
 * runner rejects anything that does not validate against
 * `replyClassificationSchema`.
 */
export interface ClaudeProviderOptions {
  apiKey: string;
  model?: string;
  fetchImpl?: typeof fetch;
  maxTokens?: number;
}

export function createClaudeReplyClassifier(options: ClaudeProviderOptions): ReplyClassifierProvider {
  if (typeof options.apiKey !== "string" || options.apiKey.length === 0) {
    throw new RangeError("createClaudeReplyClassifier: apiKey is required");
  }
  const model = options.model && options.model.length > 0 ? options.model : DEFAULT_MODEL;
  const fetchImpl = options.fetchImpl ?? fetch;
  const maxTokens = options.maxTokens ?? 400;

  return {
    name: "claude",
    model,
    async classify(input: ClassifyReplyInput): Promise<ClassifyReplyResult> {
      const startedAt = Date.now();

      const payload = {
        model,
        max_tokens: maxTokens,
        temperature: 0,
        system: SYSTEM_PROMPT,
        tools: [CLASSIFY_TOOL],
        tool_choice: { type: "tool", name: "classify_reply" },
        messages: [
          {
            role: "user",
            content: buildUserPrompt(input),
          },
        ],
      };

      let response: Response;
      try {
        response = await fetchImpl(CLAUDE_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": options.apiKey,
            "anthropic-version": CLAUDE_API_VERSION,
          },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        return {
          status: "FAILED",
          errorClass: "TRANSIENT",
          errorMessage: `claude: network error — ${(err as Error).message}`,
          model,
          latencyMs: Date.now() - startedAt,
        };
      }

      if (response.status >= 500 || response.status === 429) {
        return {
          status: "FAILED",
          errorClass: "TRANSIENT",
          errorMessage: `claude: HTTP ${response.status}`,
          model,
          latencyMs: Date.now() - startedAt,
        };
      }
      if (response.status >= 400) {
        return {
          status: "FAILED",
          errorClass: "PERMANENT",
          errorMessage: `claude: HTTP ${response.status}`,
          model,
          latencyMs: Date.now() - startedAt,
        };
      }

      let body: unknown;
      try {
        body = await response.json();
      } catch (err) {
        return {
          status: "FAILED",
          errorClass: "PERMANENT",
          errorMessage: `claude: malformed body — ${(err as Error).message}`,
          model,
          latencyMs: Date.now() - startedAt,
        };
      }

      const parsedTool = extractToolUse(body);
      if (!parsedTool) {
        return {
          status: "FAILED",
          errorClass: "PERMANENT",
          errorMessage: "claude: response did not include a classify_reply tool_use",
          model,
          latencyMs: Date.now() - startedAt,
        };
      }

      const validation = replyClassificationSchema.safeParse(parsedTool);
      if (!validation.success) {
        return {
          status: "FAILED",
          errorClass: "PERMANENT",
          errorMessage: `claude: tool_use payload did not validate — ${validation.error.message.slice(0, 400)}`,
          model,
          latencyMs: Date.now() - startedAt,
        };
      }

      const usage = extractUsage(body);
      return {
        status: "SUCCEEDED",
        classification: validation.data,
        model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        latencyMs: Date.now() - startedAt,
      };
    },
  };
}

const SYSTEM_PROMPT = `You classify inbound email replies to sales quotes. You return exactly one classify_reply tool call. You NEVER draft a reply, you NEVER take any action. Your only job is to label the intent and extract a small set of structured fields the human operator will use.

Rules:
- The intent is chosen from a small fixed vocabulary.
- The confidence is a calibrated estimate in [0, 1]. Reserve values > 0.85 for cases where the reply is unambiguous. Use 0.5 or below when in doubt.
- The summary is one short sentence in the same language as the reply.
- Extract an amount only if the reply explicitly mentions a numeric price (not the original quote amount echoed back).
- Extract a date only if the reply mentions a specific appointment, deadline, or availability window. Return ISO 8601 (date or date-time).
- If the reply is an auto-reply, out-of-office, or unrelated forwarded thread, use OTHER with confidence <= 0.4.`;

const CLASSIFY_TOOL = {
  name: "classify_reply",
  description: "Return the structured classification of the inbound reply.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      intent: {
        type: "string",
        enum: REPLY_INTENTS,
        description: "The single best-fit intent bucket.",
      },
      confidence: {
        type: "number",
        minimum: 0,
        maximum: 1,
      },
      summary: {
        type: "string",
        minLength: 1,
        maxLength: 500,
      },
      extracted_amount: {
        type: ["object", "null"],
        properties: {
          value: { type: "number", minimum: 0 },
          currency: { type: "string", minLength: 3, maxLength: 3 },
        },
        required: ["value", "currency"],
        additionalProperties: false,
      },
      extracted_date: {
        type: ["object", "null"],
        properties: {
          value_iso: { type: "string", minLength: 10, maxLength: 35 },
          kind: { type: "string", enum: ["APPOINTMENT", "DEADLINE", "AVAILABILITY"] },
        },
        required: ["value_iso", "kind"],
        additionalProperties: false,
      },
    },
    required: ["intent", "confidence", "summary"],
  },
} as const;

function buildUserPrompt(input: ClassifyReplyInput): string {
  const parts: string[] = [];
  parts.push(`Subject: ${input.subject || "(no subject)"}`);
  if (input.quoteContext) {
    const { reference, amount, currency } = input.quoteContext;
    const ctxPieces: string[] = [];
    if (reference) ctxPieces.push(`reference=${reference}`);
    if (amount !== null && currency !== null) ctxPieces.push(`quote_amount=${amount} ${currency}`);
    if (ctxPieces.length > 0) parts.push(`Quote context: ${ctxPieces.join(", ")}`);
  }
  parts.push("");
  parts.push("Reply body:");
  parts.push(input.body.slice(0, 8000));
  return parts.join("\n");
}

interface ClaudeContentBlock {
  type?: unknown;
  name?: unknown;
  input?: unknown;
}

interface ClaudeUsage {
  input_tokens?: unknown;
  output_tokens?: unknown;
}

function extractToolUse(body: unknown): unknown {
  if (!isPlainObject(body)) return null;
  const content = (body as { content?: unknown }).content;
  if (!Array.isArray(content)) return null;
  for (const raw of content) {
    if (!isPlainObject(raw)) continue;
    const block = raw as ClaudeContentBlock;
    if (block.type === "tool_use" && block.name === "classify_reply" && isPlainObject(block.input)) {
      return block.input;
    }
  }
  return null;
}

function extractUsage(body: unknown): { inputTokens: number | null; outputTokens: number | null } {
  if (!isPlainObject(body)) return { inputTokens: null, outputTokens: null };
  const usage = (body as { usage?: unknown }).usage;
  if (!isPlainObject(usage)) return { inputTokens: null, outputTokens: null };
  const u = usage as ClaudeUsage;
  return {
    inputTokens: typeof u.input_tokens === "number" ? u.input_tokens : null,
    outputTokens: typeof u.output_tokens === "number" ? u.output_tokens : null,
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
