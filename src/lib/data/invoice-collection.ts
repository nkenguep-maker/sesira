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
  paymentPromiseLate: boolean;
  disputeOpenedAt: string | null;
  disputeReason: string | null;
  disputeResolvedAt: string | null;
  disputeResolutionNote: string | null;
  pastDueDays: number | null;
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

  const observedAt = Date.now();

  return {
    status: "OK",
    rows: (data ?? []).map((row) => {
      const status = row.status as string;
      const dueAt = row.due_at as string | null;
      const paymentPromiseDueAt = row.payment_promise_due_at as string | null;
      const collectionState = normalizeCollectionState(row.collection_state);

      return {
        id: row.id as string,
        customerId: row.customer_id as string,
        quoteId: row.quote_id as string | null,
        externalRef: row.external_ref as string | null,
        amount: Number(row.amount),
        currency: row.currency as string,
        status,
        issuedAt: row.issued_at as string | null,
        dueAt,
        paidAt: row.paid_at as string | null,
        reminderStage: Number(row.reminder_stage),
        reminderLastSentAt: row.reminder_last_sent_at as string | null,
        finalNoticeSentAt: row.final_notice_sent_at as string | null,
        collectionState,
        paymentPromiseDueAt,
        paymentPromiseRecordedAt: row.payment_promise_recorded_at as string | null,
        paymentPromiseNote: row.payment_promise_note as string | null,
        paymentPromiseLate: collectionState === "PROMISE_TO_PAY" && isBeforeObservedAt(paymentPromiseDueAt, observedAt),
        disputeOpenedAt: row.dispute_opened_at as string | null,
        disputeReason: row.dispute_reason as string | null,
        disputeResolvedAt: row.dispute_resolved_at as string | null,
        disputeResolutionNote: row.dispute_resolution_note as string | null,
        pastDueDays: dueAt && ["OVERDUE", "ISSUED"].includes(status) ? daysPastDue(dueAt, observedAt) : null,
        updatedAt: row.updated_at as string,
      };
    }),
  };
}

function normalizeCollectionState(value: unknown): InvoiceCollectionRow["collectionState"] {
  return value === "PROMISE_TO_PAY" || value === "DISPUTED" ? value : "NORMAL";
}

function isBeforeObservedAt(value: string | null, observedAt: number) {
  if (!value) return false;
  const time = new Date(value).getTime();
  return !Number.isNaN(time) && time < observedAt;
}

function daysPastDue(value: string, observedAt: number) {
  const due = new Date(value).getTime();
  return Number.isNaN(due) ? 0 : Math.max(0, Math.floor((observedAt - due) / 86_400_000));
}
