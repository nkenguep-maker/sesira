import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { ReadResult } from "@/lib/data/c32-workspaces";

export type InvoiceCollectionRow = {
  id: string;
  customerId: string;
  quoteId: string | null;
  externalRef: string | null;
  amount: number;
  currency: string;
  status: string;
  issuedAt: string | null;
  dueAt: string | null;
  paidAt: string | null;
  reminderStage: number;
  reminderLastSentAt: string | null;
  finalNoticeSentAt: string | null;
  collectionState: "NORMAL" | "PROMISE_TO_PAY" | "DISPUTED";
  paymentPromiseDueAt: string | null;
  paymentPromiseRecordedAt: string | null;
  paymentPromiseNote: string | null;
  disputeOpenedAt: string | null;
  disputeReason: string | null;
  disputeResolvedAt: string | null;
  disputeResolutionNote: string | null;
  updatedAt: string;
};

export async function getInvoiceCollectionWorkspace(organizationId: string): Promise<ReadResult<InvoiceCollectionRow>> {
  const client = (await createClient()) as SupabaseClient;
  const { data, error } = await client
    .from("invoices")
    .select("id,customer_id,quote_id,external_ref,amount,currency,status,issued_at,due_at,paid_at,reminder_stage,reminder_last_sent_at,final_notice_sent_at,collection_state,payment_promise_due_at,payment_promise_recorded_at,payment_promise_note,dispute_opened_at,dispute_reason,dispute_resolved_at,dispute_resolution_note,updated_at")
    .eq("organization_id", organizationId)
    .order("due_at", { ascending: true, nullsFirst: false })
    .limit(250);

  if (error) return { status: "ERROR", reason: error.message };

  return {
    status: "OK",
    rows: (data ?? []).map((row) => ({
      id: row.id as string,
      customerId: row.customer_id as string,
      quoteId: row.quote_id as string | null,
      externalRef: row.external_ref as string | null,
      amount: Number(row.amount),
      currency: row.currency as string,
      status: row.status as string,
      issuedAt: row.issued_at as string | null,
      dueAt: row.due_at as string | null,
      paidAt: row.paid_at as string | null,
      reminderStage: Number(row.reminder_stage),
      reminderLastSentAt: row.reminder_last_sent_at as string | null,
      finalNoticeSentAt: row.final_notice_sent_at as string | null,
      collectionState: normalizeCollectionState(row.collection_state),
      paymentPromiseDueAt: row.payment_promise_due_at as string | null,
      paymentPromiseRecordedAt: row.payment_promise_recorded_at as string | null,
      paymentPromiseNote: row.payment_promise_note as string | null,
      disputeOpenedAt: row.dispute_opened_at as string | null,
      disputeReason: row.dispute_reason as string | null,
      disputeResolvedAt: row.dispute_resolved_at as string | null,
      disputeResolutionNote: row.dispute_resolution_note as string | null,
      updatedAt: row.updated_at as string,
    })),
  };
}

function normalizeCollectionState(value: unknown): InvoiceCollectionRow["collectionState"] {
  return value === "PROMISE_TO_PAY" || value === "DISPUTED" ? value : "NORMAL";
}
