import type { ValueEstimate } from "@/lib/results/contracts";

export function formatResultsMoney(value: number, currency = "EUR"): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatResultsEstimate(estimate: ValueEstimate): string {
  if (estimate.value === null) {
    return "À établir";
  }

  if (estimate.unit === "CURRENCY") {
    return formatResultsMoney(estimate.value, estimate.currency);
  }

  if (estimate.unit === "RATIO") {
    return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(estimate.value)} €`;
  }

  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(estimate.value)} h`;
}
