import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

/**
 * C30 — Growth core server helpers. Six SECURITY DEFINER RPCs
 * wrapped as discriminated unions (same shape as C25-C29).
 *
 * AI must NEVER auto-qualify, auto-convert, auto-disqualify a
 * lead, nor auto-activate/end a campaign. Humans decide. AI may
 * only classify, suggest, or draft outreach in a separate
 * boundary (out of scope here).
 */

interface Deps { client?: SupabaseClient<Database>; }

export type GrowthActionResult =
  | { status: "APPLIED" } | { status: "NOT_ELIGIBLE" } | { status: "ERROR"; reason: string };

// -------- Campaigns --------

export interface ActivateGrowthCampaignInput {
  organizationId: string;
  campaignId: string;
  startAt: Date;
  endAt?: Date | null;
  budget?: number | null;
  currency?: string | null;
  externalRef?: string | null;
}

export async function activateGrowthCampaign(
  input: ActivateGrowthCampaignInput,
  deps: Deps = {},
): Promise<GrowthActionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("activate_growth_campaign", {
    target_organization_id: input.organizationId,
    target_campaign_id: input.campaignId,
    target_start_at: input.startAt.toISOString(),
    target_end_at: input.endAt ? input.endAt.toISOString() : null,
    target_budget: input.budget ?? null,
    target_currency: input.currency ?? null,
    target_external_ref: input.externalRef ?? null,
  });
  if (error) return { status: "ERROR", reason: `activate_growth_campaign: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

export type GrowthCampaignTransitionStatus = "PAUSED" | "ACTIVE" | "ENDED" | "CANCELLED";

export interface TransitionGrowthCampaignInput {
  organizationId: string;
  campaignId: string;
  newStatus: GrowthCampaignTransitionStatus;
  reason?: string | null;
}

export async function transitionGrowthCampaign(
  input: TransitionGrowthCampaignInput,
  deps: Deps = {},
): Promise<GrowthActionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("transition_growth_campaign", {
    target_organization_id: input.organizationId,
    target_campaign_id: input.campaignId,
    target_new_status: input.newStatus,
    target_reason: input.reason ?? null,
  });
  if (error) return { status: "ERROR", reason: `transition_growth_campaign: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

// -------- Leads --------

export interface QualifyLeadInput {
  organizationId: string;
  leadId: string;
  qualifiedByUserId: string;
  notes?: string | null;
}

export async function qualifyLead(
  input: QualifyLeadInput,
  deps: Deps = {},
): Promise<GrowthActionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("qualify_lead", {
    target_organization_id: input.organizationId,
    target_lead_id: input.leadId,
    target_qualified_by_user_id: input.qualifiedByUserId,
    target_notes: input.notes ?? null,
  });
  if (error) return { status: "ERROR", reason: `qualify_lead: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

export interface ConvertLeadInput {
  organizationId: string;
  leadId: string;
  opportunityId: string;
}

export async function convertLead(
  input: ConvertLeadInput,
  deps: Deps = {},
): Promise<GrowthActionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("convert_lead", {
    target_organization_id: input.organizationId,
    target_lead_id: input.leadId,
    target_opportunity_id: input.opportunityId,
  });
  if (error) return { status: "ERROR", reason: `convert_lead: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

export interface DisqualifyLeadInput {
  organizationId: string;
  leadId: string;
  reason: string;
}

export async function disqualifyLead(
  input: DisqualifyLeadInput,
  deps: Deps = {},
): Promise<GrowthActionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("disqualify_lead", {
    target_organization_id: input.organizationId,
    target_lead_id: input.leadId,
    target_reason: input.reason,
  });
  if (error) return { status: "ERROR", reason: `disqualify_lead: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

export interface ArchiveLeadInput {
  organizationId: string;
  leadId: string;
  reason?: string | null;
}

export async function archiveLead(
  input: ArchiveLeadInput,
  deps: Deps = {},
): Promise<GrowthActionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("archive_lead", {
    target_organization_id: input.organizationId,
    target_lead_id: input.leadId,
    target_reason: input.reason ?? null,
  });
  if (error) return { status: "ERROR", reason: `archive_lead: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}
