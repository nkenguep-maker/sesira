import "server-only";

import { safeClient } from "@/lib/data/safe-client";
import { isCommercialObjectionKind } from "@/lib/commercial/objections";
import type { OpportunityCommercialSnapshot } from "@/lib/commercial/signals";

export async function getOpportunityCommercialSnapshot(organizationId: string, opportunityId: string): Promise<OpportunityCommercialSnapshot | null> {
  const supabase = await safeClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("get_opportunity_commercial_snapshot" as never, {
    target_organization_id: organizationId,
    target_opportunity_id: opportunityId,
  } as never);
  if (error) {
    console.error("[lib/data] getOpportunityCommercialSnapshot:", error.message);
    return null;
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  return parseSnapshot(data as Record<string, unknown>);
}

function parseSnapshot(raw: Record<string, unknown>): OpportunityCommercialSnapshot | null {
  if (!isRecord(raw.opportunity)) return null;
  const opportunity = raw.opportunity;
  if (typeof opportunity.id !== "string" || typeof opportunity.opened_at !== "string" || typeof opportunity.updated_at !== "string" || typeof opportunity.commercial_state !== "string" || typeof opportunity.currency !== "string") return null;

  const latest = isRecord(raw.latest_quote) ? raw.latest_quote : null;
  const inbound = isRecord(raw.last_inbound) ? raw.last_inbound : null;
  const objectionsRaw = Array.isArray(raw.open_objections) ? raw.open_objections : [];

  return {
    opportunity: {
      id: opportunity.id,
      openedAt: opportunity.opened_at,
      updatedAt: opportunity.updated_at,
      commercialState: opportunity.commercial_state,
      estimatedValue: typeof opportunity.estimated_value === "number" ? opportunity.estimated_value : null,
      currency: opportunity.currency,
    },
    latestQuote: latest && typeof latest.id === "string" && typeof latest.status === "string" && typeof latest.updated_at === "string" ? {
      id: latest.id,
      status: latest.status,
      sentAt: stringOrNull(latest.sent_at),
      updatedAt: latest.updated_at,
      nextActionAt: stringOrNull(latest.next_action_at),
      automationPausedAt: stringOrNull(latest.automation_paused_at),
      automationPauseReason: stringOrNull(latest.automation_pause_reason),
      optedOutAt: stringOrNull(latest.opted_out_at),
    } : null,
    lastInbound: inbound && typeof inbound.message_id === "string" ? {
      messageId: inbound.message_id,
      receivedAt: stringOrNull(inbound.received_at),
      intent: stringOrNull(inbound.intent),
      confidence: typeof inbound.confidence === "number" ? inbound.confidence : null,
    } : null,
    objections: objectionsRaw.flatMap((value) => {
      if (!isRecord(value) || typeof value.id !== "string" || typeof value.message_id !== "string" || typeof value.kind !== "string" || !isCommercialObjectionKind(value.kind) || typeof value.summary !== "string" || typeof value.confidence !== "number" || (value.source !== "AI" && value.source !== "HUMAN") || typeof value.sensitive !== "boolean" || typeof value.updated_at !== "string") return [];
      return [{ id: value.id, messageId: value.message_id, kind: value.kind, summary: value.summary, evidence: stringOrNull(value.evidence), confidence: value.confidence, source: value.source, sensitive: value.sensitive, updatedAt: value.updated_at }];
    }),
    emailOpenSignalUsed: false,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function stringOrNull(value: unknown): string | null { return typeof value === "string" ? value : null; }
