import { describe, expect, it } from "vitest";

import { GROWTH_CHANNELS, GROWTH_CONTENT_STATUSES } from "@/lib/growth/contracts";
import { createDemoGrowthRepository } from "@/lib/growth/demo-repository";

describe("demo Growth repository", () => {
  const repository = createDemoGrowthRepository({ organizationName: "Clima Rhône", sectorKey: "CVC" });

  it("returns explicit demo data for the authenticated organization label", async () => {
    const [summary, knowledge] = await Promise.all([
      repository.getSummary(),
      repository.getOrganizationKnowledge(),
    ]);

    expect(summary.source).toBe("DEMO");
    expect(summary.data).toEqual({ ideasToPrepare: 3, contentToReview: 1, plannedPublications: 4 });
    expect(knowledge.data.organizationName).toBe("Clima Rhône");
    expect(knowledge.data.certifications).toContain("À confirmer par votre équipe");
  });

  it("covers every initial content status and publication channel", async () => {
    const [content, publications] = await Promise.all([
      repository.listContent(),
      repository.listPublications(),
    ]);

    expect(new Set(content.data.map((item) => item.status))).toEqual(new Set(GROWTH_CONTENT_STATUSES));
    expect(new Set(publications.data.map((item) => item.channel))).toEqual(new Set(GROWTH_CHANNELS));
  });

  it("exposes no generation, scheduling or publication mutation", () => {
    expect(repository).not.toHaveProperty("generate");
    expect(repository).not.toHaveProperty("schedule");
    expect(repository).not.toHaveProperty("publish");
    expect(Object.keys(repository)).toEqual([
      "getSummary",
      "listIdeas",
      "listContent",
      "listPublications",
      "getOrganizationKnowledge",
    ]);
  });
});
