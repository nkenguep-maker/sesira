import { z } from "zod";

export const REQUEST_STATUSES = [
  "NEW",
  "PROCESSING",
  "NEEDS_INFO",
  "QUALIFIED",
  "READY",
  "ASSIGNED",
  "CLOSED",
  "SPAM",
  "LOST",
] as const;

export const REQUEST_SOURCES = [
  "MANUAL",
  "WEBSITE",
  "EMAIL",
  "FACEBOOK",
  "INSTAGRAM",
  "CRM",
  "GROWTH",
] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number];
export type RequestSource = (typeof REQUEST_SOURCES)[number];

const optionalText = (maximum: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(maximum).optional(),
  );

const optionalUuid = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.uuid().optional(),
);

export const requestInputSchema = z.object({
  customerId: z.uuid(),
  serviceCatalogItemId: optionalUuid,
  title: z.string().trim().min(2).max(200),
  source: z.enum(REQUEST_SOURCES),
  description: optionalText(5_000),
});

export const requestStatusInputSchema = z.object({
  requestId: z.uuid(),
  status: z.enum(REQUEST_STATUSES),
});

export const requestDataSchema = z
  .object({
    schema_version: z.literal(1),
    description: z.string().trim().max(5_000).optional(),
  })
  .passthrough();

const REQUEST_STATUS_TRANSITIONS: Record<RequestStatus, readonly RequestStatus[]> = {
  NEW: ["PROCESSING", "NEEDS_INFO", "QUALIFIED", "SPAM", "LOST"],
  PROCESSING: ["NEEDS_INFO", "QUALIFIED", "SPAM", "LOST"],
  NEEDS_INFO: ["PROCESSING", "QUALIFIED", "LOST"],
  QUALIFIED: ["READY", "NEEDS_INFO", "LOST"],
  READY: ["ASSIGNED", "CLOSED", "LOST"],
  ASSIGNED: ["READY", "CLOSED", "LOST"],
  CLOSED: [],
  SPAM: [],
  LOST: [],
};

export function isRequestStatus(value: string): value is RequestStatus {
  return REQUEST_STATUSES.some((status) => status === value);
}

export function isRequestSource(value: string): value is RequestSource {
  return REQUEST_SOURCES.some((source) => source === value);
}

export function getAllowedRequestStatuses(status: RequestStatus): readonly RequestStatus[] {
  return REQUEST_STATUS_TRANSITIONS[status];
}

export function canChangeRequestStatus(from: RequestStatus, to: RequestStatus): boolean {
  return REQUEST_STATUS_TRANSITIONS[from].includes(to);
}

export function createRequestData(description?: string) {
  return {
    schema_version: 1 as const,
    ...(description ? { description } : {}),
  };
}

export function readRequestDescription(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const description = Reflect.get(value, "description");
  return typeof description === "string" && description.trim() ? description.trim() : null;
}

export type RequestInput = z.infer<typeof requestInputSchema>;
