import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/database";

/**
 * C32 — honest Growth attribution helpers.
 *
 * DOCTRINE: reports MUST break down by confidence and MUST NEVER
 * collapse OBSERVED + ESTIMATED into a single "attributed" bucket.
 * Consumer UI must render UNKNOWN as its own row (the dark funnel
 * is a real number, not "organic"). AI code that fabricates an
 * OBSERVED label without a technical signal / human attestation
 * is a doctrine violation.
 */

interface Deps { client?: SupabaseClient<Database>; }

export type AttributionSourceType =
  | "CAMPAIGN" | "LEAD" | "CONVERSATION"
  | "PUBLICATION" | "MANUAL" | "UNKNOWN";

export type AttributionConfidence = "OBSERVED" | "ESTIMATED" | "UNKNOWN";

export type RecordAttributionResult =
  | { status: "APPLIED"; attributionId: string }
  | { status: "ERROR"; reason: string };

export interface RecordOpportunityAttributionInput {
  organizationId: string;
  opportunityId: string;
  sourceType: AttributionSourceType;
  sourceId?: string | null;
  confidence: AttributionConfidence;
  reason: string;
  attributedByUserId?: string | null;
  provenance?: Record<string, unknown> | null;
}

export async function recordOpportunityAttribution(
  input: RecordOpportunityAttributionInput,
  deps: Deps = {},
): Promise<RecordAttributionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("record_opportunity_attribution", {
    target_organization_id: input.organizationId,
    target_opportunity_id: input.opportunityId,
    target_source_type: input.sourceType,
    target_source_id: input.sourceId ?? null,
    target_confidence: input.confidence,
    target_reason: input.reason,
    target_attributed_by_user_id: input.attributedByUserId ?? null,
    target_provenance: (input.provenance ?? {}) as unknown as Json,
  });
  if (error) return { status: "ERROR", reason: `record_opportunity_attribution: ${error.message}` };
  return { status: "APPLIED", attributionId: data as string };
}

export type AttributionActionResult =
  | { status: "APPLIED" } | { status: "NOT_ELIGIBLE" } | { status: "ERROR"; reason: string };

export interface RevokeOpportunityAttributionInput {
  organizationId: string;
  attributionId: string;
  revokedByUserId: string;
  reason: string;
}

export async function revokeOpportunityAttribution(
  input: RevokeOpportunityAttributionInput,
  deps: Deps = {},
): Promise<AttributionActionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("revoke_opportunity_attribution", {
    target_organization_id: input.organizationId,
    target_attribution_id: input.attributionId,
    target_revoked_by_user_id: input.revokedByUserId,
    target_reason: input.reason,
  });
  if (error) return { status: "ERROR", reason: `revoke_opportunity_attribution: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

export interface AttributionReportRow {
  sourceType: AttributionSourceType;
  sourceId: string | null;
  confidence: AttributionConfidence;
  opportunityCount: number;
  distinctOpportunities: number;
  totalEstimatedValue: number;
  currencyMix: string[];
}

export type AttributionReportResult =
  | { status: "APPLIED"; rows: AttributionReportRow[] }
  | { status: "ERROR"; reason: string };

export interface AttributionReportInput {
  organizationId: string;
  since: Date;
  until: Date;
}

export async function attributionReportBySource(
  input: AttributionReportInput,
  deps: Deps = {},
): Promise<AttributionReportResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("attribution_report_by_source", {
    target_organization_id: input.organizationId,
    target_since: input.since.toISOString(),
    target_until: input.until.toISOString(),
  });
  if (error) return { status: "ERROR", reason: `attribution_report_by_source: ${error.message}` };
  const rows = (data ?? []) as Array<{
    source_type: string;
    source_id: string | null;
    confidence: string;
    opportunity_count: number;
    distinct_opportunities: number;
    total_estimated_value: number;
    currency_mix: string[] | null;
  }>;
  return {
    status: "APPLIED",
    rows: rows.map((r) => ({
      sourceType: r.source_type as AttributionSourceType,
      sourceId: r.source_id,
      confidence: r.confidence as AttributionConfidence,
      opportunityCount: Number(r.opportunity_count),
      distinctOpportunities: Number(r.distinct_opportunities),
      totalEstimatedValue: Number(r.total_estimated_value),
      currencyMix: r.currency_mix ?? [],
    })),
  };
}

export interface OpportunityAttributionRow {
  attributionId: string;
  sourceType: AttributionSourceType;
  sourceId: string | null;
  confidence: AttributionConfidence;
  reason: string;
  attributedByUserId: string | null;
  attributedAt: string;
  revokedAt: string | null;
  revokedByUserId: string | null;
  revokeReason: string | null;
  provenance: Json;
}

export type OpportunityAttributionsResult =
  | { status: "APPLIED"; rows: OpportunityAttributionRow[] }
  | { status: "ERROR"; reason: string };

export interface OpportunityAttributionsForInput {
  organizationId: string;
  opportunityId: string;
  includeRevoked?: boolean;
}

export async function opportunityAttributionsFor(
  input: OpportunityAttributionsForInput,
  deps: Deps = {},
): Promise<OpportunityAttributionsResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("opportunity_attributions_for", {
    target_organization_id: input.organizationId,
    target_opportunity_id: input.opportunityId,
    target_include_revoked: input.includeRevoked ?? false,
  });
  if (error) return { status: "ERROR", reason: `opportunity_attributions_for: ${error.message}` };
  const rows = (data ?? []) as Array<{
    attribution_id: string;
    source_type: string;
    source_id: string | null;
    confidence: string;
    reason: string;
    attributed_by_user_id: string | null;
    attributed_at: string;
    revoked_at: string | null;
    revoked_by_user_id: string | null;
    revoke_reason: string | null;
    provenance: Json;
  }>;
  return {
    status: "APPLIED",
    rows: rows.map((r) => ({
      attributionId: r.attribution_id,
      sourceType: r.source_type as AttributionSourceType,
      sourceId: r.source_id,
      confidence: r.confidence as AttributionConfidence,
      reason: r.reason,
      attributedByUserId: r.attributed_by_user_id,
      attributedAt: r.attributed_at,
      revokedAt: r.revoked_at,
      revokedByUserId: r.revoked_by_user_id,
      revokeReason: r.revoke_reason,
      provenance: r.provenance,
    })),
  };
}
