import "server-only";

import { z } from "zod";

const emptyToNull = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null));

const optionalEmail = z
  .string()
  .trim()
  .email()
  .optional()
  .or(z.literal(""))
  .transform((value) => (value && value.length > 0 ? value : null));

function parseNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return value;
  const normalized = value.trim().replace(/\s/g, "").replace(",", ".");
  if (normalized === "") return undefined;
  return Number(normalized);
}

const requiredMoney = z.preprocess(parseNumber, z.number().finite().min(0));
const optionalMoney = z
  .preprocess(parseNumber, z.number().finite().min(0).optional())
  .transform((value) => value ?? null);

const requiredInteger = (min: number, max: number) =>
  z.preprocess(parseNumber, z.number().int().min(min).max(max));

function parseBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return value;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "oui", "ja"].includes(normalized)) return true;
  if (["0", "false", "no", "non", "nein", ""].includes(normalized)) return false;
  return value;
}

const csvBoolean = z.preprocess(parseBoolean, z.boolean().default(false));

const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : null))
  .refine(
    (value) =>
      value === null ||
      (/^\d{4}-\d{2}-\d{2}$/.test(value) &&
        !Number.isNaN(Date.parse(`${value}T00:00:00Z`))),
    "date must use YYYY-MM-DD",
  );

const optionalTimestamp = z
  .string()
  .trim()
  .optional()
  .transform((value) => {
    if (!value) return null;
    const timestamp = Date.parse(value);
    return Number.isNaN(timestamp) ? value : new Date(timestamp).toISOString();
  })
  .refine(
    (value) => value === null || !Number.isNaN(Date.parse(value)),
    "timestamp must be a valid ISO date/time",
  );

const currency = z
  .string()
  .trim()
  .length(3)
  .default("EUR")
  .transform((value) => value.toUpperCase());

const customerReferenceFields = {
  customer_external_id: emptyToNull(200),
  customer_external_provider: emptyToNull(64),
  customer_email: optionalEmail,
};

const quoteReferenceFields = {
  quote_external_id: emptyToNull(200),
  quote_external_provider: emptyToNull(64),
  quote_reference: emptyToNull(200),
};

function hasCustomerReference(value: {
  customer_external_id: string | null;
  customer_email: string | null;
}) {
  return Boolean(value.customer_external_id || value.customer_email);
}

export const customerRowSchema = z.object({
  external_id: z.string().trim().min(1).max(200),
  external_provider: z.string().trim().min(1).max(64).default("csv_import"),
  type: z.enum(["PERSON", "COMPANY"]).default("PERSON"),
  display_name: z.string().trim().min(1).max(200),
  company_name: emptyToNull(200),
  email: optionalEmail,
  phone: emptyToNull(64),
});

export const quoteRowSchema = z
  .object({
    external_id: z.string().trim().min(1).max(200),
    external_provider: z.string().trim().min(1).max(64).default("csv_import"),
    ...customerReferenceFields,
    reference: emptyToNull(200),
    title: z.string().trim().min(1).max(200),
    amount: optionalMoney,
    currency,
    status: z
      .enum([
        "DRAFT",
        "SENT",
        "FOLLOWING_UP",
        "REPLIED",
        "NEEDS_HUMAN",
        "WON",
        "LOST",
        "EXPIRED",
      ])
      .default("DRAFT"),
    sent_at: optionalTimestamp,
    expires_at: optionalTimestamp,
  })
  .refine(hasCustomerReference, {
    message: "provide customer_external_id or customer_email",
    path: ["customer_external_id"],
  });

export const invoiceRowSchema = z
  .object({
    external_ref: z.string().trim().min(1).max(200),
    ...customerReferenceFields,
    ...quoteReferenceFields,
    amount: requiredMoney,
    currency,
    status: z
      .enum(["DRAFT", "ISSUED", "OVERDUE", "PAID", "CANCELLED"])
      .default("DRAFT"),
    issued_at: optionalTimestamp,
    due_at: optionalTimestamp,
    paid_at: optionalTimestamp,
  })
  .refine(hasCustomerReference, {
    message: "provide customer_external_id or customer_email",
    path: ["customer_external_id"],
  });

export const equipmentRowSchema = z
  .object({
    external_ref: z.string().trim().min(1).max(200),
    ...customerReferenceFields,
    label: z.string().trim().min(1).max(200),
    installation_address: emptyToNull(500),
    equipment_category: z.string().trim().min(1).max(100),
    fluid_code: z.string().trim().min(1).max(60),
    charge_kg: requiredMoney,
    is_hermetic: csvBoolean,
    is_residential: csvBoolean,
    is_mobile: csvBoolean,
    has_leak_detector: csvBoolean,
    commissioned_at: optionalDate,
    decommissioned_at: optionalDate,
    status: z.enum(["ACTIVE", "DECOMMISSIONED"]).default("ACTIVE"),
  })
  .refine(hasCustomerReference, {
    message: "provide customer_external_id or customer_email",
    path: ["customer_external_id"],
  })
  .refine(
    (value) =>
      !value.commissioned_at ||
      !value.decommissioned_at ||
      value.decommissioned_at >= value.commissioned_at,
    {
      message: "decommissioned_at must be on or after commissioned_at",
      path: ["decommissioned_at"],
    },
  );

export const maintenanceContractRowSchema = z
  .object({
    external_ref: z.string().trim().min(1).max(200),
    ...customerReferenceFields,
    ...quoteReferenceFields,
    title: z.string().trim().min(1).max(200),
    cadence_days: requiredInteger(7, 3650),
    amount: optionalMoney,
    currency,
    status: z
      .enum(["DRAFT", "ACTIVE", "EXPIRING_SOON", "EXPIRED", "CANCELLED"])
      .default("DRAFT"),
    start_date: optionalDate,
    end_date: optionalDate,
  })
  .refine(hasCustomerReference, {
    message: "provide customer_external_id or customer_email",
    path: ["customer_external_id"],
  })
  .refine(
    (value) =>
      !value.start_date || !value.end_date || value.end_date >= value.start_date,
    {
      message: "end_date must be on or after start_date",
      path: ["end_date"],
    },
  );

export type CustomerRow = z.infer<typeof customerRowSchema>;
export type QuoteRow = z.infer<typeof quoteRowSchema>;
export type InvoiceRow = z.infer<typeof invoiceRowSchema>;
export type EquipmentRow = z.infer<typeof equipmentRowSchema>;
export type MaintenanceContractRow = z.infer<
  typeof maintenanceContractRowSchema
>;

export type ImportKind =
  | "customers"
  | "quotes"
  | "invoices"
  | "equipment"
  | "maintenance_contracts";

export const IMPORT_KINDS: readonly ImportKind[] = [
  "customers",
  "quotes",
  "invoices",
  "equipment",
  "maintenance_contracts",
] as const;

export function isImportKind(value: string): value is ImportKind {
  return (IMPORT_KINDS as readonly string[]).includes(value);
}
