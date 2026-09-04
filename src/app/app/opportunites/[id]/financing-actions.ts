"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getViewerContext } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

const PARTNER_TYPES = new Set(["BANK", "FINANCE_COMPANY", "LEASING", "ECO_LOAN_OPERATOR", "OTHER"]);
const REFERRAL_STATUSES = new Set(["INITIATED", "IN_REVIEW", "ACCEPTED", "DECLINED", "ABANDONED"]);

async function looseClient(): Promise<SupabaseClient> {
  return (await createClient()) as unknown as SupabaseClient;
}

export async function configureFinancingPartnerAction(formData: FormData) {
  const viewer = await getViewerContext();
  if (!viewer || !["OWNER", "ADMIN"].includes(viewer.role)) return;

  const opportunityId = String(formData.get("opportunityId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("partnerType") ?? "OTHER").trim();
  const contactEmail = String(formData.get("contactEmail") ?? "").trim();
  const contactPhone = String(formData.get("contactPhone") ?? "").trim();
  if (!opportunityId || !name || !PARTNER_TYPES.has(type)) return;

  const client = await looseClient();
  const { error } = await client.rpc("configure_financing_partner", {
    target_organization_id: viewer.organization.id,
    target_partner_id: null,
    target_name: name,
    target_partner_type: type,
    target_contact_email: contactEmail || null,
    target_contact_phone: contactPhone || null,
    target_external_ref: null,
    target_commission_terms_note: null,
  });
  if (!error) revalidateOpportunity(opportunityId);
}

export async function initiateFinancingReferralAction(formData: FormData) {
  const viewer = await getViewerContext();
  if (!viewer) return;

  const opportunityId = String(formData.get("opportunityId") ?? "").trim();
  const customerId = String(formData.get("customerId") ?? "").trim();
  const partnerId = String(formData.get("partnerId") ?? "").trim();
  const consentScope = String(formData.get("consentScope") ?? "").trim();
  const consentEvidence = String(formData.get("consentEvidence") ?? "").trim();
  const consentConfirmed = formData.get("consentConfirmed") === "1";
  if (!opportunityId || !customerId || !partnerId || !consentConfirmed || !consentScope) return;

  const client = await looseClient();
  const { error } = await client.rpc("initiate_financing_referral", {
    target_organization_id: viewer.organization.id,
    target_customer_id: customerId,
    target_partner_id: partnerId,
    target_opportunity_id: opportunityId,
    target_quote_id: null,
    target_referred_by_user_id: viewer.userId,
    target_consent_scope: consentScope,
    target_consent_evidence_note: consentEvidence || null,
    target_client_document_checklist: [],
  });
  if (!error) revalidateOpportunity(opportunityId);
}

export async function transitionFinancingReferralAction(formData: FormData) {
  const viewer = await getViewerContext();
  if (!viewer) return;

  const opportunityId = String(formData.get("opportunityId") ?? "").trim();
  const referralId = String(formData.get("referralId") ?? "").trim();
  const newStatus = String(formData.get("newStatus") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  if (!opportunityId || !referralId || !REFERRAL_STATUSES.has(newStatus)) return;

  const client = await looseClient();
  const { error } = await client.rpc("transition_financing_referral_status", {
    target_organization_id: viewer.organization.id,
    target_referral_id: referralId,
    target_new_status: newStatus,
    target_actor_user_id: viewer.userId,
    target_notes: notes || null,
  });
  if (!error) revalidateOpportunity(opportunityId);
}

function revalidateOpportunity(opportunityId: string) {
  revalidatePath(`/app/opportunites/${opportunityId}`);
  revalidatePath("/app/opportunites");
  revalidatePath("/app");
}
