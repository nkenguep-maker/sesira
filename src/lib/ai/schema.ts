import "server-only";

import { z } from "zod";
import { COMMERCIAL_OBJECTION_KINDS, isSensitiveObjectionKind } from "@/lib/commercial/objections";

export const REPLY_INTENTS = ["ACCEPTED_QUOTE","PRICE_OBJECTION","REQUEST_INFO","POSTPONED","COMPLAINT","OTHER"] as const;
export type ReplyIntent = (typeof REPLY_INTENTS)[number];

export const replyClassificationSchema = z.object({
  intent: z.enum(REPLY_INTENTS),
  confidence: z.number().min(0).max(1),
  summary: z.string().min(1).max(500),
  objection: z.object({
    kind: z.enum(COMMERCIAL_OBJECTION_KINDS),
    confidence: z.number().min(0).max(1),
    summary: z.string().min(1).max(500),
    evidence: z.string().min(1).max(1000).nullable().optional(),
  }).nullable().optional(),
  extracted_amount: z.object({ value: z.number().nonnegative(), currency: z.string().min(3).max(3) }).nullable().optional(),
  extracted_date: z.object({ value_iso: z.string().min(10).max(35), kind: z.enum(["APPOINTMENT","DEADLINE","AVAILABILITY"]) }).nullable().optional(),
});

export type ReplyClassification = z.infer<typeof replyClassificationSchema>;
export const REPLY_CLASSIFICATION_PROMPT_VERSION = "2";

export function isSensitiveIntent(intent: ReplyIntent): boolean { return intent === "COMPLAINT" || intent === "PRICE_OBJECTION"; }
export function isSensitiveClassification(classification: ReplyClassification): boolean {
  return isSensitiveIntent(classification.intent) || Boolean(classification.objection && isSensitiveObjectionKind(classification.objection.kind));
}
export const REPLY_CLASSIFICATION_MIN_CONFIDENCE = 0.5;
