import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PublicSite } from "@/components/public/public-site";

describe("PublicSite", () => {
  it("présente un parcours concret sous forme de dossiers indexés", () => {
    const html = renderToStaticMarkup(<PublicSite />);

    expect(html).toContain("De la demande reçue au devis signé");
    expect(html).toContain("gardez chaque dossier sous contrôle");
    expect(html).toContain('id="produit"');
    expect(html).toContain('id="demandes"');
    expect(html).toContain('id="devis"');
    expect(html).toContain('id="a-traiter"');
    expect(html).toContain('id="growth"');
    expect(html).toContain('id="resultats"');
    expect(html).toContain('id="mise-en-place"');
    expect(html).toContain('id="confiance"');
    expect(html).toContain('id="diagnostic"');
    expect(html).not.toContain('id="offre"');

    ["01", "02", "03", "04", "05"].forEach((index) => {
      expect(html).toContain(`DOSSIER / ${index}`);
    });
  });

  it("limite le diagnostic à trois points d’entrée complémentaires", () => {
    const html = renderToStaticMarkup(<PublicSite />);
    const diagnosticLinks = html.match(/href="\/diagnostic"/g) ?? [];

    expect(diagnosticLinks).toHaveLength(3);
    expect(html).toContain("Faire le diagnostic");
    expect(html).toContain("Voir mes priorités");
    expect(html).toContain("Ouvrir mon diagnostic");
  });

  it("utilise l’identité papier, encre et tampon sans codes SaaS génériques", () => {
    const html = renderToStaticMarkup(<PublicSite />).toLowerCase();

    expect(html).toContain("#f3f4ef");
    expect(html).toContain("#153d30");
    expect(html).toContain("#a34a2c");
    expect(html).toContain("tampon · à décider");
    expect(html).not.toContain("violet");
    expect(html).not.toContain("rounded-");
    expect(html).not.toContain("blur-");
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
    expect(text).toContain("jamais comme du revenu déjà généré");
    expect(text).toContain("résultat inventé");
  });
});
