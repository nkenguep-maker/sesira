import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("dense workspace UI review", () => {
  it("keeps the daily rail compact and moves configuration behind the organization block", () => {
    const navigation = source("src/lib/navigation.ts");
    const shell = source("src/components/sesira/app-shell.tsx");

    expect(navigation).toContain("SESIRA_PRIMARY_NAV");
    expect(navigation).toContain('label: "Aujourd’hui"');
    expect(navigation).toContain('label: "Documents"');
    expect(navigation).toContain("SESIRA_ORGANIZATION_NAV");
    expect(navigation).not.toContain('label: "Commercial"');
    expect(navigation).not.toContain('label: "Système"');
    expect(navigation).not.toContain('label: "Pilotage"');
    expect(navigation).not.toContain('index: "01"');
    expect(shell).not.toContain("nav-index");
    expect(shell).not.toContain("Identité fournie par le core");
    expect(shell).toContain("workspaceName");
    expect(shell).toContain("OrganizationMenu");
    expect(shell).not.toContain("roleLabel");
  });

  it("uses a real first-run setup instead of a dashboard full of zeroes", () => {
    const dashboard = source("src/app/app/page.tsx");
    expect(dashboard).toContain("setupStateIsReliable");
    expect(dashboard).toContain("!hasBusinessData || !connectedEmail");
    expect(dashboard).toContain("FirstRunSetup");
    expect(dashboard).toContain("Préparer {organizationName}");
    expect(dashboard).toContain("Ajouter vos données");
    expect(dashboard).toContain("Connecter la messagerie");
    expect(dashboard).toContain("Elles ne sont pas remplacées par zéro");
    expect(dashboard).not.toContain("Dossiers enregistrés");
  });

  it("separates work actions from setup and configuration actions", () => {
    const dashboard = source("src/app/app/page.tsx");
    expect(dashboard).toContain('item.priority === 1 ? "button primary small" : "button ghost small"');
    expect(dashboard).toContain('className="secondary-action-link"');
    expect(dashboard).toContain('href="/app/parametres/politiques"');
    expect(dashboard).toContain('action="Régler le délai"');
    expect(dashboard).toContain('href="/app/automatisations"');
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
    const connections = source("src/app/app/integrations/page.tsx");

    expect(onboarding).not.toContain("core SESIRA");
    expect(onboarding).not.toContain("succès backend");
    expect(onboarding).toContain("Service email");
    expect(onboarding).toContain("Configuration enregistrée dans votre espace SESIRA");
    expect(quotes).not.toContain("Prêt côté Core");
    expect(quotes).not.toContain("Le Core");
    expect(opportunity).not.toContain("vocabulaire C18");
    expect(opportunity).not.toContain("Le Core");
    expect(policies).not.toContain("confirmé par le Core");
    expect(policies).not.toContain("Le Core n’a pas confirmé");
    expect(connections).not.toContain("backend");
    expect(connections).not.toContain("provider truth");
  });
});
