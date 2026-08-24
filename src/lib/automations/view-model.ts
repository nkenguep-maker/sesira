import { AUTOMATION_LEVELS, type AutomationCard, type AutomationConfigRow, type AutomationHealth, type AutomationLevel, type AutomationRunRow, type AutomationRunsByConfig } from "@/lib/automations/contracts";
import { AUTOMATION_CATALOG, findAutomationDefinition } from "@/lib/automations/catalog";

const automationDateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const RUN_PRESENTATION: Record<
  string,
  { label: string; tone: AutomationCard["recentActivity"][number]["tone"] }
> = {
  PENDING: { label: "Préparation en attente", tone: "slate" },
  RUNNING: { label: "Traitement en cours", tone: "cyan" },
  SUCCEEDED: { label: "Action enregistrée avec succès", tone: "emerald" },
  FAILED: { label: "Un problème a été enregistré", tone: "amber" },
  CANCELLED: { label: "Action arrêtée", tone: "slate" },
  WAITING_FOR_APPROVAL: { label: "Validation de votre équipe attendue", tone: "amber" },
};

export const AUTOMATION_LEVEL_LABELS: Record<AutomationLevel, string> = {
  OBSERVATION: "Observation",
  SHADOW: "Observation en conditions réelles",
  APPROVAL: "Validation par votre équipe",
  AUTOMATIC: "Automatique",
};

export function buildAutomationCards(
  configs: AutomationConfigRow[],
  runsByConfig: AutomationRunsByConfig,
): AutomationCard[] {
  const cards = configs.flatMap((config) => {
    if (!config.enabled) return [];

    const definition = findAutomationDefinition(config.template_key);
    if (!definition) return [];

    const runs = runsByConfig[config.id];
    const sortedRuns = runs ? [...runs].sort(sortRunsDescending) : [];
    const level = isAutomationLevel(config.level) ? config.level : "OBSERVATION";
    const lastSuccess = sortedRuns.find((run) => run.status === "SUCCEEDED");
    const lastProblem = sortedRuns.find((run) => run.status === "FAILED");

    return [{
      id: config.id,
      key: definition.key,
      title: definition.title,
      description: definition.description,
      status: "ACTIVE" as const,
      level,
      health: automationHealth(sortedRuns, runs !== null),
      recentActivity: sortedRuns.slice(0, 3).map((run) => ({
        id: run.id,
        ...(RUN_PRESENTATION[run.status] ?? { label: "Activité enregistrée", tone: "slate" as const }),
        date: formatAutomationDate(run.completed_at ?? run.created_at),
      })),
      activityAvailable: runs !== null,
      lastSuccess: lastSuccess
        ? formatAutomationDate(lastSuccess.completed_at ?? lastSuccess.created_at)
        : null,
      lastProblem: lastProblem
        ? formatAutomationDate(lastProblem.completed_at ?? lastProblem.created_at)
        : null,
      allowedAction: allowedActionForLevel(definition.allowedAction, level),
      humanJudgment: definition.humanJudgment,
    }];
  });

  const catalogOrder = new Map(AUTOMATION_CATALOG.map((definition, index) => [definition.key, index]));
  return cards.sort((left, right) =>
    (catalogOrder.get(left.key) ?? Number.MAX_SAFE_INTEGER)
      - (catalogOrder.get(right.key) ?? Number.MAX_SAFE_INTEGER));
}

export function formatAutomationDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date inconnue" : automationDateFormatter.format(date);
}

function automationHealth(runs: AutomationRunRow[], available: boolean): AutomationHealth {
  if (!available) return { label: "Indisponible", tone: "slate" };
  const latest = runs[0];
  if (!latest) return { label: "Sans activité", tone: "slate" };
  if (latest.status === "FAILED") return { label: "À vérifier", tone: "amber" };
  if (["PENDING", "RUNNING", "WAITING_FOR_APPROVAL"].includes(latest.status)) {
    return { label: "En cours", tone: "cyan" };
  }
  if (latest.status === "SUCCEEDED") return { label: "Stable", tone: "emerald" };
  return { label: "Arrêtée", tone: "slate" };
}

function isAutomationLevel(value: string): value is AutomationLevel {
  return AUTOMATION_LEVELS.includes(value as AutomationLevel);
}

function allowedActionForLevel(action: string, level: AutomationLevel): string {
  if (level === "OBSERVATION") {
    return "Observer les signaux disponibles. Aucune action n’est préparée ou exécutée.";
  }

  const normalizedAction = action.replace(/\.$/, "");
  if (level === "SHADOW") return `${normalizedAction} en simulation, sans action externe.`;
  if (level === "APPROVAL") return `${normalizedAction}, puis attendre la validation de votre équipe.`;
  return `${normalizedAction} dans les limites explicitement autorisées.`;
}

function sortRunsDescending(left: AutomationRunRow, right: AutomationRunRow): number {
  return Date.parse(right.created_at) - Date.parse(left.created_at);
}
