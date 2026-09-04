import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/database";

/**
 * C35 — financing indicator server helpers.
 *
 * REGULATORY.md D-1: OPTION A — INDICATEUR (R519-2 CMF).
 *
 *   SESIRA peut : signaler un financeur, transmettre les coordonnées
 *                 (avec consentement tracé), suivre un statut déclaré
 *                 par un humain, remettre au client une checklist.
 *   SESIRA ne peut pas : conseiller, comparer, calculer taux/mensualité,
 *                       collecter/transmettre les documents contractuels,
 *                       décider d'un crédit, scorer une personne physique.
 *
 * Invariants:
 *   INV-05  audit-only commission recording (SESIRA n'initie aucun paiement)
 *   INV-06  no scoring — schema has no income/score/rate fields
 *   INV-04  status transitions require ACTIVE org member
 *
 * Wording (U35):
 *   « Signaler un financeur » / « Statut renseigné » /
 *   « Prochaine étape » / « Pièces à réunir »
 *   NEVER « SESIRA finance vous » / « SESIRA décide » /
 *   « Comparer les offres » / « Meilleur taux ».
 */

interface Deps { client?: SupabaseClient<Database>; }

export type FinancingActionResult =
  | { status: "APPLIED" } | { status: "NOT_ELIGIBLE" } | { status: "ERROR"; reason: string };

export type FinancingResourceResult =
  | { status: "APPLIED"; id: string }
  | { status: "ERROR"; reason: string };

export type FinancingPartnerType =
  | "BANK" | "FINANCE_COMPANY" | "LEASING" | "ECO_LOAN_OPERATOR" | "OTHER";

export type FinancingReferralStatus =
  | "INITIATED" | "IN_REVIEW" | "ACCEPTED" | "DECLINED" | "ABANDONED";

export interface ClientDocumentChecklistItem {
  code: string;
  label: string;
  required: boolean;
  note?: string | null;
}

// -------- Partners --------

export interface ConfigureFinancingPartnerInput {
  organizationId: string;
  partnerId?: string | null;
  name: string;
  partnerType: FinancingPartnerType;
  contactEmail?: string | null;
  contactPhone?: string | null;
  externalRef?: string | null;
  commissionTermsNote?: string | null;
}

export async function configureFinancingPartner(
  input: ConfigureFinancingPartnerInput,
  deps: Deps = {},
): Promise<FinancingResourceResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("configure_financing_partner", {
    target_organization_id: input.organizationId,
    target_partner_id: input.partnerId ?? null,
    target_name: input.name,
    target_partner_type: input.partnerType,
    target_contact_email: input.contactEmail ?? null,
    target_contact_phone: input.contactPhone ?? null,
    target_external_ref: input.externalRef ?? null,
    target_commission_terms_note: input.commissionTermsNote ?? null,
  });
  if (error) return { status: "ERROR", reason: `configure_financing_partner: ${error.message}` };
  return { status: "APPLIED", id: data as string };
}

export interface ArchiveFinancingPartnerInput {
  organizationId: string;
  partnerId: string;
  reason: string;
}

export async function archiveFinancingPartner(
  input: ArchiveFinancingPartnerInput,
  deps: Deps = {},
): Promise<FinancingActionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("archive_financing_partner", {
    target_organization_id: input.organizationId,
    target_partner_id: input.partnerId,
    target_reason: input.reason,
  });
  if (error) return { status: "ERROR", reason: `archive_financing_partner: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

// -------- Referrals --------

export interface InitiateFinancingReferralInput {
  organizationId: string;
  customerId: string;
  partnerId: string;
  opportunityId?: string | null;
  quoteId?: string | null;
  referredByUserId: string;
  consentScope: string;
  consentEvidenceNote?: string | null;
  clientDocumentChecklist?: ClientDocumentChecklistItem[] | null;
}

export async function initiateFinancingReferral(
  input: InitiateFinancingReferralInput,
  deps: Deps = {},
): Promise<FinancingResourceResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("initiate_financing_referral", {
    target_organization_id: input.organizationId,
    target_customer_id: input.customerId,
    target_partner_id: input.partnerId,
    target_opportunity_id: input.opportunityId ?? null,
    target_quote_id: input.quoteId ?? null,
    target_referred_by_user_id: input.referredByUserId,
    target_consent_scope: input.consentScope,
    target_consent_evidence_note: input.consentEvidenceNote ?? null,
    target_client_document_checklist: (input.clientDocumentChecklist ?? []) as unknown as Json,
  });
  if (error) return { status: "ERROR", reason: `initiate_financing_referral: ${error.message}` };
  return { status: "APPLIED", id: data as string };
}

export interface TransitionFinancingReferralInput {
  organizationId: string;
  referralId: string;
  newStatus: FinancingReferralStatus;
  actorUserId: string;
  notes?: string | null;
}

export async function transitionFinancingReferralStatus(
  input: TransitionFinancingReferralInput,
  deps: Deps = {},
): Promise<FinancingActionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("transition_financing_referral_status", {
    target_organization_id: input.organizationId,
    target_referral_id: input.referralId,
    target_new_status: input.newStatus,
    target_actor_user_id: input.actorUserId,
    target_notes: input.notes ?? null,
  });
  if (error) return { status: "ERROR", reason: `transition_financing_referral_status: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

export interface RecordFinancingCommissionInput {
  organizationId: string;
  referralId: string;
  amount: number;
  currency: string;
  actorUserId: string;
  note?: string | null;
}

export async function recordFinancingCommission(
  input: RecordFinancingCommissionInput,
  deps: Deps = {},
): Promise<FinancingActionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("record_financing_commission", {
    target_organization_id: input.organizationId,
    target_referral_id: input.referralId,
    target_amount: input.amount,
    target_currency: input.currency,
    target_actor_user_id: input.actorUserId,
    target_note: input.note ?? null,
  });
  if (error) return { status: "ERROR", reason: `record_financing_commission: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

// -------- Read helpers --------

export interface FinancingPartnerRow {
  partnerId: string;
  name: string;
  partnerType: FinancingPartnerType;
  externalRef: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  commissionTermsNote: string | null;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED";
  activatedAt: string;
}

export type ActivePartnersResult =
  | { status: "APPLIED"; partners: FinancingPartnerRow[] }
  | { status: "ERROR"; reason: string };

export async function activeFinancingPartners(
  organizationId: string,
  deps: Deps = {},
): Promise<ActivePartnersResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("active_financing_partners", {
    target_organization_id: organizationId,
  });
  if (error) return { status: "ERROR", reason: `active_financing_partners: ${error.message}` };
  const rows = (data ?? []) as Array<{
    partner_id: string; name: string; partner_type: string;
    external_ref: string | null; contact_email: string | null;
    contact_phone: string | null; commission_terms_note: string | null;
    status: string; activated_at: string;
  }>;
  return {
    status: "APPLIED",
    partners: rows.map((r) => ({
      partnerId: r.partner_id,
      name: r.name,
      partnerType: r.partner_type as FinancingPartnerType,
      externalRef: r.external_ref,
      contactEmail: r.contact_email,
      contactPhone: r.contact_phone,
      commissionTermsNote: r.commission_terms_note,
      status: r.status as "ACTIVE" | "PAUSED" | "ARCHIVED",
      activatedAt: r.activated_at,
    })),
  };
}

export interface FinancingReferralRow {
  referralId: string;
  customerId: string;
  partnerId: string;
  partnerName: string;
  opportunityId: string | null;
  quoteId: string | null;
  status: FinancingReferralStatus;
  referredByUserId: string;
  referredAt: string;
  statusChangedAt: string | null;
  statusNotes: string | null;
  commissionAmount: number | null;
  commissionCurrency: string | null;
  checklistItemCount: number;
}

export type ReferralsForResult =
  | { status: "APPLIED"; referrals: FinancingReferralRow[] }
  | { status: "ERROR"; reason: string };

export interface FinancingReferralsForInput {
  organizationId: string;
  statusFilter?: FinancingReferralStatus | null;
  customerId?: string | null;
}

export async function financingReferralsFor(
  input: FinancingReferralsForInput,
  deps: Deps = {},
): Promise<ReferralsForResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("financing_referrals_for", {
    target_organization_id: input.organizationId,
    target_status_filter: input.statusFilter ?? null,
    target_customer_id: input.customerId ?? null,
  });
  if (error) return { status: "ERROR", reason: `financing_referrals_for: ${error.message}` };
  const rows = (data ?? []) as Array<{
    referral_id: string; customer_id: string; partner_id: string;
    partner_name: string; opportunity_id: string | null; quote_id: string | null;
    status: string; referred_by_user_id: string; referred_at: string;
    status_changed_at: string | null; status_notes: string | null;
    commission_amount: number | null; commission_currency: string | null;
    checklist_item_count: number;
  }>;
  return {
    status: "APPLIED",
    referrals: rows.map((r) => ({
      referralId: r.referral_id,
      customerId: r.customer_id,
      partnerId: r.partner_id,
      partnerName: r.partner_name,
      opportunityId: r.opportunity_id,
      quoteId: r.quote_id,
      status: r.status as FinancingReferralStatus,
      referredByUserId: r.referred_by_user_id,
      referredAt: r.referred_at,
      statusChangedAt: r.status_changed_at,
      statusNotes: r.status_notes,
      commissionAmount: r.commission_amount === null ? null : Number(r.commission_amount),
      commissionCurrency: r.commission_currency,
      checklistItemCount: Number(r.checklist_item_count),
    })),
  };
}
