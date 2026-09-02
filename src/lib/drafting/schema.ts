import "server-only";

import { z } from "zod";

/**
 * C23 — quote draft skeleton + gap vocabulary.
 *
 * The drafter (AI-optional) analyses a qualified request and
 * produces two artifacts:
 *   1. A `QuoteDraftSkeleton` — structured proposal WITHOUT
 *      pricing / technical claims / discounts. Only fields the
 *      analyzer could reliably derive from stable inputs.
 *   2. A `QuoteDraftGap[]` list — every field the analyzer could
 *      NOT fill from stable inputs. The operator resolves each
 *      gap by hand before the draft leaves DRAFT.
 *
 * FIELDS THE ANALYZER MUST NEVER INVENT:
 *   * amount / discount / pricing of any kind
 *   * technical diagnosis / equipment recommendation
 *   * regulatory declaration / certification
 *   * commitment on delivery / warranty terms
 *
 * If any of these is missing → emit a gap; the operator provides.
 */

export const DRAFT_GAP_FIELDS = [
  "amount",
  "currency",
  "customer_display_name",
  "recipient_email",
  "customer_confirmation",
  "technical_diagnosis",
  "regulatory_documents",
  "delivery_terms",
  "warranty_terms",
  "other",
] as const;

export type DraftGapField = (typeof DRAFT_GAP_FIELDS)[number];

export const quoteDraftGapSchema = z.object({
  field: z.enum(DRAFT_GAP_FIELDS),
  reason: z.string().min(1).max(500),
});

export type QuoteDraftGap = z.infer<typeof quoteDraftGapSchema>;

export const quoteDraftGapsSchema = z.array(quoteDraftGapSchema).max(50);

export const quoteDraftSkeletonSchema = z.object({
  title: z.string().min(1).max(200),
  customerDisplayName: z.string().min(1).max(200).nullable(),
  requestSummary: z.string().max(2000).nullable(),
  currency: z.string().length(3).default("EUR"),
  gaps: quoteDraftGapsSchema,
});

export type QuoteDraftSkeleton = z.infer<typeof quoteDraftSkeletonSchema>;

/**
 * A draft is send-eligible only when the gap list is empty.
 * The DB does not enforce this — the send boundary (C9) does not
 * inspect draft_gaps; the operator UI is responsible for gating
 * the "Send" button off `isDraftSendEligible`.
 */
export function isDraftSendEligible(gaps: readonly QuoteDraftGap[]): boolean {
  return gaps.length === 0;
}
