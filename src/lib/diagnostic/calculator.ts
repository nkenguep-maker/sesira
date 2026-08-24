import type {
  DiagnosticInput,
  DiagnosticPriority,
  DiagnosticResult,
  DiagnosticScenario,
  DiagnosticScenarioKey,
} from "@/lib/diagnostic/contracts";
import { diagnosticInputSchema } from "@/lib/diagnostic/schema";

export const DIAGNOSTIC_CALCULATION_VERSION = "1.0.0";

const WEEKS_PER_MONTH = 52 / 12;

const SCENARIO_RULES: Array<{
  key: DiagnosticScenarioKey;
  label: string;
  timeShare: number;
  marginShare: number;
}> = [
  { key: "PRUDENT", label: "Prudent", timeShare: 0.15, marginShare: 0.01 },
  { key: "PROBABLE", label: "Probable", timeShare: 0.3, marginShare: 0.03 },
  { key: "HIGH_POTENTIAL", label: "Potentiel élevé", timeShare: 0.45, marginShare: 0.05 },
];

export function calculateDiagnostic(rawInput: DiagnosticInput): DiagnosticResult {
  const input = diagnosticInputSchema.parse(rawInput);
  const monthlyAdminHours = input.weeklyAdminHours * WEEKS_PER_MONTH;
  const monthlyQuotedValue = input.monthlyQuotes * input.averageQuoteAmount;
  const monthlyQuotedMarginPool = monthlyQuotedValue * (input.approximateMarginPercent / 100);

  return {
    calculationVersion: DIAGNOSTIC_CALCULATION_VERSION,
    monthlyAdminHours: roundToOneDecimal(monthlyAdminHours),
    monthlyQuotedValue: roundToEuro(monthlyQuotedValue),
    monthlyQuotedMarginPool: roundToEuro(monthlyQuotedMarginPool),
    priorities: derivePriorities(input),
    scenarios: SCENARIO_RULES.map((rule) => buildScenario(rule, monthlyAdminHours, monthlyQuotedMarginPool)),
    assumptions: [
      "Tous les volumes, montants et pourcentages proviennent uniquement de vos réponses.",
      "Le temps mensuel est calculé sur 52 semaines réparties sur 12 mois.",
      "Les scénarios supposent que 15 %, 30 % ou 45 % du temps administratif peut être réalloué.",
      "Le potentiel de marge illustre 1 %, 3 % ou 5 % de la marge associée aux devis saisis. Ce n’est ni une prévision ni un revenu généré.",
      "Aucun coût horaire, taux de conversion ou benchmark sectoriel n’est ajouté.",
    ],
  };
}

function buildScenario(
  rule: (typeof SCENARIO_RULES)[number],
  monthlyAdminHours: number,
  monthlyQuotedMarginPool: number,
): DiagnosticScenario {
  return {
    key: rule.key,
    label: rule.label,
    recoveredHoursPerMonth: roundToOneDecimal(monthlyAdminHours * rule.timeShare),
    marginPotentialPerMonth: roundToEuro(monthlyQuotedMarginPool * rule.marginShare),
    timeSharePercent: rule.timeShare * 100,
    marginSharePercent: rule.marginShare * 100,
  };
}

function derivePriorities(input: DiagnosticInput): DiagnosticPriority[] {
  const requestGap = Math.max(input.monthlyRequests - input.monthlyQuotes, 0);
  const candidates: Array<DiagnosticPriority & { order: number; active: boolean }> = [
    {
      key: "REQUESTS",
      order: 1,
      active: input.monthlyRequests > 0,
      title: "Clarifier le passage de la demande au devis",
      explanation: "Rendre chaque nouvelle demande visible, qualifiée et orientée vers une prochaine étape claire.",
      evidence: requestGap > 0
        ? `${formatInteger(requestGap)} demande${requestGap > 1 ? "s" : ""} de plus que de devis chaque mois dans vos réponses.`
        : `${formatInteger(input.monthlyRequests)} demande${input.monthlyRequests > 1 ? "s" : ""} et ${formatInteger(input.monthlyQuotes)} devis déclarés par mois.`,
    },
    {
      key: "QUOTES",
      order: 2,
      active: input.monthlyQuotes > 0,
      title: "Fiabiliser le suivi des devis",
      explanation: "Donner à l’équipe une vue simple des devis envoyés, des réponses et des décisions attendues.",
      evidence: `${formatInteger(input.monthlyQuotes)} devis par mois, soit ${formatEuro(input.monthlyQuotes * input.averageQuoteAmount)} de valeur mensuelle déclarée.`,
    },
    {
      key: "ADMIN",
      order: 3,
      active: input.weeklyAdminHours > 0,
      title: "Réallouer le temps administratif",
      explanation: "Repérer les tâches répétitives avant de décider lesquelles standardiser ou automatiser.",
      evidence: `${formatNumber(input.weeklyAdminHours)} h administratives déclarées par semaine.`,
    },
    {
      key: "FIELD_COORDINATION",
      order: 4,
      active: input.technicians > 0,
      title: "Mieux relier le terrain et le bureau",
      explanation: "Centraliser les informations utiles pour limiter les reprises et les recherches entre équipes.",
      evidence: `${formatInteger(input.technicians)} technicien${input.technicians > 1 ? "s" : ""} pour ${formatInteger(input.employees)} salarié${input.employees > 1 ? "s" : ""}.`,
    },
  ];

  const active = candidates.filter((candidate) => candidate.active).sort((a, b) => a.order - b.order);
  const fallback = candidates.filter((candidate) => !candidate.active).sort((a, b) => a.order - b.order);

  return [...active, ...fallback].slice(0, 3).map((candidate) => ({
    key: candidate.key,
    title: candidate.title,
    explanation: candidate.explanation,
    evidence: candidate.evidence,
  }));
}

function roundToOneDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

function roundToEuro(value: number) {
  return Math.round(value);
}

function formatInteger(value: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(value);
}

function formatEuro(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}
