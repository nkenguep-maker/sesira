export const RESULTS_PERIOD_KEYS = ["30d", "90d", "12m"] as const;

export type ResultsPeriodKey = (typeof RESULTS_PERIOD_KEYS)[number];

export type ResultsPeriod = {
  key: ResultsPeriodKey;
  label: string;
  startAt: string;
  endAt: string;
};

export type ObservedMetricKey =
  | "new_requests"
  | "quotes_created"
  | "quotes_sent"
  | "attention_open"
  | "attention_resolved";

export type ObservedMetric = {
  key: ObservedMetricKey;
  label: string;
  value: number | null;
  availability: "AVAILABLE" | "UNAVAILABLE";
  context: string;
};

export type ValueEstimate = {
  value: number | null;
  unit: "HOURS" | "CURRENCY" | "RATIO";
  currency?: string;
};

export type EstimatedMetricKey =
  | "recovered_time"
  | "recovered_time_value"
  | "potential_gain"
  | "total_potential"
  | "return_per_euro";

export type EstimatedMetric = {
  key: EstimatedMetricKey;
  label: string;
  estimate: ValueEstimate;
  context: string;
};

export type ResultsState = "READY" | "EMPTY" | "PARTIAL" | "ESTIMATED_ONLY";

export type ResultsSummary = {
  period: ResultsPeriod;
  observed: ObservedMetric[];
  estimated: EstimatedMetric[];
  hypotheses: string[];
  state: ResultsState;
};

export type ResultsRepositoryInput = {
  organizationId: string;
  period: ResultsPeriod;
};

export interface ResultsRepository {
  getSummary(input: ResultsRepositoryInput): Promise<ResultsSummary>;
}
