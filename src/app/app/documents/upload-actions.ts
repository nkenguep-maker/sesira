"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

import { getViewerContext } from "@/lib/auth/viewer";
import { analyzeStoredDocument } from "@/lib/documents/intelligence";
import {
  DOCUMENT_BUCKET,
  MAX_DOCUMENT_BYTES,
  safeStorageName,
  sniffDocumentType,
} from "@/lib/documents/upload-policy";
import { createClient } from "@/lib/supabase/server";

type PrepareInput = {
  fileName: string;
  fileSize: number;
  contentType: string;
};

type FinalizeInput = {
  fileName: string;
  fileSize: number;
  storagePath: string;
};

const ALLOWED_DECLARED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export async function prepareDocumentUploadAction(input: PrepareInput) {
  const viewer = await getViewerContext();
  if (!viewer) return { ok: false as const, code: "auth-required" };

  const validation = validateMetadata(input);
  if (!validation.ok) return validation;

  const client = (await createClient()) as SupabaseClient;
  const storagePath = `${viewer.organization.id}/${crypto.randomUUID()}/${safeStorageName(input.fileName)}`;
  const signed = await client.storage.from(DOCUMENT_BUCKET).createSignedUploadUrl(storagePath);

  if (signed.error || !signed.data?.token) {
    console.error("document signed upload preparation failed", {
      organizationId: viewer.organization.id,
      message: signed.error?.message,
    });
    return { ok: false as const, code: "prepare-failed" };
  }

  return {
    ok: true as const,
    storagePath,
    token: signed.data.token,
  };
}

export async function finalizeDocumentUploadAction(input: FinalizeInput) {
  const viewer = await getViewerContext();
  if (!viewer) return { ok: false as const, code: "auth-required" };

  const validation = validateMetadata({ ...input, contentType: "application/pdf" }, false);
  if (!validation.ok) return validation;

  if (!isOrganizationStoragePath(input.storagePath, viewer.organization.id)) {
    return { ok: false as const, code: "invalid-storage-path" };
  }

  const client = (await createClient()) as SupabaseClient;

  const existing = await client
    .from("documents")
    .select("id,content_type")
    .eq("organization_id", viewer.organization.id)
    .eq("file_reference", input.storagePath)
    .limit(1)
    .maybeSingle();

  if (existing.data?.id) {
    const analysis = await analyzeStoredDocument({
      organizationId: viewer.organization.id,
      documentId: String(existing.data.id),
      contentType: typeof existing.data.content_type === "string" ? existing.data.content_type : undefined,
      fileName: input.fileName,
    });
    revalidateDocumentSurfaces();
    return { ok: true as const, documentId: String(existing.data.id), analysis };
  }

  const downloaded = await client.storage.from(DOCUMENT_BUCKET).download(input.storagePath);
  if (downloaded.error || !downloaded.data) {
    console.error("document verification download failed", {
      organizationId: viewer.organization.id,
      storagePath: input.storagePath,
      message: downloaded.error?.message,
    });
    return { ok: false as const, code: "verification-download-failed" };
  }

  const blob = downloaded.data;
  if (blob.size !== input.fileSize || blob.size <= 0 || blob.size > MAX_DOCUMENT_BYTES) {
    await cleanupObject(client, input.storagePath);
    return { ok: false as const, code: "size-mismatch" };
  }

  const bytes = new Uint8Array(await blob.arrayBuffer());
  const detectedType = sniffDocumentType(bytes);
  if (!detectedType) {
    await cleanupObject(client, input.storagePath);
    return { ok: false as const, code: "invalid-format" };
  }

  const insert = await client
    .from("documents")
    .insert({
      organization_id: viewer.organization.id,
      file_reference: input.storagePath,
      file_name: input.fileName,
      content_type: detectedType,
      size_bytes: blob.size,
      kind: "OTHER",
      status: "UPLOADED",
      uploaded_by_user_id: viewer.userId,
      metadata: {
        storage_bucket: DOCUMENT_BUCKET,
        storage_path: input.storagePath,
        source: "signed_browser_upload",
        verified_content_type: detectedType,
        document_intelligence: { state: "PENDING" },
      },
    })
    .select("id")
    .single();

  if (insert.error) {
    const raced = await client
      .from("documents")
      .select("id")
      .eq("organization_id", viewer.organization.id)
      .eq("file_reference", input.storagePath)
      .limit(1)
      .maybeSingle();

    if (raced.data?.id) {
      const analysis = await analyzeStoredDocument({
        organizationId: viewer.organization.id,
        documentId: String(raced.data.id),
        bytes,
        contentType: detectedType,
        fileName: input.fileName,
      });
      revalidateDocumentSurfaces();
      return { ok: true as const, documentId: String(raced.data.id), analysis };
    }

    await cleanupObject(client, input.storagePath);
    console.error("document registry insert failed", {
      organizationId: viewer.organization.id,
      storagePath: input.storagePath,
      code: insert.error.code,
      message: insert.error.message,
    });
    return { ok: false as const, code: "registry-failed" };
  }

  const documentId = String(insert.data.id);
  const analysis = await analyzeStoredDocument({
    organizationId: viewer.organization.id,
    documentId,
    bytes,
    contentType: detectedType,
    fileName: input.fileName,
  });

  revalidateDocumentSurfaces();
  return { ok: true as const, documentId, analysis };
}

export async function reanalyzeDocumentAction(formData: FormData) {
  const viewer = await getViewerContext();
  if (!viewer) return { ok: false as const, code: "auth-required" };
  const documentId = String(formData.get("documentId") ?? "").trim();
  if (!documentId) return { ok: false as const, code: "missing-document" };

  const analysis = await analyzeStoredDocument({
    organizationId: viewer.organization.id,
    documentId,
  });
  revalidateDocumentSurfaces();
  return { ok: analysis.status === "CLASSIFIED", analysis };
}

function validateMetadata(input: PrepareInput, validateDeclaredType = true) {
  if (!input.fileName || input.fileName.length > 300) {
    return { ok: false as const, code: "invalid-name" };
  }
  if (!Number.isSafeInteger(input.fileSize) || input.fileSize <= 0 || input.fileSize > MAX_DOCUMENT_BYTES) {
    return { ok: false as const, code: "invalid-size" };
  }
  if (validateDeclaredType && !ALLOWED_DECLARED_TYPES.has(input.contentType)) {
    return { ok: false as const, code: "invalid-declared-type" };
  }
  return { ok: true as const };
}

function isOrganizationStoragePath(storagePath: string, organizationId: string) {
  const escaped = organizationId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^${escaped}/[0-9a-fA-F-]{36}/[^/]{1,180}$`);
  return pattern.test(storagePath);
}

function revalidateDocumentSurfaces() {
  revalidatePath("/app/documents");
  revalidatePath("/app/clients");
  revalidatePath("/app/devis");
  revalidatePath("/app/factures");
  revalidatePath("/app/interventions");
  revalidatePath("/app/maintenance");
  revalidatePath("/app/rapports");
  revalidatePath("/app/obligations/equipements");
}

async function cleanupObject(client: SupabaseClient, storagePath: string) {
  const cleanup = await client.storage.from(DOCUMENT_BUCKET).remove([storagePath]);
  if (cleanup.error) {
    console.error("document storage cleanup failed", {
      storagePath,
      message: cleanup.error.message,
    });
  }
}
