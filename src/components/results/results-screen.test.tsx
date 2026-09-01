import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ResultsScreen } from "@/components/results/results-screen";
import type { ResultsSummary } from "@/lib/results/contracts";
import { buildEstimatedMetrics } from "@/lib/results/summary";

describe("ResultsScreen", () => {
  it("affiche l’état vide approuvé sans KPI de démonstration", () => {
    const html = renderToStaticMarkup(<ResultsScreen summary={summary("EMPTY")} />);

    expect(html).toContain("Pas encore assez de données");
    expect(html).toContain("Ce que Sesira ne saura jamais attribuer");
    expect(html).not.toContain("results-ref-heroes");
  });

  it("renders partial data without converting unavailable values to zero", () => {
    const partial = summary("PARTIAL");
    partial.observed[2] = {
      ...partial.observed[2],
      value: null,
      availability: "UNAVAILABLE",
    };
    partial.estimated = buildEstimatedMetrics(partial.observed);
    const html = renderToStaticMarkup(<ResultsScreen summary={partial} />);

    expect(html).toContain("Certains résultats sont temporairement indisponibles");
    expect(html).toContain("Donnée indisponible");
    expect(html).toContain("Estimé");
  });

  it("renders the estimated-only state and responsive period controls", () => {
    const estimatedOnly = summary("ESTIMATED_ONLY");
    estimatedOnly.observed = estimatedOnly.observed.map((metric) => ({
      ...metric,
      value: null,
      availability: "UNAVAILABLE",
    }));
    const html = renderToStaticMarkup(<ResultsScreen summary={estimatedOnly} />);

    expect(html).toContain("Certains résultats sont temporairement indisponibles");
    expect(html).toContain("period=90d");
    expect(html).toContain("Ce que Sesira ne sait pas attribuer");
  });
});

function summary(state: ResultsSummary["state"]): ResultsSummary {
  const observed: ResultsSummary["observed"] = [
    observedMetric("new_requests", "Nouvelles demandes"),
    observedMetric("quotes_created", "Devis créés"),
    observedMetric("quotes_sent", "Devis envoyés"),
    observedMetric("attention_open", "Éléments à traiter"),
    observedMetric("attention_resolved", "Éléments résolus"),
  ];

  return {
    period: {
      key: "30d",
      label: "30 jours",
      startAt: "2026-07-25T10:00:00.000Z",
      endAt: "2026-08-24T10:00:00.000Z",
    },
    observed,
    estimated: buildEstimatedMetrics(observed),
    hypotheses: ["35 € de coût horaire chargé"],
    state,
  };
}

function observedMetric(
  key: ResultsSummary["observed"][number]["key"],
  label: string,
): ResultsSummary["observed"][number] {
  return {
    key,
    label,
    value: 0,
    availability: "AVAILABLE",
    context: "Pendant la période",
  };
}
