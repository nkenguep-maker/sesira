import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

/**
 * C27 — document server helpers. Three SECURITY DEFINER RPCs
 * wrapped as discriminated unions (same shape as C25/C26).
 *
 * record_document_classification is intentionally NOT wrapped:
 * it is service_role only (the AI classifier writes its own
 * output), so it does not belong in the client-callable
 * seam. Wire it directly from an edge function / worker.
 */

interface Deps { client?: SupabaseClient<Database>; }

export type DocumentActionResult =
  | { status: "APPLIED" } | { status: "NOT_ELIGIBLE" } | { status: "ERROR"; reason: string };

export interface ValidateDocumentInput {
  organizationId: string;
  documentId: string;
  validatorUserId: string;
}

export async function validateDocument(
  input: ValidateDocumentInput,
  deps: Deps = {},
): Promise<DocumentActionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("validate_document", {
    target_organization_id: input.organizationId,
    target_document_id: input.documentId,
    target_validator_user_id: input.validatorUserId,
  });
  if (error) return { status: "ERROR", reason: `validate_document: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

export interface RejectDocumentInput {
  organizationId: string;
  documentId: string;
  reason: string;
}

export async function rejectDocument(
  input: RejectDocumentInput,
  deps: Deps = {},
): Promise<DocumentActionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("reject_document", {
    target_organization_id: input.organizationId,
    target_document_id: input.documentId,
    target_reason: input.reason,
  });
  if (error) return { status: "ERROR", reason: `reject_document: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

export interface ArchiveDocumentInput {
  organizationId: string;
  documentId: string;
}

export async function archiveDocument(
  input: ArchiveDocumentInput,
  deps: Deps = {},
): Promise<DocumentActionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("archive_document", {
    target_organization_id: input.organizationId,
    target_document_id: input.documentId,
  });
  if (error) return { status: "ERROR", reason: `archive_document: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}
