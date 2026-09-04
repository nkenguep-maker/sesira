import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/database";

import type {
  EInvoicingProviderKind,
  EInvoicingSubmissionFormat,
} from "./provider";

/**
 * C34 — e-invoicing server helpers.
 *
 * DOCTRINE: the DB gate (`record_einvoicing_provider_event`) enforces
 * that SUBMITTED / ACCEPTED / REJECTED events can only be inserted
 * from service_role (real PA webhook) OR from authenticated org
 * member ONLY when the submission's provider_kind = 'TEST'. This
 * seam does NOT try to enforce that in TypeScript — the SQL is the
 * authoritative gate.
 *
 * Wording (REGULATORY.md 2.2 U34):
 *   DRAFT     → « À préparer »
 *   READY     → « Prêt »
 *   EXPORTED  → « Exporté »
 *   SUBMITTED → « Transmis »        (real PA only)
 *   ACCEPTED  → « Accepté »         (real PA only)
 *   REJECTED  → « Rejeté »          (real PA only)
 *   CANCELLED → « Annulé »
 *
 * When no real PA is bound, the UI renders any post-EXPORTED state
 * as « Transmission fournisseur indisponible ».
 */

interface Deps { client?: SupabaseClient<Database>; }

export type EInvoicingActionResult =
  | { status: "APPLIED" } | { status: "NOT_ELIGIBLE" } | { status: "ERROR"; reason: string };

export type EInvoicingResourceResult =
  | { status: "APPLIED"; id: string }
  | { status: "ERROR"; reason: string };

export type EInvoicingSubmissionStatus =
  | "DRAFT" | "READY" | "EXPORTED"
  | "SUBMITTED" | "ACCEPTED" | "REJECTED" | "CANCELLED";

export type EInvoicingProviderEventKind =
  | "SUBMISSION_ACK" | "ACCEPTANCE" | "REJECTION"
  | "WARNING" | "STATUS_UPDATE";

// -------- Provider config --------

export interface ConfigureEInvoicingProviderInput {
  organizationId: string;
  providerKind: EInvoicingProviderKind;
  label: string;
  supportedFormats: EInvoicingSubmissionFormat[];
  externalConfig?: Record<string, unknown> | null;
}

export async function configureEInvoicingProvider(
  input: ConfigureEInvoicingProviderInput,
  deps: Deps = {},
): Promise<EInvoicingResourceResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("configure_einvoicing_provider", {
    target_organization_id: input.organizationId,
    target_provider_kind: input.providerKind,
    target_label: input.label,
    target_supported_formats: input.supportedFormats,
    target_external_config: (input.externalConfig ?? {}) as unknown as Json,
  });
  if (error) return { status: "ERROR", reason: `configure_einvoicing_provider: ${error.message}` };
  return { status: "APPLIED", id: data as string };
}

// -------- Submission lifecycle --------

export interface PrepareEInvoicingSubmissionInput {
  organizationId: string;
  invoiceId: string;
  providerId: string;
  format: EInvoicingSubmissionFormat;
}

export async function prepareEInvoicingSubmission(
  input: PrepareEInvoicingSubmissionInput,
  deps: Deps = {},
): Promise<EInvoicingResourceResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("prepare_einvoicing_submission", {
    target_organization_id: input.organizationId,
    target_invoice_id: input.invoiceId,
    target_provider_id: input.providerId,
    target_format: input.format,
  });
  if (error) return { status: "ERROR", reason: `prepare_einvoicing_submission: ${error.message}` };
  return { status: "APPLIED", id: data as string };
}

export interface MarkExportedInput {
  organizationId: string;
  submissionId: string;
  exportedByUserId: string;
}

export async function markEInvoicingSubmissionExported(
  input: MarkExportedInput,
  deps: Deps = {},
): Promise<EInvoicingActionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("mark_einvoicing_submission_exported", {
    target_organization_id: input.organizationId,
    target_submission_id: input.submissionId,
    target_exported_by_user_id: input.exportedByUserId,
  });
  if (error) return { status: "ERROR", reason: `mark_einvoicing_submission_exported: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

export interface RecordProviderEventInput {
  organizationId: string;
  submissionId: string;
  eventKind: EInvoicingProviderEventKind;
  externalRef?: string | null;
  payload?: Record<string, unknown> | null;
}

export async function recordEInvoicingProviderEvent(
  input: RecordProviderEventInput,
  deps: Deps = {},
): Promise<EInvoicingResourceResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("record_einvoicing_provider_event", {
    target_organization_id: input.organizationId,
    target_submission_id: input.submissionId,
    target_event_kind: input.eventKind,
    target_external_ref: input.externalRef ?? null,
    target_payload: (input.payload ?? {}) as unknown as Json,
  });
  if (error) return { status: "ERROR", reason: `record_einvoicing_provider_event: ${error.message}` };
  return { status: "APPLIED", id: data as string };
}

export interface CancelSubmissionInput {
  organizationId: string;
  submissionId: string;
  reason: string;
}

export async function cancelEInvoicingSubmission(
  input: CancelSubmissionInput,
  deps: Deps = {},
): Promise<EInvoicingActionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("cancel_einvoicing_submission", {
    target_organization_id: input.organizationId,
    target_submission_id: input.submissionId,
    target_reason: input.reason,
  });
  if (error) return { status: "ERROR", reason: `cancel_einvoicing_submission: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

// -------- Read helpers --------

export interface ActiveEInvoicingProviderResult {
  providerId: string;
  providerKind: EInvoicingProviderKind;
  label: string;
  status: string;
  supportedFormats: EInvoicingSubmissionFormat[];
  activatedAt: string | null;
}

export type ActiveProviderResult =
  | { status: "APPLIED"; provider: ActiveEInvoicingProviderResult | null }
  | { status: "ERROR"; reason: string };

export async function activeEInvoicingProvider(
  organizationId: string,
  deps: Deps = {},
): Promise<ActiveProviderResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("active_einvoicing_provider", {
    target_organization_id: organizationId,
  });
  if (error) return { status: "ERROR", reason: `active_einvoicing_provider: ${error.message}` };
  const rows = (data ?? []) as Array<{
    provider_id: string; provider_kind: string; label: string; status: string;
    supported_formats: string[]; activated_at: string | null;
  }>;
  if (rows.length === 0) return { status: "APPLIED", provider: null };
  const r = rows[0];
  return {
    status: "APPLIED",
    provider: {
      providerId: r.provider_id,
      providerKind: r.provider_kind as EInvoicingProviderKind,
      label: r.label,
      status: r.status,
      supportedFormats: r.supported_formats as EInvoicingSubmissionFormat[],
      activatedAt: r.activated_at,
    },
  };
}

export interface EInvoicingSubmissionRow {
  submissionId: string;
  invoiceId: string;
  providerId: string;
  providerKindSnapshot: EInvoicingProviderKind;
  format: EInvoicingSubmissionFormat;
  status: EInvoicingSubmissionStatus;
  payloadGapCount: number;
  exportedAt: string | null;
  submittedAt: string | null;
  acceptedAt: string | null;
  rejectedAt: string | null;
  externalRef: string | null;
}

export type SubmissionsForResult =
  | { status: "APPLIED"; rows: EInvoicingSubmissionRow[] }
  | { status: "ERROR"; reason: string };

export async function einvoicingSubmissionsFor(
  organizationId: string,
  statusFilter: EInvoicingSubmissionStatus | null = null,
  deps: Deps = {},
): Promise<SubmissionsForResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("einvoicing_submissions_for", {
    target_organization_id: organizationId,
    target_status_filter: statusFilter,
  });
  if (error) return { status: "ERROR", reason: `einvoicing_submissions_for: ${error.message}` };
  const rows = (data ?? []) as Array<{
    submission_id: string; invoice_id: string; provider_id: string;
    provider_kind_snapshot: string; format: string; status: string;
    payload_gap_count: number;
    exported_at: string | null; submitted_at: string | null;
    accepted_at: string | null; rejected_at: string | null;
    external_ref: string | null;
  }>;
  return {
    status: "APPLIED",
    rows: rows.map((r) => ({
      submissionId: r.submission_id,
      invoiceId: r.invoice_id,
      providerId: r.provider_id,
      providerKindSnapshot: r.provider_kind_snapshot as EInvoicingProviderKind,
      format: r.format as EInvoicingSubmissionFormat,
      status: r.status as EInvoicingSubmissionStatus,
      payloadGapCount: Number(r.payload_gap_count),
      exportedAt: r.exported_at,
      submittedAt: r.submitted_at,
      acceptedAt: r.accepted_at,
      rejectedAt: r.rejected_at,
      externalRef: r.external_ref,
    })),
  };
}
