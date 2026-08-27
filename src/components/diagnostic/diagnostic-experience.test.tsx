import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DiagnosticExperience } from "@/components/diagnostic/diagnostic-experience";

describe("DiagnosticExperience", () => {
  it("starts with the four-step progress and supported sectors", () => {
    const html = renderToStaticMarkup(<DiagnosticExperience />);

    for (const step of ["Votre activité", "Votre entreprise", "Votre fonctionnement", "Vos résultats"]) {
      expect(html).toContain(step);
    }
    for (const sector of ["Chauffage / Climatisation", "Solaire / Photovoltaïque", "Maintenance / Services techniques", "Construction / Rénovation"]) {
      expect(html).toContain(sector);
    }
    expect(html).toContain("Aucun calcul opaque");
    expect(html).not.toContain("Email professionnel");
  });
});
