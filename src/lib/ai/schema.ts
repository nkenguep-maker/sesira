import "server-only";

import { z } from "zod";

/**
 * Reply intent vocabulary. Deliberately small — a class is a coarse
 * bucket the operator needs, not a fine-grained sentiment. Every new
 * intent MUST land here with a dedicated commit and a rationale.
 *
 * `OTHER` is the catch-all — the classifier returns it when the reply
 * does not fit any bucket cleanly (auto-reply, unrelated forwarded
 * thread, spam that slipped past). The operator triages from there.
 */
export const REPLY_INTENTS = [
  "ACCEPTED_QUOTE",
  "PRICE_OBJECTION",
  "REQUEST_INFO",
  "POSTPONED",
  "COMPLAINT",
  "OTHER",
] as const;

export type ReplyIntent = (typeof REPLY_INTENTS)[number];

export const replyClassificationSchema = z.object({
  intent: z.enum(REPLY_INTENTS),
  confidence: z.number().min(0).max(1),
  summary: z.string().min(1).max(500),
  extracted_amount: z
    .object({
      value: z.number().nonnegative(),
      currency: z.string().min(3).max(3),
    })
    .nullable()
    .optional(),
  extracted_date: z
    .object({
      value_iso: z.string().min(10).max(35),
      kind: z.enum(["APPOINTMENT", "DEADLINE", "AVAILABILITY"]),
    })
    .nullable()
    .optional(),
});

export type ReplyClassification = z.infer<typeof replyClassificationSchema>;

/**
 * The public prompt version — bumped alongside a prompt or schema
 * change. Idempotency keys include the version so a version bump
 * legitimately re-runs the classifier while the same version replays
 * to the same ai_runs row.
 */
export const REPLY_CLASSIFICATION_PROMPT_VERSION = "1";

/**
 * Sensitive intents. A classification with `sensitive=true` MUST NOT
 * drive an autonomous action; the doctrine says the operator decides.
 * The runner uses this flag to bump the Attention priority to HIGH.
 */
export function isSensitiveIntent(intent: ReplyIntent): boolean {
  return intent === "COMPLAINT" || intent === "PRICE_OBJECTION";
}

/**
 * Confidence floor for auto-updating the message denorm. Below this
 * value we still record the ai_run for audit but do NOT touch
 * `messages.intent` — a downstream ops surface may re-classify or a
 * human may triage from the raw ai_run.
 */
export const REPLY_CLASSIFICATION_MIN_CONFIDENCE = 0.5;
