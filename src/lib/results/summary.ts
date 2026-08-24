import type {
  EstimatedMetric,
  ObservedMetric,
  ResultsState,
} from "@/lib/results/contracts";

export const RESULTS_HYPOTHESES = [
  "6 minutes par nouvelle demande structurée",
  "4 minutes par devis créé",
  "3 minutes par envoi de devis enregistré",
  "8 minutes par élément résolu",
  "35 € de coût horaire chargé",
] as const;

const MINUTES_BY_METRIC = {
  new_requests: 6,
  quotes_created: 4,
  quotes_sent: 3,
  attention_resolved: 8,
} as const;

export function buildEstimatedMetrics(observed: ObservedMetric[]): EstimatedMetric[] {
  const sourceMetrics = Object.entries(MINUTES_BY_METRIC).map(([key, minutes]) => ({
    metric: observed.find((item) => item.key === key),
    minutes,
  }));
  const hasCompleteInputs = sourceMetrics.every(({ metric }) => metric?.value !== null && metric !== undefined);
  const recoveredHours = hasCompleteInputs
    ? sourceMetrics.reduce((total, { metric, minutes }) => total + (metric?.value ?? 0) * minutes, 0) / 60
    : null;
  const recoveredTimeValue = recoveredHours === null ? null : recoveredHours * 35;

  return [
    {
      key: "recovered_time",
      label: "Temps estimé récupéré",
      estimate: { value: recoveredHours, unit: "HOURS" },
      context: "Projection selon l’activité observée et les hypothèses ci-dessous.",
    },
    {
      key: "recovered_time_value",
      label: "Valeur estimée du temps récupéré",
      estimate: { value: recoveredTimeValue, unit: "CURRENCY", currency: "EUR" },
      context: "Temps estimé multiplié par le coût horaire retenu.",
    },
    {
      key: "potential_gain",
      label: "Gain potentiel estimé",
      estimate: { value: null, unit: "CURRENCY", currency: "EUR" },
      context: "En attente des résultats de suivi et de l’attribution Core.",
    },
    {
      key: "total_potential",
      label: "Potentiel total estimé",
      estimate: { value: recoveredTimeValue, unit: "CURRENCY", currency: "EUR" },
      context: "Composante temps uniquement ; le potentiel commercial n’est pas inclus.",
    },
    {
      key: "return_per_euro",
      label: "Pour 1 € investi",
      estimate: { value: null, unit: "RATIO" },
      context: "En attente du coût d’investissement et d’une attribution validée.",
    },
  ];
}

export function deriveResultsState(
  observed: ObservedMetric[],
  estimated: EstimatedMetric[],
): ResultsState {
  const availableObserved = observed.filter((metric) => metric.availability === "AVAILABLE");
  const hasEstimate = estimated.some((metric) => metric.estimate.value !== null);

  if (availableObserved.length === 0 && hasEstimate) {
    return "ESTIMATED_ONLY";
  }

  if (availableObserved.length < observed.length) {
    return "PARTIAL";
  }

  if (availableObserved.every((metric) => metric.value === 0)) {
    return "EMPTY";
  }

  return "READY";
}
