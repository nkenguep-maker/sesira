import "server-only";

import { z } from "zod";

/**
 * C20 — reply objection vocabulary. Orthogonal to the C11 reply
 * intent enum: a `PRICE_OBJECTION` reply intent typically produces a
 * `PRICE` objection here, but a reply intent `REQUEST_INFO` can also
 * carry a `TIMING` objection.
 *
 * Sensitive classes (PRICE, COMPLAINT, LEGAL, FINANCING_DECLINED)
 * emit an Attention on record — the DB does the routing so the TS
 * layer cannot forget.
 */

export const REPLY_OBJECTION_CLASSES = [
  "PRICE",
  "TIMING",
  "COMPETITOR",
  "FINANCING_DECLINED",
  "TECHNICAL_QUESTION",
  "NO_DECISION",
  "COMPLAINT",
  "NOT_INTERESTED",
  "LEGAL",
  "OTHER",
] as const;

export type ReplyObjectionClass = (typeof REPLY_OBJECTION_CLASSES)[number];

export const REPLY_OBJECTION_SEVERITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
export type ReplyObjectionSeverity = (typeof REPLY_OBJECTION_SEVERITIES)[number];

export function isReplyObjectionClass(value: string): value is ReplyObjectionClass {
  return (REPLY_OBJECTION_CLASSES as readonly string[]).includes(value);
}

export function isSensitiveObjectionClass(cls: ReplyObjectionClass): boolean {
  return cls === "PRICE" || cls === "COMPLAINT" || cls === "LEGAL" || cls === "FINANCING_DECLINED";
}

export const replyObjectionSchema = z.object({
  class: z.enum(REPLY_OBJECTION_CLASSES),
  severity: z.enum(REPLY_OBJECTION_SEVERITIES).default("NORMAL"),
  extractedAmount: z.number().nonnegative().nullable().optional(),
  extractedCurrency: z.string().length(3).nullable().optional(),
  summary: z.string().max(500).nullable().optional(),
  confidence: z.number().min(0).max(1).nullable().optional(),
});

export type ReplyObjectionInput = z.infer<typeof replyObjectionSchema>;
