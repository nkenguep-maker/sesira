import {
  quoteDraftSkeletonSchema,
  type QuoteDraftGap,
  type QuoteDraftSkeleton,
} from "@/lib/drafting/schema";

export interface AnalyzeRequestInput {
  request: {
    id: string;
    title: string;
    dataSummary?: string | null;
  };
  customer: {
    id: string;
    displayName: string | null;
    email: string | null;
    hasConfirmedContact: boolean;
  };
  currency: string;
}

/**
 * Deterministic first pass for a quote draft.
 * It can surface known context and missing fields, but never invents
 * price, discount, diagnosis, regulatory content or contractual terms.
 */
export function analyzeRequestForDraft(input: AnalyzeRequestInput): QuoteDraftSkeleton {
  const gaps: QuoteDraftGap[] = [];

  if (!input.customer.displayName?.trim()) {
    gaps.push({ field: "customer_display_name", reason: "Le nom du client n’est pas renseigné." });
  }
  if (!input.customer.email?.trim()) {
    gaps.push({ field: "recipient_email", reason: "Aucune adresse email client n’est disponible." });
  }
  if (!input.customer.hasConfirmedContact) {
    gaps.push({ field: "customer_confirmation", reason: "Le contact client n’a pas été confirmé pour cette demande." });
  }

  // Pricing is deliberately never inferred. An operator must resolve it.
  gaps.push({ field: "amount", reason: "Le prix reste une décision humaine. SESIRA ne déduit aucun montant." });

  return quoteDraftSkeletonSchema.parse({
    title: `Devis pour : ${input.request.title.slice(0, 180)}`,
    customerDisplayName: input.customer.displayName?.trim() || null,
    requestSummary: input.request.dataSummary?.slice(0, 2000) ?? null,
    currency: input.currency,
    gaps,
  });
}
