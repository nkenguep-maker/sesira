import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

/**
 * C33.1 — regulatory attestations helpers (F-Gas capacité entreprise +
 * aptitude technicien). Reference data (GWP / leak-check rules /
 * market bans) is service_role-only and NOT exposed through this
 * client seam. It is loaded via `supabase/seeds/regulatory_*.sql`
 * by a data operator.
 *
 * DOCTRINE: SESIRA NEVER declares "conforme". These helpers only
 * record attestation state + validity + revocation.
 */

interface Deps { client?: SupabaseClient<Database>; }

export type RegulatoryAttestationKind = "COMPANY_CAPACITY" | "TECHNICIAN_APTITUDE";
export type RegulatoryAttestationScope =
  | "CATEGORY_I" | "CATEGORY_II" | "CATEGORY_III" | "CATEGORY_IV" | "OTHER";

export type RegulatoryActionResult =
  | { status: "APPLIED" } | { status: "NOT_ELIGIBLE" } | { status: "ERROR"; reason: string };

export interface RecordRegulatoryAttestationInput {
  organizationId: string;
  attestationKind: RegulatoryAttestationKind;
  scope: RegulatoryAttestationScope;
  holderUserId?: string | null;
  referenceNumber: string;
  issuedBy: string;
  issuedAt: string; // ISO date
  validFrom: string;
  validUntil: string;
  documentId?: string | null;
}

export type RecordAttestationResult =
  | { status: "APPLIED"; attestationId: string }
  | { status: "ERROR"; reason: string };

export async function recordRegulatoryAttestation(
  input: RecordRegulatoryAttestationInput,
  deps: Deps = {},
): Promise<RecordAttestationResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("record_regulatory_attestation", {
    target_organization_id: input.organizationId,
    target_attestation_kind: input.attestationKind,
    target_scope: input.scope,
    target_holder_user_id: input.holderUserId ?? null,
    target_reference_number: input.referenceNumber,
    target_issued_by: input.issuedBy,
    target_issued_at: input.issuedAt,
    target_valid_from: input.validFrom,
    target_valid_until: input.validUntil,
    target_document_id: input.documentId ?? null,
  });
  if (error) return { status: "ERROR", reason: `record_regulatory_attestation: ${error.message}` };
  return { status: "APPLIED", attestationId: data as string };
}

export interface RevokeRegulatoryAttestationInput {
  organizationId: string;
  attestationId: string;
  reason: string;
}

export async function revokeRegulatoryAttestation(
  input: RevokeRegulatoryAttestationInput,
  deps: Deps = {},
): Promise<RegulatoryActionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("revoke_regulatory_attestation", {
    target_organization_id: input.organizationId,
    target_attestation_id: input.attestationId,
    target_reason: input.reason,
  });
  if (error) return { status: "ERROR", reason: `revoke_regulatory_attestation: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}
