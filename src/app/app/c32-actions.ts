"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getViewerContext } from "@/lib/auth/viewer";
import {
  DOCUMENT_BUCKET,
  MAX_DOCUMENT_BYTES,
  isDocumentKind,
  safeStorageName,
  sniffDocumentType,
} from "@/lib/documents/upload-policy";
import { createClient } from "@/lib/supabase/server";

async function context() {
  const viewer = await getViewerContext();
  if (!viewer) throw new Error("AUTH_REQUIRED");
  const client = (await createClient()) as SupabaseClient;
  return { viewer, client };
}

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function finish(path: string, ok: boolean) {
  revalidatePath(path);
  redirect(`${path}?result=${ok ? "saved" : "not-applied"}`);
}

function finishDocumentUpload(result: string) {
  revalidatePath("/app/documents");
  redirect(`/app/documents?result=${encodeURIComponent(result)}`);
}

export async function uploadDocumentAction(formData: FormData) {
  const { viewer, client } = await context();
  const candidate = formData.get("file");
  const kind = text(formData, "kind").toUpperCase();

  if (!(candidate instanceof File) || candidate.size === 0) {
    finishDocumentUpload("upload-missing-file");
  }
  if (!isDocumentKind(kind)) {
    finishDocumentUpload("upload-invalid-kind");
  }
  if (candidate.name.length > 300) {
    finishDocumentUpload("upload-invalid-name");
  }
  if (candidate.size > MAX_DOCUMENT_BYTES) {
    finishDocumentUpload("upload-too-large");
  }

  const arrayBuffer = await candidate.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const detectedType = sniffDocumentType(bytes);
  if (!detectedType) {
    finishDocumentUpload("upload-invalid-format");
  }

  const storageName = safeStorageName(candidate.name);
  const objectId = crypto.randomUUID();
  const storagePath = `${viewer.organization.id}/${objectId}/${storageName}`;
  const upload = await client.storage.from(DOCUMENT_BUCKET).upload(storagePath, arrayBuffer, {
    contentType: detectedType,
    cacheControl: "3600",
    upsert: false,
  });

  if (upload.error) {
    console.error("document storage upload failed", {
      code: upload.error.name,
      message: upload.error.message,
      organizationId: viewer.organization.id,
    });
    finishDocumentUpload("upload-storage-error");
  }

  const insert = await client.from("documents").insert({
    organization_id: viewer.organization.id,
    file_reference: storagePath,
    file_name: candidate.name,
    content_type: detectedType,
    size_bytes: candidate.size,
    kind,
    status: "UPLOADED",
    uploaded_by_user_id: viewer.userId,
    metadata: {
      storage_bucket: DOCUMENT_BUCKET,
      storage_path: storagePath,
      source: "web_upload",
    },
  });

  if (insert.error) {
    const cleanup = await client.storage.from(DOCUMENT_BUCKET).remove([storagePath]);
    if (cleanup.error) {
      console.error("document upload cleanup failed", {
        storagePath,
        message: cleanup.error.message,
      });
    }
    console.error("document registry insert failed", {
      code: insert.error.code,
      message: insert.error.message,
      organizationId: viewer.organization.id,
    });
    finishDocumentUpload("upload-registry-error");
  }

  finishDocumentUpload("uploaded");
}

export async function scheduleInterventionAction(formData: FormData) {
  const { viewer, client } = await context();
  const interventionId = text(formData, "interventionId");
  const scheduledRaw = text(formData, "scheduledAt");
  const durationRaw = text(formData, "durationMinutes");
  const scheduledAt = new Date(scheduledRaw);
  const duration = durationRaw ? Number(durationRaw) : null;
  if (!interventionId || Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
    finish("/app/interventions", false);
  }
  const { data, error } = await client.rpc("schedule_intervention", {
    target_organization_id: viewer.organization.id,
    target_intervention_id: interventionId,
    target_scheduled_at: scheduledAt.toISOString(),
    target_duration_minutes: Number.isFinite(duration) ? duration : null,
  });
  finish("/app/interventions", !error && data === true);
}

export async function completeInterventionAction(formData: FormData) {
  const { viewer, client } = await context();
  const interventionId = text(formData, "interventionId");
  if (!interventionId) finish("/app/interventions", false);
  const notes = text(formData, "notes");
  const { data, error } = await client.rpc("complete_intervention", {
    target_organization_id: viewer.organization.id,
    target_intervention_id: interventionId,
    target_notes: notes || null,
  });
  finish("/app/interventions", !error && data === true);
}

export async function transitionFieldReportAction(formData: FormData) {
  const { viewer, client } = await context();
  const reportId = text(formData, "reportId");
  const nextStatus = text(formData, "nextStatus");
  if (!reportId || !["REVIEWED", "APPROVED"].includes(nextStatus)) {
    finish("/app/rapports", false);
  }
  const { data, error } = await client.rpc("transition_field_report_review", {
    target_organization_id: viewer.organization.id,
    target_report_id: reportId,
    target_reviewer_user_id: viewer.userId,
    target_new_status: nextStatus,
  });
  finish("/app/rapports", !error && data === true);
}

export async function validateDocumentAction(formData: FormData) {
  const { viewer, client } = await context();
  const documentId = text(formData, "documentId");
  if (!documentId) finish("/app/documents", false);
  const { data, error } = await client.rpc("validate_document", {
    target_organization_id: viewer.organization.id,
    target_document_id: documentId,
    target_validator_user_id: viewer.userId,
  });
  finish("/app/documents", !error && data === true);
}

export async function rejectDocumentAction(formData: FormData) {
  const { viewer, client } = await context();
  const documentId = text(formData, "documentId");
  const reason = text(formData, "reason");
  if (!documentId || !reason || reason.length > 500) finish("/app/documents", false);
  const { data, error } = await client.rpc("reject_document", {
    target_organization_id: viewer.organization.id,
    target_document_id: documentId,
    target_reason: reason,
  });
  finish("/app/documents", !error && data === true);
}

export async function archiveDocumentAction(formData: FormData) {
  const { viewer, client } = await context();
  const documentId = text(formData, "documentId");
  if (!documentId) finish("/app/documents", false);
  const { data, error } = await client.rpc("archive_document", {
    target_organization_id: viewer.organization.id,
    target_document_id: documentId,
  });
  finish("/app/documents", !error && data === true);
}

export async function qualifyLeadAction(formData: FormData) {
  const { viewer, client } = await context();
  const leadId = text(formData, "leadId");
  if (!leadId) finish("/app/croissance", false);
  const { data, error } = await client.rpc("qualify_lead", {
    target_organization_id: viewer.organization.id,
    target_lead_id: leadId,
    target_qualified_by_user_id: viewer.userId,
    target_notes: text(formData, "notes") || null,
  });
  finish("/app/croissance", !error && data === true);
}

export async function disqualifyLeadAction(formData: FormData) {
  const { viewer, client } = await context();
  const leadId = text(formData, "leadId");
  const reason = text(formData, "reason");
  if (!leadId || !reason) finish("/app/croissance", false);
  const { data, error } = await client.rpc("disqualify_lead", {
    target_organization_id: viewer.organization.id,
    target_lead_id: leadId,
    target_reason: reason,
  });
  finish("/app/croissance", !error && data === true);
}

export async function submitContentForReviewAction(formData: FormData) {
  const { viewer, client } = await context();
  const contentId = text(formData, "contentId");
  if (!contentId) finish("/app/croissance/contenus", false);
  const { data, error } = await client.rpc("submit_content_for_review", {
    target_organization_id: viewer.organization.id,
    target_content_id: contentId,
  });
  finish("/app/croissance/contenus", !error && data === true);
}

export async function approveContentAction(formData: FormData) {
  const { viewer, client } = await context();
  const contentId = text(formData, "contentId");
  if (!contentId) finish("/app/croissance/contenus", false);
  const { data, error } = await client.rpc("approve_content_piece", {
    target_organization_id: viewer.organization.id,
    target_content_id: contentId,
    target_approver_user_id: viewer.userId,
  });
  finish("/app/croissance/contenus", !error && data === true);
}
