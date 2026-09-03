import "server-only";

import { z } from "zod";

/**
 * C16 — per-kind Zod row schemas for the importer.
 *
 * V1 supports one kind: `customers`. The importer lib rejects any
 * other kind at the `runImport` entry point; `requests` / `quotes`
 * schemas land in later commits when the actual entity RPCs need
 * an importer.
 *
 * Every schema accepts a `string`-only source shape (the CSV
 * parser returns a `Record<string, string>`), coerces to typed
 * fields, and passes them to the entity write path. Emitting
 * numeric / boolean columns from Zod avoids downstream `?? ""`
 * boilerplate at every call site.
 *
 * The rows never carry an internal `id` (the entity RPC generates
 * one); they carry an `external_id` + `external_provider` pair that
 * lets a re-imported file collapse onto the existing row via
 * `productCreationKey`.
 */

export const customerRowSchema = z.object({
  external_id: z.string().min(1).max(200),
  external_provider: z.string().min(1).max(64).default("csv_import"),
  type: z.enum(["PERSON", "COMPANY"]).default("PERSON"),
  display_name: z.string().min(1).max(200),
  company_name: z
    .string()
    .max(200)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  email: z
    .string()
    .email()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v && v.length > 0 ? v : null)),
  phone: z
    .string()
    .max(64)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export type CustomerRow = z.infer<typeof customerRowSchema>;

export type ImportKind = "customers";

export const IMPORT_KINDS: readonly ImportKind[] = ["customers"] as const;

export function isImportKind(value: string): value is ImportKind {
  return (IMPORT_KINDS as readonly string[]).includes(value);
}
