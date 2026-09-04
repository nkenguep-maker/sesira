import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/database";

/**
 * C28 — invoice monitoring server helpers. Four SECURITY DEFINER
 * RPCs wrapped as discriminated unions (same shape as C25-C27).
 *
 * AI is NEVER called from this seam — payment decisions, amount
 * changes, and dispute resolution are always human. AI may only
 * draft dunning wording in a separate boundary (out of scope).
 */

interface Deps { client?: SupabaseClient<Database>; }

export type InvoiceActionResult =
  | { status: "APPLIED" } | { status: "NOT_ELIGIBLE" } | { status: "ERROR"; reason: string };

export interface RecordInvoiceIssuedInput {
  organizationId: string;
  invoiceId: string;
  issuedAt: Date;
  dueAt?: Date | null;
  externalRef?: string | null;
}

export async function recordInvoiceIssued(
  input: RecordInvoiceIssuedInput,
  deps: Deps = {},
): Promise<InvoiceActionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("record_invoice_issued", {
    target_organization_id: input.organizationId,
    target_invoice_id: input.invoiceId,
    target_issued_at: input.issuedAt.toISOString(),
    target_due_at: input.dueAt ? input.dueAt.toISOString() : null,
    target_external_ref: input.externalRef ?? null,
  });
  if (error) return { status: "ERROR", reason: `record_invoice_issued: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

export interface RecordInvoicePaymentInput {
  organizationId: string;
  invoiceId: string;
  amount: number;
  paidAt: Date;
  metadata?: Record<string, unknown> | null;
}

export async function recordInvoicePayment(
  input: RecordInvoicePaymentInput,
  deps: Deps = {},
): Promise<InvoiceActionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("record_invoice_payment", {
    target_organization_id: input.organizationId,
    target_invoice_id: input.invoiceId,
    target_amount: input.amount,
    target_paid_at: input.paidAt.toISOString(),
    target_metadata: (input.metadata ?? {}) as unknown as Json,
  });
  if (error) return { status: "ERROR", reason: `record_invoice_payment: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

export interface MarkInvoiceOverdueInput {
  organizationId: string;
  invoiceId: string;
}

export async function markInvoiceOverdue(
  input: MarkInvoiceOverdueInput,
  deps: Deps = {},
): Promise<InvoiceActionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("mark_invoice_overdue", {
    target_organization_id: input.organizationId,
    target_invoice_id: input.invoiceId,
  });
  if (error) return { status: "ERROR", reason: `mark_invoice_overdue: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

export type DunningStage = 1 | 2 | 3;

export interface RecordDunningReminderInput {
  organizationId: string;
  invoiceId: string;
  stage: DunningStage;
  sentByUserId: string;
}

export async function recordDunningReminder(
  input: RecordDunningReminderInput,
  deps: Deps = {},
): Promise<InvoiceActionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("record_dunning_reminder", {
    target_organization_id: input.organizationId,
    target_invoice_id: input.invoiceId,
    target_stage: input.stage,
    target_sent_by_user_id: input.sentByUserId,
  });
  if (error) return { status: "ERROR", reason: `record_dunning_reminder: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}
