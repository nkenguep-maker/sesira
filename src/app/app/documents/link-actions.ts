"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getViewerContext } from "@/lib/auth/viewer";
import { analyzeStoredDocument } from "@/lib/documents/intelligence";
import { createClient } from "@/lib/supabase/server";

function value(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw.trim() : "";
}

function refreshLinkedSurfaces() {
  revalidatePath("/app/documents");
  revalidatePath("/app/clients");
  revalidatePath("/app/devis");
  revalidatePath("/app/factures");
  revalidatePath("/app/interventions");
  revalidatePath("/app/maintenance");
  revalidatePath("/app/rapports");
  revalidatePath("/app/obligations/equipements");
}

function finish(result: string): never {
  refreshLinkedSurfaces();
  redirect(`/app/documents?result=${encodeURIComponent(result)}`);
}

export async function confirmDocumentLinkAction(formData: FormData) {
  const viewer = await getViewerContext();
  if (!viewer) redirect("/login");
  const linkId = value(formData, "linkId");
  if (!linkId) finish("link-not-applied");

  const client = (await createClient()) as SupabaseClient;
  const { data, error } = await client.rpc("confirm_document_link", {
    target_organization_id: viewer.organization.id,
    target_link_id: linkId,
    target_user_id: viewer.userId,
  });
  finish(!error && data === true ? "link-confirmed" : "link-not-applied");
}

export async function rejectDocumentLinkAction(formData: FormData) {
  const viewer = await getViewerContext();
  if (!viewer) redirect("/login");
  const linkId = value(formData, "linkId");
  if (!linkId) finish("link-not-applied");

  const client = (await createClient()) as SupabaseClient;
  const { data, error } = await client.rpc("reject_document_link", {
    target_organization_id: viewer.organization.id,
    target_link_id: linkId,
    target_user_id: viewer.userId,
  });
  finish(!error && data === true ? "link-rejected" : "link-not-applied");
}

export async function reanalyzeDocumentFormAction(formData: FormData) {
  const viewer = await getViewerContext();
  if (!viewer) redirect("/login");
  const documentId = value(formData, "documentId");
  if (!documentId) finish("analysis-not-applied");

  const result = await analyzeStoredDocument({
    organizationId: viewer.organization.id,
    documentId,
  });

  if (result.status === "CLASSIFIED") finish("analysis-completed");
  if (result.status === "SKIPPED") finish("analysis-unavailable");
  finish("analysis-failed");
}
