import { describe, expect, it } from "vitest";

import { buildCommercialSignalFactors } from "@/lib/commercial/signals";
import { attentionFromSourceKey, aiRunKey } from "@/lib/idempotency/keys";

import {
  C21_REAL_WORLD_CALIBRATION,
  C21_REFERENCE_NOW,
  generateC21SyntheticCorpus,
  summarizeC21Coverage,
  tenantProjection,
} from "./c21-synthetic";

describe("C21 synthetic technical validation", () => {
  it("builds a deterministic 3 tenant corpus with 3600 opportunities", () => {
    const first = generateC21SyntheticCorpus();
    const second = generateC21SyntheticCorpus();
    expect(first).toHaveLength(3_600);
    expect(second.slice(0, 100)).toEqual(first.slice(0, 100));
    expect(new Set(first.map((item) => item.tenantId))).toEqual(new Set(["tenant-01", "tenant-02", "tenant-03"]));
  });

  it("keeps tenant projections strictly isolated", () => {
    const corpus = generateC21SyntheticCorpus();
    for (const tenantId of ["tenant-01", "tenant-02", "tenant-03"]) {
      const projection = tenantProjection(corpus, tenantId);
      expect(projection).toHaveLength(1_200);
      expect(projection.every((item) => item.tenantId === tenantId)).toBe(true);
      expect(projection.every((item) => item.snapshot.opportunity.id.startsWith(`${tenantId}-opp-`))).toBe(true);
    }
  });

  it("covers high value, aging, partial data, objections, variants, options and safety states", () => {
    const coverage = summarizeC21Coverage(generateC21SyntheticCorpus());
    expect(coverage).toMatchObject({ total: 3_600, tenants: 3, calibration: "PENDING" });
    expect(coverage.highValue).toBeGreaterThan(1_000);
    expect(coverage.aged).toBeGreaterThan(2_000);
    expect(coverage.partialData).toBeGreaterThan(300);
    expect(coverage.noInbound).toBeGreaterThan(600);
    expect(coverage.noQuote).toBeGreaterThan(250);
    expect(coverage.sensitiveObjections).toBeGreaterThan(300);
    expect(coverage.humanCorrectedObjections).toBeGreaterThan(80);
    expect(coverage.pausedOrOptedOut).toBeGreaterThan(150);
    expect(coverage.multiVariant).toBeGreaterThan(2_500);
    expect(coverage.withOptions).toBeGreaterThan(2_500);
    expect(C21_REAL_WORLD_CALIBRATION).toBe("PENDING");
  });

  it("renders explainable factors for every synthetic case without using email opens as interest", () => {
    const corpus = generateC21SyntheticCorpus();
    const now = new Date(C21_REFERENCE_NOW);

    for (const item of corpus) {
      expect(item.snapshot.emailOpenSignalUsed).toBe(false);
      const factors = buildCommercialSignalFactors(item.snapshot, now);
      const opens = factors.find((factor) => factor.key === "EMAIL_OPENS");
      expect(opens).toBeDefined();
      expect(opens?.source).toBe("SAFETY_CONTRACT");
      expect(opens?.value).toBe("Non utilisées comme signal d'intérêt");
      expect(factors.every((factor) => !Object.prototype.hasOwnProperty.call(factor, "score"))).toBe(true);
    }
  });

  it("does not crash on deliberately sparse snapshots", () => {
    const sparse = generateC21SyntheticCorpus({ tenants: 1, opportunitiesPerTenant: 260 })
      .filter((item) => item.snapshot.latestQuote === null || item.snapshot.lastInbound === null || item.snapshot.opportunity.estimatedValue === null);
    expect(sparse.length).toBeGreaterThan(70);
    for (const item of sparse) {
      expect(() => buildCommercialSignalFactors(item.snapshot, new Date(C21_REFERENCE_NOW))).not.toThrow();
    }
  });

  it("keeps replay identities stable under concurrent synthetic callers", async () => {
    const corpus = generateC21SyntheticCorpus({ tenants: 1, opportunitiesPerTenant: 50 });
    const target = corpus[0];
    const attentionKeys = await Promise.all(
      Array.from({ length: 2_000 }, async () => attentionFromSourceKey("c21_concurrent_review", target.concurrentActionSourceId)),
    );
    const aiKeys = await Promise.all(
      Array.from({ length: 2_000 }, async () => aiRunKey("reply_classification", target.concurrentActionSourceId, "2")),
    );
    expect(new Set(attentionKeys).size).toBe(1);
    expect(new Set(aiKeys).size).toBe(1);
  });
});
