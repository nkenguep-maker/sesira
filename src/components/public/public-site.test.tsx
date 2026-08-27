import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PublicSite } from "@/components/public/public-site";

describe("PublicSite", () => {
  it("explique simplement comment Sesira aide une PME", () => {
    const html = renderToStaticMarkup(<PublicSite />);

    expect(html).toContain("Moins de tâches administratives");
    expect(html).toContain("Plus de demandes et de devis suivis");
    expect(html).toContain("Trois améliorations simples pour votre équipe");
    expect(html).toContain("Ne plus perdre une demande");
    expect(html).toContain("Toujours savoir quel devis suivre");
    expect(html).toContain("Garder les décisions importantes");
    expect(html).toContain('id="benefices"');
    expect(html).toContain('id="potentiel"');
    expect(html).toContain('id="fonctionnement"');
    expect(html).toContain('id="controle"');
    expect(html).not.toContain('id="growth"');
    expect(html).not.toContain('id="resultats"');
  });

  it("présente le potentiel comme une estimation transparente", () => {
    const html = renderToStaticMarkup(<PublicSite />);

    expect(html).toContain("Heures économisées × coût horaire");
    expect(html).toContain("Devis additionnels × devis moyen × marge");
    expect(html).toContain("Exemple fictif");
    expect(html).toContain("Hypothèse");
    expect(html).toContain("Potentiel mensuel estimé");
    expect(html).toContain("1 400 €");
    expect(html).toContain("Ce n’est ni une promesse, ni du chiffre d’affaires déjà généré");
  });

  it("oriente vers le diagnostic sans répéter l’offre", () => {
    const html = renderToStaticMarkup(<PublicSite />);
    const diagnosticLinks = html.match(/href="\/diagnostic"/g) ?? [];

    expect(diagnosticLinks).toHaveLength(3);
    expect(html).toContain("Calculer mon potentiel");
    expect(html).toContain("Calculer avec mes chiffres");
    expect(html).toContain("Le résultat apparaît avant le formulaire de contact");
  });

  it("utilise le système visuel Sesira v6 sans effets visuels génériques", () => {
    const html = renderToStaticMarkup(<PublicSite />).toLowerCase();
    const forbiddenTerms = [
      "ai agent",
      "workflow",
      "pipeline",
      "lead engine",
      "quote recovery",
      "benchmark",
      "témoignage",
      "ils nous font confiance",
    ];

    expect(html).toContain("var(--ink)");
    expect(html).toContain("var(--surface)");
    expect(html).toContain("var(--blue)");
    expect(html).toContain("var(--blue-light)");
    expect(html).toContain("var(--sand)");
    expect(html).toContain("var(--font-text)");
    expect(html).not.toContain("font-family:georgia");
    expect(html).not.toContain("bg-gradient");
    expect(html).not.toContain("blur-");
    expect(html).not.toContain("rounded-");
    expect(html).not.toContain("shadow-[0_0");
    forbiddenTerms.forEach((term) => expect(html).not.toContain(term));
  });
});
