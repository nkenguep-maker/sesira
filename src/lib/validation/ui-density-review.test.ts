import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("dense workspace UI review", () => {
  it("groups navigation by work domain and removes decorative numbering", () => {
    const navigation = source("src/lib/navigation.ts");
    const shell = source("src/components/sesira/app-shell.tsx");

    expect(navigation).toContain('label: "Commercial"');
    expect(navigation).toContain('label: "Système"');
    expect(navigation).toContain('label: "Pilotage"');
    expect(navigation).not.toContain('index: "01"');
    expect(shell).not.toContain("nav-index");
    expect(shell).not.toContain("Identité fournie par le core");
    expect(shell).toContain("workspaceName");
    expect(shell).toContain("roleLabel");
  });

  it("uses a real first-run setup instead of a dashboard full of zeroes", () => {
    const dashboard = source("src/app/app/page.tsx");
    expect(dashboard).toContain("setupStateIsReliable");
    expect(dashboard).toContain("setupRequired");
    expect(dashboard).toContain("Préparer {organizationName}");
    expect(dashboard).toContain("Ajouter vos données");
    expect(dashboard).toContain("Connecter la messagerie");
    expect(dashboard).not.toContain("Dossiers enregistrés");
  });

  it("separates primary workflow actions from configuration actions", () => {
    const dashboard = source("src/app/app/page.tsx");
    expect(dashboard).toContain('className="button primary small">Voir le suivi');
    expect(dashboard).toContain('className="secondary-action-link">Régler le délai');
    expect(dashboard).toContain('className="policy-action-chip"');
    expect(dashboard).not.toContain("<span>↘</span>");
  });

  it("locks compact hierarchy, readable notes and accessible action contrast", () => {
    const css = source("src/app/app-workspace-dense.css");
    expect(css).toContain("font-size: 20px");
    expect(css).toContain("min-height: 86px");
    expect(css).toContain("max-width: 70ch");
    expect(css).toContain("--app-action: #a84327");
    expect(css).toContain("background: rgba(168, 67, 39, .08)");
    expect(css).not.toContain(".app-nav a.active {\n  background: var(--ink)");
  });

  it("densifies existing product surfaces without changing the public landing", () => {
    const css = source("src/app/app-surfaces-dense.css");
    expect(css).toContain(".app-frame .premium-section-heading h2");
    expect(css).toContain("font-size: 20px");
    expect(css).toContain("min-height: 84px");
    expect(css).toContain("min-height: 220px");
    expect(css).toContain("background: #f4eee7");
  });

  it("removes engineering vocabulary from the reviewed user-facing flows", () => {
    const onboarding = source("src/components/onboarding/onboarding-experience.tsx");
    const quotes = source("src/app/app/devis/page.tsx");
    const opportunity = source("src/app/app/opportunites/[id]/page.tsx");
    const policies = source("src/app/app/parametres/politiques/page.tsx");

    expect(onboarding).not.toContain("core SESIRA");
    expect(onboarding).not.toContain("saveOnboardingDraft");
    expect(onboarding).not.toContain("succès backend");
    expect(quotes).not.toContain("Prêt côté Core");
    expect(quotes).not.toContain("Le Core");
    expect(opportunity).not.toContain("vocabulaire C18");
    expect(opportunity).not.toContain("Le Core");
    expect(policies).not.toContain("confirmé par le Core");
    expect(policies).not.toContain("Le Core n’a pas confirmé");
  });
});
