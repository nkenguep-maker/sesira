import "server-only";

import { z } from "zod";

/**
 * Commercial opportunity signals — TypeScript surface.
 *
 * A signal represents a technical/regulatory situation that MAY warrant a
 * future job ("chantier à préparer"). It is distinct from:
 *
 *   * `regulatory_attentions` — the immutable obligation surface;
 *   * `attention_items` — the generic OPS triage feed;
 *   * `opportunities` / `quotes` — only created after a human conversion.
 *
 * Wording (INV-01): a signal NEVER says "vous devez" or "conforme". Titles
 * and hints are non-committal ("À examiner avant …", "Préparer …").
 *
 * The DB layer lives in migration
 * `20261101000000_commercial_opportunity_signals.sql`. Every mutation
 * verb is a SECURITY DEFINER RPC that re-enforces membership and the
 * state machine on the server side.
 */

export const COMMERCIAL_SIGNAL_KINDS = ["LEAK_CHECK_DUE"] as const;
export type CommercialSignalKind = (typeof COMMERCIAL_SIGNAL_KINDS)[number];

export const COMMERCIAL_SIGNAL_SOURCE_TYPES = ["regulatory_leak_check"] as const;
export type CommercialSignalSourceType = (typeof COMMERCIAL_SIGNAL_SOURCE_TYPES)[number];

export const COMMERCIAL_SIGNAL_STATUSES = [
  "DETECTED",
  "REVIEWED",
  "PLANNED",
  "SNOOZED",
  "CONVERTED",
  "DISMISSED",
] as const;
export type CommercialSignalStatus = (typeof COMMERCIAL_SIGNAL_STATUSES)[number];

export const COMMERCIAL_SIGNAL_SEVERITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
export type CommercialSignalSeverity = (typeof COMMERCIAL_SIGNAL_SEVERITIES)[number];

export function isCommercialSignalStatus(value: string): value is CommercialSignalStatus {
  return (COMMERCIAL_SIGNAL_STATUSES as readonly string[]).includes(value);
}

export function isCommercialSignalKind(value: string): value is CommercialSignalKind {
  return (COMMERCIAL_SIGNAL_KINDS as readonly string[]).includes(value);
}

export function isCommercialSignalSeverity(value: string): value is CommercialSignalSeverity {
  return (COMMERCIAL_SIGNAL_SEVERITIES as readonly string[]).includes(value);
}

/**
 * Deterministic priority order for UI sorting — mirrors the ORDER BY in
 * `open_commercial_signals` and the SQL severity helper.
 */
export const COMMERCIAL_SIGNAL_SEVERITY_ORDER: Record<CommercialSignalSeverity, number> = {
  URGENT: 1,
  HIGH: 2,
  NORMAL: 3,
  LOW: 4,
};

// -----------------------------------------------------------------------
// Validators for mutation inputs (server actions).
// -----------------------------------------------------------------------

const uuid = z.uuid();
const shortText = z.string().trim().min(1).max(500);
const quoteTitleSchema = z.string().trim().min(1).max(200);
const variantKeySchema = z.string().trim().min(1).max(64);
const currencySchema = z
  .string()
  .trim()
  .length(3)
  .regex(/^[A-Z]{3}$/, { message: "currency must be an ISO-4217 3-letter code" });
const nonNegativeAmount = z.number().finite().min(0).max(999_999_999_999.99);

export const markSignalReviewedInputSchema = z.object({
  organizationId: uuid,
  signalId: uuid,
});
export type MarkSignalReviewedInput = z.infer<typeof markSignalReviewedInputSchema>;

export const markSignalPlannedInputSchema = z.object({
  organizationId: uuid,
  signalId: uuid,
  note: shortText.optional().nullable(),
});
export type MarkSignalPlannedInput = z.infer<typeof markSignalPlannedInputSchema>;

export const snoozeSignalInputSchema = z.object({
  organizationId: uuid,
  signalId: uuid,
  snoozedUntil: z.iso.datetime({ offset: true }),
  reason: shortText.optional().nullable(),
});
export type SnoozeSignalInput = z.infer<typeof snoozeSignalInputSchema>;

export const dismissSignalInputSchema = z.object({
  organizationId: uuid,
  signalId: uuid,
  reason: shortText,
});
export type DismissSignalInput = z.infer<typeof dismissSignalInputSchema>;

export const convertSignalToProposalInputSchema = z.object({
  organizationId: uuid,
  signalId: uuid,
  quoteTitle: quoteTitleSchema,
  variantKey: variantKeySchema.optional(),
  estimatedValue: nonNegativeAmount.optional().nullable(),
  currency: currencySchema.optional(),
  ownerUserId: uuid.optional().nullable(),
  overrideCustomerId: uuid.optional().nullable(),
});
export type ConvertSignalToProposalInput = z.infer<typeof convertSignalToProposalInputSchema>;

// -----------------------------------------------------------------------
// Read-model row types.
// -----------------------------------------------------------------------

/**
 * A fact surfaced to explain a signal. Never a legal claim — always
 * factual ({label: "Fluide", value: "R410A"}).
 */
export interface CommercialSignalFact {
  label: string;
  value: string;
}

export interface CommercialSignalRuleSnapshot {
  matched_rule_id: string | null;
  matched_rule_code: string | null;
  rule_source_ref: string | null;
  rule_effective_from: string | null;
  cadence_days: number | null;
  tco2eq: number | null;
  gwp_value_id: string | null;
  next_due_at: string | null;
  detector_doubled: boolean | null;
  at_date: string | null;
  [key: string]: unknown;
}

export interface OpenCommercialSignalRow {
  signalId: string;
  customerId: string | null;
  equipmentId: string;
  signalKind: CommercialSignalKind;
  commercialStatus: CommercialSignalStatus;
  severity: CommercialSignalSeverity;
  title: string;
  explanation: string | null;
  facts: CommercialSignalFact[];
  nextActionHint: string | null;
  dueAt: string | null;
  detectedAt: string;
  snoozedUntil: string | null;
  suggestedCatalogItemId: string | null;
  ruleSnapshot: CommercialSignalRuleSnapshot;
}
