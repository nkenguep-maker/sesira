"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getViewerContext } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

async function context() {
  const viewer = await getViewerContext();
  if (!viewer) throw new Error("AUTH_REQUIRED");
  return { viewer, client: (await createClient()) as SupabaseClient };
}

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function finish(ok: boolean) {
  revalidatePath("/app/factures");
  redirect(`/app/factures?result=${ok ? "saved" : "not-applied"}`);
}

export async function recordPaymentPromiseAction(formData: FormData) {
  const { viewer, client } = await context();
  const invoiceId = text(formData, "invoiceId");
  const promisedRaw = text(formData, "promisedFor");
  const promisedFor = new Date(promisedRaw);
  if (!invoiceId || Number.isNaN(promisedFor.getTime()) || promisedFor.getTime() <= Date.now()) finish(false);

  const { data, error } = await client.rpc("record_invoice_payment_promise", {
    target_organization_id: viewer.organization.id,
    target_invoice_id: invoiceId,
    target_promised_for: promisedFor.toISOString(),
    target_note: text(formData, "note") || null,
    target_recorded_by_user_id: viewer.userId,
  });
  finish(!error && data === true);
}

export async function openInvoiceDisputeAction(formData: FormData) {
  const { viewer, client } = await context();
  const invoiceId = text(formData, "invoiceId");
  const reason = text(formData, "reason");
  if (!invoiceId || !reason || reason.length > 2000) finish(false);

  const { data, error } = await client.rpc("open_invoice_dispute", {
    target_organization_id: viewer.organization.id,
    target_invoice_id: invoiceId,
    target_reason: reason,
    target_opened_by_user_id: viewer.userId,
  });
  finish(!error && data === true);
}

export async function resolveInvoiceDisputeAction(formData: FormData) {
  const { viewer, client } = await context();
  const invoiceId = text(formData, "invoiceId");
  if (!invoiceId) finish(false);

  const { data, error } = await client.rpc("resolve_invoice_dispute", {
    target_organization_id: viewer.organization.id,
    target_invoice_id: invoiceId,
    target_resolution_note: text(formData, "resolutionNote") || null,
    target_resolved_by_user_id: viewer.userId,
  });
  finish(!error && data === true);
}
