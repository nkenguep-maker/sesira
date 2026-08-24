import {
  RESULTS_PERIOD_KEYS,
  type ResultsPeriod,
  type ResultsPeriodKey,
} from "@/lib/results/contracts";

const PERIOD_LABELS: Record<ResultsPeriodKey, string> = {
  "30d": "30 jours",
  "90d": "90 jours",
  "12m": "12 mois",
};

export function parseResultsPeriod(value: string | undefined): ResultsPeriodKey {
  return RESULTS_PERIOD_KEYS.includes(value as ResultsPeriodKey)
    ? (value as ResultsPeriodKey)
    : "30d";
}

export function buildResultsPeriod(key: ResultsPeriodKey, now = new Date()): ResultsPeriod {
  const end = new Date(now);
  const start = new Date(now);

  if (key === "12m") {
    start.setUTCFullYear(start.getUTCFullYear() - 1);
  } else {
    start.setUTCDate(start.getUTCDate() - (key === "90d" ? 90 : 30));
  }

  return {
    key,
    label: PERIOD_LABELS[key],
    startAt: start.toISOString(),
    endAt: end.toISOString(),
  };
}
