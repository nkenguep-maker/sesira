import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PublicSite } from "@/components/public/public-site";

describe("PublicSite", () => {
  it("présente le parcours approuvé sans promettre une action autonome", () => {
    const html = renderToStaticMarkup(<PublicSite />);

    expect(html).toContain("Des devis déjà envoyés");
    expect(html).toContain("Il vous montre");
    expect(html).toContain("Vous validez");
    expect(html).toContain("Automatisation contrôlée");
    expect(html).toContain("RIEN N&#x27;EST PARTI");
  });

  it("identifie explicitement les chiffres de démonstration", () => {
    const html = renderToStaticMarkup(<PublicSite />);

    expect(html).toContain("EXEMPLE");
    expect(html).toContain("Exemple de données");
    expect(html).toContain("EXEMPLE DE SIMULATION");
    expect(html).toContain("Aucune promesse, aucun benchmark");
  });

  it("n’expose aucun contrôle métier actif dans les cartes de démonstration", () => {
    const html = renderToStaticMarkup(<PublicSite />);

    expect(html).toContain("Voir le devis");
    expect(html).toContain("Répondre moi-même");
    expect(html.match(/disabled=""/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(html).not.toContain('href="#"');
  });
});
