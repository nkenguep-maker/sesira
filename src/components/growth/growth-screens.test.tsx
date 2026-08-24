import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/app/marketing" }));

import {
  MarketingContentScreen,
  MarketingHomeScreen,
  MarketingIdeasScreen,
  MarketingPublicationsScreen,
} from "@/components/growth/growth-screens";
import { createDemoGrowthRepository } from "@/lib/growth/demo-repository";

const repository = createDemoGrowthRepository({ organizationName: "Clima Rhône", sectorKey: "CVC" });

describe("Growth product screens", () => {
  it("shows the marketing summary and organization knowledge with explicit demo language", async () => {
    const [summary, knowledge, ideas, content, publications] = await Promise.all([
      repository.getSummary(),
      repository.getOrganizationKnowledge(),
      repository.listIdeas(),
      repository.listContent(),
      repository.listPublications(),
    ]);
    const html = renderToStaticMarkup(<MarketingHomeScreen summary={summary} knowledge={knowledge} ideas={ideas} content={content} publications={publications} />);

    for (const label of ["Idées à préparer", "Contenus à valider", "Publications prévues", "VOTRE ENTREPRISE", "Clima Rhône"]) {
      expect(html).toContain(label);
    }
    expect(html).toContain("DÉMO");
    expect(html).toContain("Aucun contenu n’a été généré, planifié ou publié");
    expect(html).toContain("Économies garanties");
  });

  it("renders realistic ideas and all canonical content statuses", async () => {
    const [ideas, content] = await Promise.all([repository.listIdeas(), repository.listContent()]);
    const html = [
      renderToStaticMarkup(<MarketingIdeasScreen result={ideas} />),
      renderToStaticMarkup(<MarketingContentScreen result={content} />),
    ].join("\n");

    expect(html).toContain("Préparer sa pompe à chaleur avant l’hiver");
    for (const label of ["Idée", "Brouillon", "À valider", "Validé", "Planifié", "Publié"]) {
      expect(html).toContain(label);
    }
    expect(html).toContain("la décision finale appartient à votre équipe");
  });

  it("renders a responsive publication calendar for every supported channel", async () => {
    const publications = await repository.listPublications();
    const html = renderToStaticMarkup(<MarketingPublicationsScreen result={publications} />);

    for (const channel of ["LinkedIn", "Facebook", "Instagram", "Google Business", "Email"]) {
      expect(html).toContain(channel);
    }
    expect(html).toContain("sm:grid-cols-2");
    expect(html).toContain("md:grid-cols-[minmax(0,1fr)_180px_160px]");
    expect(html).toContain("ne déclenche aucun envoi");
  });

  it("supports empty idea, content and publication states", () => {
    const result = { data: [], source: "DEMO" as const, generatedAt: "2026-08-24T12:00:00.000Z" };
    const html = [
      renderToStaticMarkup(<MarketingIdeasScreen result={result} />),
      renderToStaticMarkup(<MarketingContentScreen result={result} />),
      renderToStaticMarkup(<MarketingPublicationsScreen result={result} />),
    ].join("\n");

    expect(html).toContain("Aucune idée à préparer");
    expect(html).toContain("Aucun contenu");
    expect(html).toContain("Aucune publication prévue");
  });
});
