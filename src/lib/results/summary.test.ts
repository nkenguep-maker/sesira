import { describe, expect, it } from "vitest";

import type { ObservedMetric } from "@/lib/results/contracts";
import { buildEstimatedMetrics, deriveResultsState } from "@/lib/results/summary";

const observed: ObservedMetric[] = [
  metric("new_requests", 5),
  metric("quotes_created", 3),
  metric("quotes_sent", 2),
  metric("attention_open", 1),
  metric("attention_resolved", 4),
];

describe("results summary", () => {
  it("uses observed values without treating potential gain as revenue", () => {
    const estimated = buildEstimatedMetrics(observed);

    expect(estimated.find((item) => item.key === "recovered_time")?.estimate.value).toBeCloseTo(
      80 / 60,
    );
    expect(estimated.find((item) => item.key === "recovered_time_value")?.estimate.value).toBeCloseTo(
      (80 / 60) * 35,
    );
    expect(estimated.find((item) => item.key === "potential_gain")?.estimate.value).toBeNull();
    expect(estimated.find((item) => item.key === "return_per_euro")?.estimate.value).toBeNull();
  });

  it("preserves partial values as unavailable instead of zero", () => {
    const partial = observed.map((item) =>
      item.key === "quotes_sent"
        ? { ...item, value: null, availability: "UNAVAILABLE" as const }
        : item,
    );
    const estimated = buildEstimatedMetrics(partial);

    expect(deriveResultsState(partial, estimated)).toBe("PARTIAL");
    expect(estimated.find((item) => item.key === "recovered_time")?.estimate.value).toBeNull();
  });

  it("distinguishes zero, ready and estimated-only states", () => {
    const zeroObserved = observed.map((item) => ({ ...item, value: 0 }));
    const noObserved = observed.map((item) => ({
      ...item,
      value: null,
      availability: "UNAVAILABLE" as const,
    }));
    const estimatedOnly = buildEstimatedMetrics(observed);

    expect(deriveResultsState(zeroObserved, buildEstimatedMetrics(zeroObserved))).toBe("EMPTY");
    expect(deriveResultsState(observed, buildEstimatedMetrics(observed))).toBe("READY");
    expect(deriveResultsState(noObserved, estimatedOnly)).toBe("ESTIMATED_ONLY");
  });
});

function metric(key: ObservedMetric["key"], value: number): ObservedMetric {
  return {
    key,
    label: key,
    value,
    availability: "AVAILABLE",
    context: "test",
  };
}
