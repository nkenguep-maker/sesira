import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PublicSite } from "@/components/public/public-site";

describe("PublicSite", () => {
  it("présente la promesse et les douze parties attendues", () => {
    const html = renderToStaticMarkup(<PublicSite />);

    expect(html).toContain("Votre entreprise,");
    expect(html).toContain("mieux organisée.");
    expect(html).toContain('id="produit"');
    expect(html).toContain('id="demandes"');
    expect(html).toContain('id="devis"');
    expect(html).toContain('id="a-traiter"');
    expect(html).toContain('id="growth"');
    expect(html).toContain('id="resultats"');
    expect(html).toContain('id="mise-en-place"');
    expect(html).toContain('id="securite"');
    expect(html).toContain('id="diagnostic"');
    expect(html).toContain('id="offre"');
    expect(html).toContain("Votre prochaine étape");
  });

  it("dirige les actions principales vers le diagnostic", () => {
    const html = renderToStaticMarkup(<PublicSite />);
    const diagnosticLinks = html.match(/href="\/diagnostic"/g) ?? [];

    expect(diagnosticLinks.length).toBeGreaterThanOrEqual(4);
    expect(html).toContain("Voir mes priorités");
  });

  it("ne présente ni preuve sociale ni résultat inventé", () => {
    const text = renderToStaticMarkup(<PublicSite />).toLowerCase();
    const forbiddenTerms = [
      "témoignage",
      "ils nous font confiance",
      "chiffre d’affaires généré",
      "benchmark",
      "ai agent",
      "workflow",
      "pipeline",
      "lead engine",
      "quote recovery",
      "roi",
    ];

    forbiddenTerms.forEach((term) => expect(text).not.toMatch(new RegExp(`\\b${term}\\b`, "i")));
    expect(text).toContain("aucun montant estimé n’est présenté comme un revenu généré");
    expect(text).toContain("résultats inventés");
  });
});
