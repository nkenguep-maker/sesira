import { describe, expect, it } from "vitest";

import type { AutomationConfigRow, AutomationRunRow } from "@/lib/automations/contracts";
import { AUTOMATION_LEVEL_LABELS, buildAutomationCards, formatAutomationDate } from "@/lib/automations/view-model";

describe("automation product view model", () => {
  it("maps the four internal levels to simple client labels", () => {
    expect(AUTOMATION_LEVEL_LABELS).toEqual({
      OBSERVATION: "Observation",
      SHADOW: "Il vous montre",
      APPROVAL: "Validation",
      AUTOMATIC: "Automatisation contrôlée",
    });
  });

  it("shows only enabled supported modules in product order", () => {
    const configs = [
      config("invoice_follow_up", "AUTOMATIC"),
      config("email_triage", "OBSERVATION", false),
      config("unknown_workflow", "OBSERVATION"),
      config("quote_follow_up", "SHADOW"),
      config("request_intake", "APPROVAL"),
      config("report_creation", "OBSERVATION"),
    ];
    const cards = buildAutomationCards(configs, Object.fromEntries(configs.map((item) => [item.id, []])));

    expect(cards.map((card) => card.title)).toEqual([
      "Relancer les devis",
      "Traiter les nouvelles demandes",
      "Créer les rapports",
      "Relancer les factures",
    ]);
    expect(cards.every((card) => card.status === "ACTIVE")).toBe(true);
    expect(cards.find((card) => card.level === "OBSERVATION")?.allowedAction).toContain(
      "Aucune action n’est préparée ou exécutée",
    );
    expect(cards.find((card) => card.level === "SHADOW")?.allowedAction).toContain(
      "en simulation, sans action externe",
    );
  });

  it("derives health, recent activity, last success and last problem from real runs", () => {
    const automation = config("quote_follow_up", "SHADOW");
    const runs: AutomationRunRow[] = [
      run("failed", "FAILED", "2026-08-24T11:00:00.000Z", automation.id),
      run("success", "SUCCEEDED", "2026-08-24T10:00:00.000Z", automation.id),
      run("pending", "PENDING", "2026-08-24T09:00:00.000Z", automation.id),
      run("older", "SUCCEEDED", "2026-08-23T09:00:00.000Z", automation.id),
    ];
    const [card] = buildAutomationCards([automation], { [automation.id]: runs });

    expect(card.health).toEqual({ label: "À vérifier", tone: "amber" });
    expect(card.recentActivity).toHaveLength(3);
    expect(card.recentActivity[0].label).toBe("Un problème a été enregistré");
    expect(card.lastSuccess).toBe(formatAutomationDate("2026-08-24T10:00:00.000Z"));
    expect(card.lastProblem).toBe(formatAutomationDate("2026-08-24T11:00:00.000Z"));
  });

  it("keeps missing activity unavailable instead of fabricating a run", () => {
    const automation = config("email_triage", "OBSERVATION");
    const [card] = buildAutomationCards([automation], { [automation.id]: null });

    expect(card.activityAvailable).toBe(false);
    expect(card.recentActivity).toEqual([]);
    expect(card.lastSuccess).toBeNull();
    expect(card.lastProblem).toBeNull();
    expect(card.health.label).toBe("Indisponible");
  });
});

function config(templateKey: string, level: string, enabled = true): AutomationConfigRow {
  return {
    id: `config-${templateKey}`,
    template_key: templateKey,
    enabled,
    level,
    updated_at: "2026-08-24T10:00:00.000Z",
  };
}

function run(id: string, status: string, createdAt: string, automationConfigId: string): AutomationRunRow {
  return {
    id,
    automation_config_id: automationConfigId,
    status,
    created_at: createdAt,
    completed_at: createdAt,
  };
}
