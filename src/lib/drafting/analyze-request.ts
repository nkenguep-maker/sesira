import "server-only";

import {
  type QuoteDraftGap,
  type QuoteDraftSkeleton,
  quoteDraftSkeletonSchema,
} from "@/lib/drafting/schema";

/**
 * C23 — deterministic request analyzer. Given a qualified request +
 * customer, returns a `QuoteDraftSkeleton` with the fields the
 * caller can reliably fill from stable inputs, and a gap list for
 * everything else.
 *
 * NO AI in this function. A future AI-augmented analyzer can wrap
 * this one to enrich the skeleton with a summary or a template,
 * but MUST NOT reduce the gap list by inventing values — the AI's
 * output can only ADD context, never fill a missing amount /
 * technical claim / regulatory field.
 */

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
}

export function analyzeRequestForDraft(input: AnalyzeRequestInput): QuoteDraftSkeleton {
  const gaps: QuoteDraftGap[] = [];

  if (!input.customer.displayName || input.customer.displayName.trim().length === 0) {
    gaps.push({
      field: "customer_display_name",
      reason: "customer has no display name on file",
    });
  }
  if (!input.customer.email || input.customer.email.trim().length === 0) {
    gaps.push({
      field: "recipient_email",
      reason: "customer has no email on file — send cannot proceed without one",
    });
  }
  if (!input.customer.hasConfirmedContact) {
    gaps.push({
      field: "customer_confirmation",
      reason: "customer contact has not been confirmed for this request",
    });
  }
  // Amount is ALWAYS a gap until the operator sets it — no AI
  //   inference is permitted per doctrine.
  gaps.push({
    field: "amount",
    reason: "pricing is a human decision; SESIRA never infers an amount",
  });

  const skeleton: QuoteDraftSkeleton = {
    title: `Devis pour: ${input.request.title.slice(0, 180)}`,
    customerDisplayName: input.customer.displayName ?? null,
    requestSummary: input.request.dataSummary?.slice(0, 2000) ?? null,
    currency: "EUR",
    gaps,
  };
  // Validate through the Zod schema so any refactor that widens
  //   the skeleton beyond spec surfaces here.
  return quoteDraftSkeletonSchema.parse(skeleton);
}
