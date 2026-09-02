import { isSensitiveObjectionKind, type CommercialObjectionKind } from "@/lib/commercial/objections";
import type { OpportunityCommercialSnapshot } from "@/lib/commercial/signals";

export const C21_REAL_WORLD_CALIBRATION = "PENDING" as const;
export const C21_REFERENCE_NOW = "2026-09-02T12:00:00.000Z";

const OBJECTION_KINDS: readonly CommercialObjectionKind[] = [
  "PRICE",
  "TIMING",
  "COMPETITION",
  "BUDGET",
  "TECHNICAL",
  "COMPLAINT",
  "LEGAL",
  "CONTRACTUAL",
  "FINANCIAL",
  "OTHER",
  "UNCERTAIN",
];

const INTENTS = ["ACCEPTED_QUOTE", "PRICE_OBJECTION", "REQUEST_INFO", "POSTPONED", "COMPLAINT", "OTHER"] as const;

export type C21SyntheticCase = {
  tenantId: string;
  ordinal: number;
  variantCount: number;
  optionCount: number;
  concurrentActionSourceId: string;
  snapshot: OpportunityCommercialSnapshot;
};

export type C21Coverage = {
  total: number;
  tenants: number;
  highValue: number;
  aged: number;
  partialData: number;
  noInbound: number;
  noQuote: number;
  sensitiveObjections: number;
  humanCorrectedObjections: number;
  pausedOrOptedOut: number;
  multiVariant: number;
  withOptions: number;
  calibration: typeof C21_REAL_WORLD_CALIBRATION;
};

export function generateC21SyntheticCorpus(options: { tenants?: number; opportunitiesPerTenant?: number } = {}): C21SyntheticCase[] {
  const tenants = clampPositive(options.tenants ?? 3, 1, 12);
  const opportunitiesPerTenant = clampPositive(options.opportunitiesPerTenant ?? 1_200, 1, 10_000);
  const now = new Date(C21_REFERENCE_NOW);
  const corpus: C21SyntheticCase[] = [];

  for (let tenantIndex = 0; tenantIndex < tenants; tenantIndex += 1) {
    const tenantId = `tenant-${String(tenantIndex + 1).padStart(2, "0")}`;
    for (let ordinal = 0; ordinal < opportunitiesPerTenant; ordinal += 1) {
      const ageDays = 1 + ((ordinal * 17 + tenantIndex * 11) % 420);
      const opportunityId = `${tenantId}-opp-${String(ordinal + 1).padStart(5, "0")}`;
      const estimatedValue = ordinal % 17 === 0 ? null : 4_000 + ((ordinal * 7_913 + tenantIndex * 19_000) % 240_000);
      const variantCount = 1 + ((ordinal + tenantIndex) % 4);
      const optionCount = (ordinal * 3 + tenantIndex) % 6;
      const noQuote = ordinal % 13 === 0;
      const noInbound = ordinal % 5 === 0;
      const paused = !noQuote && ordinal % 19 === 0;
      const optedOut = !noQuote && !paused && ordinal % 41 === 0;
      const noNextAction = !noQuote && ordinal % 7 === 0;
      const objectionCount = ordinal % 4 === 0 ? (ordinal % 29 === 0 ? 2 : 1) : 0;

      const objections = Array.from({ length: objectionCount }, (_, objectionIndex) => {
        const kind = OBJECTION_KINDS[(ordinal + objectionIndex + tenantIndex) % OBJECTION_KINDS.length];
        const source = (ordinal + objectionIndex) % 9 === 0 ? "HUMAN" as const : "AI" as const;
        const confidence = source === "HUMAN" ? 1 : 0.31 + (((ordinal * 13 + objectionIndex * 17) % 68) / 100);
        return {
          id: `${opportunityId}-obj-${objectionIndex + 1}`,
          messageId: `${opportunityId}-msg-${objectionIndex + 1}`,
          kind,
          summary: `${kind} observée sur le dossier synthétique ${ordinal + 1}.`,
          evidence: ordinal % 23 === 0 ? null : `Élément synthétique explicite ${ordinal + 1}.${objectionIndex + 1}`,
          confidence,
          source,
          sensitive: isSensitiveObjectionKind(kind),
          updatedAt: isoDaysAgo(now, Math.max(0, ageDays - ((ordinal + objectionIndex) % Math.max(ageDays, 1)))),
        };
      });

      const snapshot: OpportunityCommercialSnapshot = {
        opportunity: {
          id: opportunityId,
          openedAt: isoDaysAgo(now, ageDays),
          updatedAt: isoDaysAgo(now, ordinal % 31),
          commercialState: ordinal % 11 === 0 ? "WON" : ordinal % 17 === 0 ? "LOST" : "ACTIVE",
          estimatedValue,
          currency: tenantIndex % 3 === 2 ? "CHF" : "EUR",
        },
        latestQuote: noQuote ? null : {
          id: `${opportunityId}-quote-current`,
          status: ordinal % 9 === 0 ? "REPLIED" : ordinal % 6 === 0 ? "FOLLOWING_UP" : "SENT",
          sentAt: ordinal % 37 === 0 ? null : isoDaysAgo(now, Math.min(ageDays, 1 + (ordinal % 80))),
          updatedAt: isoDaysAgo(now, ordinal % 21),
          nextActionAt: noNextAction ? null : isoDaysFromNow(now, 1 + (ordinal % 14)),
          automationPausedAt: paused ? isoDaysAgo(now, ordinal % 8) : null,
          automationPauseReason: paused ? (ordinal % 2 === 0 ? "COMPLAINT" : "REVIEW") : null,
          optedOutAt: optedOut ? isoDaysAgo(now, ordinal % 9) : null,
        },
        lastInbound: noInbound ? null : {
          messageId: `${opportunityId}-last-inbound`,
          receivedAt: ordinal % 47 === 0 ? null : isoDaysAgo(now, ordinal % 26),
          intent: ordinal % 31 === 0 ? null : INTENTS[(ordinal + tenantIndex) % INTENTS.length],
          confidence: ordinal % 31 === 0 ? null : ((ordinal * 11 + tenantIndex * 7) % 101) / 100,
        },
        objections,
        emailOpenSignalUsed: false,
      };

      corpus.push({
        tenantId,
        ordinal,
        variantCount,
        optionCount,
        concurrentActionSourceId: deterministicUuid(tenantIndex, ordinal),
        snapshot,
      });
    }
  }

  return corpus;
}

export function tenantProjection(corpus: readonly C21SyntheticCase[], tenantId: string): C21SyntheticCase[] {
  return corpus.filter((item) => item.tenantId === tenantId);
}

export function summarizeC21Coverage(corpus: readonly C21SyntheticCase[]): C21Coverage {
  const tenantIds = new Set<string>();
  let highValue = 0;
  let aged = 0;
  let partialData = 0;
  let noInbound = 0;
  let noQuote = 0;
  let sensitiveObjections = 0;
  let humanCorrectedObjections = 0;
  let pausedOrOptedOut = 0;
  let multiVariant = 0;
  let withOptions = 0;
  const now = new Date(C21_REFERENCE_NOW).getTime();

  for (const item of corpus) {
    tenantIds.add(item.tenantId);
    const snapshot = item.snapshot;
    if ((snapshot.opportunity.estimatedValue ?? 0) >= 100_000) highValue += 1;
    const openedAt = new Date(snapshot.opportunity.openedAt).getTime();
    if (Number.isFinite(openedAt) && now - openedAt >= 90 * 86_400_000) aged += 1;
    if (snapshot.opportunity.estimatedValue === null || snapshot.latestQuote?.sentAt === null || snapshot.lastInbound?.intent === null) partialData += 1;
    if (!snapshot.lastInbound) noInbound += 1;
    if (!snapshot.latestQuote) noQuote += 1;
    sensitiveObjections += snapshot.objections.filter((objection) => objection.sensitive).length;
    humanCorrectedObjections += snapshot.objections.filter((objection) => objection.source === "HUMAN").length;
    if (snapshot.latestQuote?.automationPausedAt || snapshot.latestQuote?.optedOutAt) pausedOrOptedOut += 1;
    if (item.variantCount > 1) multiVariant += 1;
    if (item.optionCount > 0) withOptions += 1;
  }

  return {
    total: corpus.length,
    tenants: tenantIds.size,
    highValue,
    aged,
    partialData,
    noInbound,
    noQuote,
    sensitiveObjections,
    humanCorrectedObjections,
    pausedOrOptedOut,
    multiVariant,
    withOptions,
    calibration: C21_REAL_WORLD_CALIBRATION,
  };
}

function deterministicUuid(tenantIndex: number, ordinal: number): string {
  const suffix = (tenantIndex * 10_000 + ordinal + 1).toString(16).padStart(12, "0");
  return `c2100000-0000-4000-8000-${suffix}`;
}

function isoDaysAgo(now: Date, days: number): string {
  return new Date(now.getTime() - days * 86_400_000).toISOString();
}

function isoDaysFromNow(now: Date, days: number): string {
  return new Date(now.getTime() + days * 86_400_000).toISOString();
}

function clampPositive(value: number, min: number, max: number): number {
  if (!Number.isInteger(value) || value < min || value > max) throw new RangeError(`value must be an integer in [${min}, ${max}]`);
  return value;
}
