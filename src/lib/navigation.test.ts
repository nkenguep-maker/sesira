import { describe, expect, it } from "vitest";

import {
  GROWTH_TABS,
  INTERVENTION_TABS,
  QUOTE_TABS,
  SESIRA_ORGANIZATION_NAV,
  SESIRA_PRIMARY_NAV,
  SESIRA_SECONDARY_NAV,
  isAppNavActive,
} from "./navigation";

describe("SESIRA navigation", () => {
  it("keeps the daily rail to seven business entries", () => {
    expect(SESIRA_PRIMARY_NAV.map((item) => item.label)).toEqual([
      "Aujourd’hui",
      "Clients",
      "Devis",
      "Interventions",
      "Factures",
      "Maintenance",
      "Documents",
    ]);
  });

  it("moves settings and non-daily reading outside the main rail", () => {
    expect(SESIRA_SECONDARY_NAV.map((item) => item.label)).toEqual(["Automatisations", "Résultats"]);
    expect(SESIRA_ORGANIZATION_NAV.map((item) => item.label)).toEqual(["Équipe", "Imports", "Connexions", "Paramètres"]);
  });

  it("groups quote and intervention sub-pages under patron vocabulary", () => {
    expect(QUOTE_TABS.map((item) => item.label)).toEqual(["Tous", "Opportunités", "Relances"]);
    expect(INTERVENTION_TABS.map((item) => item.label)).toEqual(["Interventions", "Rapports terrain"]);
    expect(GROWTH_TABS[0]?.label).toBe("Vue d’ensemble");
    expect(isAppNavActive("/app/opportunites/123", SESIRA_PRIMARY_NAV[2])).toBe(true);
    expect(isAppNavActive("/app/rapports", SESIRA_PRIMARY_NAV[3])).toBe(true);
  });
});
