import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

/**
 * C47 — Invoice lifecycle server helpers.
 *
 * prepare_deposit + prepare_final + record_payment (MANUAL) authenticated.
 * reconcile_payment + mark_facturx_exported service_role.
 * reverse_payment authenticated OR service_role.
 */

interface Deps { client?: SupabaseClient<Database>; }

export type PaymentMethod = "WIRE" | "CARD" | "CASH" | "CHECK" | "OTHER";
export type PaymentSource = "MANUAL" | "ACCOUNTING_PROVIDER";
export type PaymentStatus = "RECORDED" | "CONFIRMED" | "REVERSED";
export type FacturxStatus =
  | "NOT_APPLICABLE" | "PREPARING" | "READY" | "VALIDATION_FAILED" | "EXPORTED";

export type ApplyResult =
  | { status: "APPLIED"; id: string }
  | { status: "ERROR"; reason: string };

export interface PrepareDepositInvoiceInput {
  organizationId: string;
  customerId: string;
  parentInvoiceId?: string | null;
  amount: number;
  currency: string;
  externalRef?: string | null;
}

export async function prepareDepositInvoice(
  input: PrepareDepositInvoiceInput,
  deps: Deps = {},
): Promise<ApplyResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("prepare_deposit_invoice", {
    target_organization_id: input.organizationId,
    target_customer_id: input.customerId,
    target_parent_invoice_id: input.parentInvoiceId ?? null,
    target_amount: input.amount,
    target_currency: input.currency,
    target_external_ref: input.externalRef ?? null,
  });
  if (error) return { status: "ERROR", reason: `prepare_deposit_invoice: ${error.message}` };
  return { status: "APPLIED", id: data as string };
}

export interface PrepareFinalInvoiceInput {
  organizationId: string;
  customerId: string;
  parentInvoiceId: string;
  amount: number;
  currency: string;
  externalRef?: string | null;
}

export async function prepareFinalInvoice(
  input: PrepareFinalInvoiceInput,
  deps: Deps = {},
): Promise<ApplyResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("prepare_final_invoice", {
    target_organization_id: input.organizationId,
    target_customer_id: input.customerId,
    target_parent_invoice_id: input.parentInvoiceId,
    target_amount: input.amount,
    target_currency: input.currency,
    target_external_ref: input.externalRef ?? null,
  });
  if (error) return { status: "ERROR", reason: `prepare_final_invoice: ${error.message}` };
  return { status: "APPLIED", id: data as string };
}

export interface RecordPaymentInput {
  organizationId: string;
  invoiceId: string;
  amount: number;
  currency: string;
  receivedAt: Date;
  method: PaymentMethod;
  source: PaymentSource;
  externalRef?: string | null;
  evidenceDocumentId?: string | null;
  note?: string | null;
  createdByUserId: string;
}

export async function recordPayment(
  input: RecordPaymentInput,
  deps: Deps = {},
): Promise<ApplyResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("record_payment", {
    target_organization_id: input.organizationId,
    target_invoice_id: input.invoiceId,
    target_amount: input.amount,
    target_currency: input.currency,
    target_received_at: input.receivedAt.toISOString(),
    target_method: input.method,
    target_source: input.source,
    target_external_ref: input.externalRef ?? null,
    target_evidence_document_id: input.evidenceDocumentId ?? null,
    target_note: input.note ?? null,
    target_created_by_user_id: input.createdByUserId,
  });
  if (error) return { status: "ERROR", reason: `record_payment: ${error.message}` };
  return { status: "APPLIED", id: data as string };
}

export type TransitionResult =
  | { status: "APPLIED" } | { status: "NOT_ELIGIBLE" } | { status: "ERROR"; reason: string };

export async function reconcilePayment(
  organizationId: string, paymentId: string,
  externalRef: string, providerConfirmedAt: Date,
  deps: Deps = {},
): Promise<TransitionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("reconcile_payment", {
    target_organization_id: organizationId,
    target_payment_id: paymentId,
    target_external_ref: externalRef,
    target_provider_confirmed_at: providerConfirmedAt.toISOString(),
  });
  if (error) return { status: "ERROR", reason: `reconcile_payment: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

export async function reversePayment(
  organizationId: string, paymentId: string, reason: string, deps: Deps = {},
): Promise<TransitionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("reverse_payment", {
    target_organization_id: organizationId,
    target_payment_id: paymentId,
    target_reason: reason,
  });
  if (error) return { status: "ERROR", reason: `reverse_payment: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

export async function prepareFacturx(
  organizationId: string, submissionId: string, deps: Deps = {},
): Promise<{ status: "APPLIED"; facturxStatus: FacturxStatus } | { status: "ERROR"; reason: string }> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("prepare_facturx", {
    target_organization_id: organizationId,
    target_submission_id: submissionId,
  });
  if (error) return { status: "ERROR", reason: `prepare_facturx: ${error.message}` };
  return { status: "APPLIED", facturxStatus: data as FacturxStatus };
}

export async function markFacturxExported(
  organizationId: string, submissionId: string, exportedAt: Date, deps: Deps = {},
): Promise<TransitionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("mark_facturx_exported", {
    target_organization_id: organizationId,
    target_submission_id: submissionId,
    target_exported_at: exportedAt.toISOString(),
  });
  if (error) return { status: "ERROR", reason: `mark_facturx_exported: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}
