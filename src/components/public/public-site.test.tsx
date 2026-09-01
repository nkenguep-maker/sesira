import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PublicSite } from "@/components/public/public-site";

describe("PublicSite", () => {
  it("présente le parcours approuvé sans promettre une action autonome", () => {
    const html = renderToStaticMarkup(<PublicSite />);

    expect(html).toContain("Des devis déjà envoyés");
    expect(html).toContain("Il vous montre");
    expect(html).toContain("Vous validez");
    expect(html).toContain("Il envoie seul");
    expect(html).toContain("Rien n&#x27;est parti");
  });

  it("identifie explicitement les chiffres de démonstration", () => {
    const html = renderToStaticMarkup(<PublicSite />);

    expect(html).toContain("Exemple");
    expect(html).toContain("Un mois, chez une entreprise comme la vôtre");
    expect(html).toContain("Chiffres modifiables");
    expect(html).toContain("on préfère arrondir contre nous");
  });

  it("n’expose aucun contrôle métier actif dans les cartes de démonstration", () => {
    const html = renderToStaticMarkup(<PublicSite />);

    expect(html).toContain("Voir le devis");
    expect(html).toContain("Répondre moi-même");
    expect(html).toContain("Rien n&#x27;est parti");
    expect(html).not.toContain('href="#"');
  });
});
