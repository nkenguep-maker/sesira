import { z } from "zod";

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
  reason: z.string().trim().min(1).max(500),
});

export const quoteDraftGapsSchema = z.array(quoteDraftGapSchema).max(50);

export type QuoteDraftGap = z.infer<typeof quoteDraftGapSchema>;

export const quoteDraftSkeletonSchema = z.object({
  title: z.string().trim().min(1).max(200),
  customerDisplayName: z.string().trim().min(1).max(200).nullable(),
  requestSummary: z.string().max(2000).nullable(),
  currency: z.string().length(3),
  gaps: quoteDraftGapsSchema,
});

export type QuoteDraftSkeleton = z.infer<typeof quoteDraftSkeletonSchema>;

export function isDraftSendEligible(input: {
  analyzedAt: string | null;
  gaps: readonly QuoteDraftGap[];
}): boolean {
  return input.analyzedAt !== null && input.gaps.length === 0;
}
