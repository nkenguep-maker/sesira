/**
 * SESIRA Shadow Mode — deterministic proposal builder.
 *
 * Given a quote, an owning automation config and a follow-up step, this
 * module computes the action Shadow would have taken. The output is a
 * PROPOSAL — a description of what would be sent — never an actual
 * external effect. This file must never import a provider adapter or
 * anything that could trigger network I/O. Its purity is a load-bearing
 * invariant for `no-send.test.ts`.
 *
 * The template is intentionally minimal for C5 (Shadow). Richer content
 * (AI-generated drafts, per-org tone) belongs to C11+ and lives behind
 * the Approval workflow. A change to the template MUST NOT alter the
 * decision itself — only its rendering.
 */
import { z } from "zod";

import type { QuoteFollowupStep } from "@/lib/followups/schedule";

export const PROPOSED_CHANNELS = ["email"] as const;

export type ProposedChannel = (typeof PROPOSED_CHANNELS)[number];

export interface QuoteProposalInputs {
  quoteId: string;
  quoteReference: string | null;
  quoteTitle: string;
  quoteAmount: number | null;
  quoteCurrency: string;
  customerDisplayName: string;
  customerEmail: string | null;
  step: QuoteFollowupStep;
  templateKey: string;
}

export interface ProposedQuoteFollowupAction {
  channel: ProposedChannel;
  recipient_email: string;
  subject: string;
  body: string;
  quote_id: string;
  step: number;
  scheduled_for_iso: string;
  template_key: string;
}

const AMOUNT_FORMATTER = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function renderAmount(amount: number | null, currency: string): string {
  if (amount === null) return "";
  const cleanCurrency = currency.trim() || "EUR";
  return `${AMOUNT_FORMATTER.format(amount)} ${cleanCurrency}`;
}

function renderQuoteLabel(
  reference: string | null,
  title: string,
  amount: number | null,
  currency: string,
): string {
  const parts: string[] = [];
  if (reference && reference.trim().length > 0) parts.push(reference.trim());
  if (title.trim().length > 0) parts.push(title.trim());
  const label = parts.join(" — ");
  const amountRendered = renderAmount(amount, currency);
  return amountRendered.length > 0 ? `${label} (${amountRendered})` : label;
}

function renderSubject(inputs: QuoteProposalInputs): string {
  const stepDays = inputs.step.step; // step number, not day count
  const referenceLabel = inputs.quoteReference?.trim() || inputs.quoteTitle.trim();
  return `Relance ${referenceLabel} — étape ${stepDays}`;
}

function renderBody(inputs: QuoteProposalInputs): string {
  const quoteLabel = renderQuoteLabel(
    inputs.quoteReference,
    inputs.quoteTitle,
    inputs.quoteAmount,
    inputs.quoteCurrency,
  );
  return [
    `Bonjour ${inputs.customerDisplayName},`,
    "",
    `Nous revenons vers vous concernant le devis ${quoteLabel}.`,
    "",
    "Cette relance a été proposée automatiquement par SESIRA en mode observation ; aucun envoi n'a été effectué.",
    "",
    "Cordialement,",
  ].join("\n");
}

/**
 * `ProposedQuoteFollowupAction` runtime shape. Used by `execute.ts` when
 * reading `output_summary` back from a completed run — the database is
 * schemaless jsonb, so we validate on read.
 */
export const proposedQuoteFollowupActionSchema = z.object({
  channel: z.enum(PROPOSED_CHANNELS),
  recipient_email: z.email(),
  subject: z.string().min(1).max(400),
  body: z.string().min(1),
  quote_id: z.uuid(),
  step: z.number().int().min(1),
  scheduled_for_iso: z.iso.datetime({ offset: true }),
  template_key: z.string().min(1),
});

/**
 * Build the concrete action Shadow would have taken. Pure, deterministic,
 * total when inputs pass validation. Throws when the customer lacks an
 * email — that is a Shadow-visible *failure to propose*, not a stop
 * condition, and the executor persists it as such.
 */
export function proposeQuoteFollowupAction(
  inputs: QuoteProposalInputs,
): ProposedQuoteFollowupAction {
  if (!inputs.customerEmail || inputs.customerEmail.trim().length === 0) {
    throw new Error("customer has no email — cannot compose an email proposal");
  }
  const subject = renderSubject(inputs);
  const body = renderBody(inputs);
  return {
    channel: "email",
    recipient_email: inputs.customerEmail.trim(),
    subject,
    body,
    quote_id: inputs.quoteId,
    step: inputs.step.step,
    scheduled_for_iso: inputs.step.scheduledFor.toISOString(),
    template_key: inputs.templateKey,
  };
}
