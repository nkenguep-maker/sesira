import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { DiagnosticResults } from "@/components/diagnostic/diagnostic-results";
import { calculateDiagnostic } from "@/lib/diagnostic/calculator";
import type { DiagnosticInput } from "@/lib/diagnostic/contracts";

const input: DiagnosticInput = {
  sector: "CVC",
  employees: 12,
  technicians: 8,
  monthlyRequests: 40,
  monthlyQuotes: 24,
  averageQuoteAmount: 18_450,
  approximateMarginPercent: 30,
  weeklyAdminHours: 20,
};

describe("DiagnosticResults", () => {
  it("shows priorities and three explicitly qualified scenarios", () => {
    const html = renderToStaticMarkup(
      <DiagnosticResults input={input} result={calculateDiagnostic(input)} onEdit={vi.fn()} />,
    );

    expect(html).toContain("TOP 3");
    expect(html).toContain("Prudent");
    expect(html).toContain("Probable");
    expect(html).toContain("Potentiel élevé");
    expect(html).toContain("ni du chiffre d’affaires acquis ni un gain attribué à Sesira");
    expect(html).toContain("Aucun coût horaire, taux de conversion ou benchmark sectoriel");
  });

  it("places results before the contact form and never pretends to persist a lead", () => {
    const html = renderToStaticMarkup(
      <DiagnosticResults input={input} result={calculateDiagnostic(input)} onEdit={vi.fn()} />,
    );

    expect(html.indexOf("VOS RÉSULTATS")).toBeLessThan(html.indexOf("ALLER PLUS LOIN"));
    expect(html).toContain("Prénom");
    expect(html).toContain("Email professionnel");
    expect(html).toContain("Code postal");
    expect(html).toContain("Aucune donnée de ce formulaire n’est envoyée ou enregistrée");
    expect(html).toContain("disabled");
  });
});
