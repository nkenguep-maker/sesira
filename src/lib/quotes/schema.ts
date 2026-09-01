import { z } from "zod";

export const QUOTE_STATUSES = [
  "DRAFT",
  "SENT",
  "FOLLOWING_UP",
  "REPLIED",
  "NEEDS_HUMAN",
  "WON",
  "LOST",
  "EXPIRED",
] as const;

export const QUOTE_DATE_FILTERS = ["ALL", "DUE", "NEXT_7_DAYS", "EXPIRING_30_DAYS"] as const;

export type QuoteStatus = (typeof QUOTE_STATUSES)[number];
export type QuoteDateFilter = (typeof QUOTE_DATE_FILTERS)[number];

const optionalText = (maximum: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(maximum).optional(),
  );

const optionalUuid = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.uuid().optional(),
);

const calendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  });

const optionalDate = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  calendarDate.optional(),
);

const amountSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const normalized = value.trim().replace(/\s/g, "").replace(",", ".");
  return normalized === "" ? Number.NaN : Number(normalized);
}, z.number().finite().min(0.01).max(999_999_999_999.99).multipleOf(0.01));

export const quoteInputSchema = z
  .object({
    customerId: z.uuid(),
    requestId: optionalUuid,
    ownerUserId: optionalUuid,
    title: z.string().trim().min(2).max(200),
    reference: optionalText(100),
    amount: amountSchema,
    expiresOn: optionalDate,
    nextActionOn: optionalDate,
  })
  .superRefine((value, context) => {
    if (value.expiresOn && value.nextActionOn && value.nextActionOn > value.expiresOn) {
      context.addIssue({
        code: "custom",
        message: "La prochaine date doit précéder l’expiration.",
        path: ["nextActionOn"],
      });
    }
  });

export const quoteStatusInputSchema = z.object({
  quoteId: z.uuid(),
  status: z.enum(QUOTE_STATUSES),
});

const QUOTE_STATUS_TRANSITIONS: Record<QuoteStatus, readonly QuoteStatus[]> = {
  DRAFT: ["SENT", "WON", "LOST"],
  SENT: ["FOLLOWING_UP", "REPLIED", "NEEDS_HUMAN", "WON", "LOST", "EXPIRED"],
  FOLLOWING_UP: ["REPLIED", "NEEDS_HUMAN", "WON", "LOST", "EXPIRED"],
  REPLIED: ["NEEDS_HUMAN", "WON", "LOST", "EXPIRED"],
  NEEDS_HUMAN: ["REPLIED", "WON", "LOST", "EXPIRED"],
  WON: [],
  LOST: [],
  EXPIRED: [],
};

export function isQuoteStatus(value: string): value is QuoteStatus {
  return QUOTE_STATUSES.some((status) => status === value);
}

export function isQuoteDateFilter(value: string): value is QuoteDateFilter {
  return QUOTE_DATE_FILTERS.some((filter) => filter === value);
}

export function getAllowedQuoteStatuses(status: QuoteStatus): readonly QuoteStatus[] {
  return QUOTE_STATUS_TRANSITIONS[status];
}

export function canChangeQuoteStatus(from: QuoteStatus, to: QuoteStatus): boolean {
  return QUOTE_STATUS_TRANSITIONS[from].includes(to);
}

export function quoteDateToTimestamp(value?: string): string | null {
  return value ? new Date(`${value}T12:00:00.000Z`).toISOString() : null;
}

export function quoteMetadata() {
  return { schema_version: 1 as const };
}

export type QuoteInput = z.infer<typeof quoteInputSchema>;
