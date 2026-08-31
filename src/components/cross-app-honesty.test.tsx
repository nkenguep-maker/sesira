import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));

import { ImportExperience } from "@/components/imports/import-experience";
import { OnboardingExperience } from "@/components/onboarding/onboarding-experience";

describe("Cross-app action honesty", () => {
  it("maintient l’analyse d’import désactivée sans action serveur", () => {
    const html = renderToStaticMarkup(<ImportExperience view="new" />);
    expect(html).toContain("ANALYSE INDISPONIBLE");
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Analyser le fichier<\/button>/);
  });

  it("fait naviguer l’onboarding vers les vraies surfaces disponibles", () => {
    const html = renderToStaticMarkup(<OnboardingExperience initialStep={3} organization={{ name: "Entreprise", sectorKey: "CVC", status: "ACTIVE" }} members={[]} quoteCount={0} integrations={[]} />);
    expect(html).toContain('href="/app/imports/new"');
    expect(html).toContain("Aucun devis importé");
    expect(html).not.toContain("progression est enregistrée sur votre espace");
  });
});
