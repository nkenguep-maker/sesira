import { z } from "zod";

export const ATTENTION_PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
export const ATTENTION_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "DISMISSED"] as const;
export const ATTENTION_OPEN_STATUSES = ["OPEN", "IN_PROGRESS"] as const;
export const ATTENTION_CLOSED_STATUSES = ["RESOLVED", "DISMISSED"] as const;

export type AttentionPriority = (typeof ATTENTION_PRIORITIES)[number];
export type AttentionStatus = (typeof ATTENTION_STATUSES)[number];
export type AttentionResolution = (typeof ATTENTION_CLOSED_STATUSES)[number];

const optionalText = (maximum: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(maximum).optional(),
  );

const optionalDate = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.iso.date().optional(),
);

export const attentionResolutionSchema = z.object({
  attentionId: z.uuid(),
  intent: z.enum(ATTENTION_CLOSED_STATUSES),
});

export const manualQuoteAttentionInputSchema = z.object({
  quoteId: z.uuid(),
  title: z.string().trim().min(2).max(200),
  explanation: optionalText(2_000),
  suggestedAction: optionalText(500),
  priority: z.enum(ATTENTION_PRIORITIES),
  dueOn: optionalDate,
});

export function attentionDateToTimestamp(value?: string): string | null {
  return value ? `${value}T12:00:00.000Z` : null;
}

export function isAttentionPriority(value: string): value is AttentionPriority {
  return ATTENTION_PRIORITIES.includes(value as AttentionPriority);
}

export function isAttentionStatus(value: string): value is AttentionStatus {
  return ATTENTION_STATUSES.includes(value as AttentionStatus);
}

export function canCloseAttentionItem(status: string): status is (typeof ATTENTION_OPEN_STATUSES)[number] {
  return ATTENTION_OPEN_STATUSES.includes(status as (typeof ATTENTION_OPEN_STATUSES)[number]);
}
