export const COMMERCIAL_OBJECTION_KINDS = [
  "PRICE",
  "TIMING",
  "COMPETITION",
  "BUDGET",
  "TECHNICAL",
  "COMPLAINT",
  "LEGAL",
  "CONTRACTUAL",
  "FINANCIAL",
  "OTHER",
  "UNCERTAIN",
] as const;

export type CommercialObjectionKind = (typeof COMMERCIAL_OBJECTION_KINDS)[number];

export function isCommercialObjectionKind(value: string): value is CommercialObjectionKind {
  return (COMMERCIAL_OBJECTION_KINDS as readonly string[]).includes(value);
}

export function isSensitiveObjectionKind(kind: CommercialObjectionKind): boolean {
  return kind === "PRICE" || kind === "COMPLAINT" || kind === "LEGAL" || kind === "CONTRACTUAL" || kind === "FINANCIAL";
}

export const COMMERCIAL_OBJECTION_LABELS: Record<CommercialObjectionKind, string> = {
  PRICE: "Prix",
  TIMING: "Calendrier",
  COMPETITION: "Concurrence",
  BUDGET: "Budget",
  TECHNICAL: "Technique",
  COMPLAINT: "Réclamation",
  LEGAL: "Juridique",
  CONTRACTUAL: "Contractuel",
  FINANCIAL: "Financier",
  OTHER: "Autre",
  UNCERTAIN: "À confirmer",
};
