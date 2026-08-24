import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  ControlAiRunsScreen,
  ControlIncidentsScreen,
  ControlIntegrationsScreen,
  ControlOrganizationsScreen,
  ControlOverviewScreen,
  ControlRunsScreen,
} from "@/components/control-center/control-center-screens";

const generatedAt = "2026-08-24T12:00:00.000Z";

describe("Control Center screens", () => {
  it("renders the overview metrics with costs and success rate", () => {
    const html = renderToStaticMarkup(<ControlOverviewScreen result={{
      status: "available",
      generatedAt,
      data: {
        organizationCount: 12,
        automationHealth: "DEGRADED",
        automationSuccessRate: 0.986,
        openIncidentCount: 2,
        aiCost: { amount: 42.5, currency: "EUR" },
        infrastructureCost: { amount: 310, currency: "EUR" },
        periodLabel: "30 derniers jours",
      },
    }} />);

    expect(html).toContain("Organisations");
    expect(html).toContain("98,6 %");
    expect(html).toContain("42,50 €");
    expect(html).toContain("310,00 €");
  });

  it("renders organizations, runs, AI runs, incidents and redacted integration health", () => {
    const html = [
      renderToStaticMarkup(<ControlOrganizationsScreen result={{
        status: "available", generatedAt, data: [{
          id: "org-1", name: "Clima Rhône", sector: "CVC", modules: ["Devis", "Demandes"],
          health: "HEALTHY", integrationSummary: "2 saines", openIncidentCount: 0,
        }],
      }} />),
      renderToStaticMarkup(<ControlRunsScreen result={{
        status: "available", generatedAt, data: [{
          id: "run-1", organizationName: "Clima Rhône", automationName: "Relance devis",
          status: "SUCCEEDED", startedAt: generatedAt, durationMs: 1_450,
        }],
      }} />),
      renderToStaticMarkup(<ControlAiRunsScreen result={{
        status: "available", generatedAt, data: [{
          id: "ai-1", organizationName: "Clima Rhône", feature: "Classement interne",
          model: "modèle-1", confidence: 0.91, latencyMs: 840,
          cost: { amount: 0.04, currency: "EUR" }, status: "SUCCEEDED", createdAt: generatedAt,
        }],
      }} />),
      renderToStaticMarkup(<ControlIncidentsScreen result={{
        status: "available", generatedAt, data: [{
          id: "incident-1", organizationName: "Clima Rhône", severity: "HIGH",
          category: "Synchronisation", status: "INVESTIGATING", title: "Connexion interrompue",
          createdAt: generatedAt, updatedAt: generatedAt, resolvedAt: null,
        }],
      }} />),
      renderToStaticMarkup(<ControlIntegrationsScreen result={{
        status: "available", generatedAt, data: [{
          id: "integration-1", organizationName: "Clima Rhône", provider: "Microsoft 365",
          health: "DEGRADED", lastSyncAt: generatedAt, expiresAt: null,
          clientSafeProblem: "Autorisation à renouveler",
        }],
      }} />),
    ].join("\n");

    for (const value of [
      "Clima Rhône",
      "Relance devis",
      "Classement interne",
      "Connexion interrompue",
      "Microsoft 365",
      "Autorisation à renouveler",
    ]) {
      expect(html).toContain(value);
    }
    expect(html).toContain("md:hidden");
    expect(html).not.toContain("credentials_reference");
    expect(html).not.toContain("service_role");
    expect(html).not.toContain("input_summary");
    expect(html).not.toContain("output");
  });

  it("distinguishes unavailable data from a real empty result", () => {
    const unavailable = renderToStaticMarkup(<ControlOrganizationsScreen result={{
      status: "unavailable",
      reason: "CORE_DATA_NOT_CONFIGURED",
    }} />);
    const empty = renderToStaticMarkup(<ControlOrganizationsScreen result={{
      status: "available",
      generatedAt,
      data: [],
    }} />);

    expect(unavailable).toContain("Données internes indisponibles");
    expect(unavailable).toContain("Aucune donnée locataire n’est interrogée");
    expect(empty).toContain("Aucun élément");
    expect(empty).not.toContain("Données internes indisponibles");
  });
});
