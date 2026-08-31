import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AutomationsScreen } from "@/components/automations/automations-screen";
import type { AutomationCard } from "@/lib/automations/contracts";

describe("AutomationsScreen", () => {
  it("rend un état vide honnête", () => {
    const html = renderToStaticMarkup(<AutomationsScreen cards={[]} />);
    expect(html).toContain("Aucune automatisation active");
    expect(html).toContain("INDISPONIBLE");
    expect(html).toContain("Aucune action sensible n’est modifiée depuis cet écran");
  });

  it("présente le mode, la santé, l’activité et le contrôle humain", () => {
    const html = renderToStaticMarkup(<AutomationsScreen cards={[card("APPROVAL")]} />);
    expect(html).toContain("Relancer les devis");
    expect(html).toContain("Validation");
    expect(html).toContain("EN BON ÉTAT");
    expect(html).toContain("Action enregistrée avec succès");
    expect(html).toContain("CE QUE SESIRA PEUT FAIRE");
    expect(html).toContain("TOUJOURS DÉCIDÉ PAR VOUS");
    expect(html).toContain("Suspendre l’automatisation");
    expect(html).toContain("disabled");
  });

  it("traduit Shadow sans présenter une action comme envoyée", () => {
    const shadow = card("SHADOW");
    shadow.recentActivity = [];
    const html = renderToStaticMarkup(<AutomationsScreen cards={[shadow]} />);
    expect(html).toContain("Il vous montre");
    expect(html).toContain("Aucun message n’est envoyé");
    expect(html).not.toContain(">SHADOW<");
    expect(html).toContain("Aucune activité réelle enregistrée");
  });

  it("distingue une activité indisponible d’un historique vide", () => {
    const unavailable = card("OBSERVATION");
    unavailable.activityAvailable = false;
    unavailable.recentActivity = [];
    const html = renderToStaticMarkup(<AutomationsScreen cards={[unavailable]} />);
    expect(html).toContain("Activité temporairement indisponible");
    expect(html).toContain("Indisponible");
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
    recentActivity: [{ id: "run-1", label: "Action enregistrée avec succès", date: "24 août 2026, 10:00", tone: "emerald" }],
    activityAvailable: true,
    lastSuccess: "24 août 2026, 10:00",
    lastProblem: null,
    allowedAction: "Repérer les devis à suivre et préparer une relance standard.",
    humanJudgment: "Les réponses clients, baisses de prix demandées et décisions commerciales.",
  };
}
