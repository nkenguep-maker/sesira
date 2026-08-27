import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AutomationsScreen } from "@/components/automations/automations-screen";
import type { AutomationCard } from "@/lib/automations/contracts";

describe("AutomationsScreen", () => {
  it("renders a transparent empty state when no module is enabled", () => {
    const html = renderToStaticMarkup(<AutomationsScreen cards={[]} />);

    expect(html).toContain("Aucune automatisation activée");
    expect(html).toContain("Seuls les modules activés");
    expect(html).toContain("Aucune action ne peut être lancée depuis cet écran");
  });

  it("shows product status, health, activity, permissions and human judgment", () => {
    const html = renderToStaticMarkup(<AutomationsScreen cards={[card("APPROVAL")]} />);

    expect(html).toContain("Relancer les devis");
    expect(html).toContain("Activée");
    expect(html).toContain("Validation par votre équipe");
    expect(html).toContain("Stable");
    expect(html).toContain("Action enregistrée avec succès");
    expect(html).toContain("Dernière réussite");
    expect(html).toContain("Dernier problème");
    expect(html).toContain("CE QUE SESIRA PEUT FAIRE");
    expect(html).toContain("TOUJOURS DÉCIDÉ PAR VOUS");
    expect(html).toContain("xl:grid-cols-[minmax(0,1fr)_380px]");
  });

  it("explains observation in real conditions without presenting the example as a real action", () => {
    const shadow = card("SHADOW");
    shadow.recentActivity = [];
    shadow.lastSuccess = null;
    const html = renderToStaticMarkup(<AutomationsScreen cards={[shadow]} />);

    expect(html).toContain("Sesira aurait effectué cette action.");
    expect(html).toContain("OBSERVATION EN CONDITIONS RÉELLES");
    expect(html).toContain("Action préparée uniquement. Aucun envoi n’a eu lieu.");
    expect(html).not.toContain("SHADOW");
    expect(html).not.toContain("run réel");
    expect(html).toContain("Aucune activité réelle enregistrée");
  });

  it("does not turn unavailable activity into a healthy empty history", () => {
    const unavailable = card("OBSERVATION");
    unavailable.activityAvailable = false;
    unavailable.recentActivity = [];
    unavailable.lastSuccess = null;
    unavailable.lastProblem = null;
    const html = renderToStaticMarkup(<AutomationsScreen cards={[unavailable]} />);

    expect(html).toContain("Activité temporairement indisponible");
    expect(html.match(/Information indisponible/g)).toHaveLength(2);
  });
});

function card(level: AutomationCard["level"]): AutomationCard {
  return {
    id: "automation-1",
    key: "QUOTE_FOLLOW_UP",
    title: "Relancer les devis",
    description: "Suivre les devis qui attendent une réponse.",
    status: "ACTIVE",
    level,
    health: { label: "Stable", tone: "emerald" },
    recentActivity: [
      {
        id: "run-1",
        label: "Action enregistrée avec succès",
        date: "24 août 2026, 10:00",
        tone: "emerald",
      },
    ],
    activityAvailable: true,
    lastSuccess: "24 août 2026, 10:00",
    lastProblem: null,
    allowedAction: "Repérer les devis à suivre et préparer une relance standard.",
    humanJudgment: "Les réponses clients, baisses de prix demandées et décisions commerciales.",
  };
}
