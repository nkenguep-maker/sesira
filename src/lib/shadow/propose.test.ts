import { describe, expect, it } from "vitest";

import type { QuoteFollowupStep } from "@/lib/followups/schedule";

import { proposeQuoteFollowupAction, proposedQuoteFollowupActionSchema } from "./propose";

const QUOTE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function baseInputs(): Parameters<typeof proposeQuoteFollowupAction>[0] {
  const step: QuoteFollowupStep = {
    step: 1,
    scheduledFor: new Date("2026-09-05T09:00:00.000Z"),
  };
  return {
    quoteId: QUOTE_ID,
    quoteReference: "DEV-2026-042",
    quoteTitle: "Fenêtres double vitrage",
    quoteAmount: 18_450,
    quoteCurrency: "EUR",
    customerDisplayName: "Mme Dupont",
    customerEmail: "dupont@example.com",
    step,
    templateKey: "quote_followup_schedule",
  };
}

describe("proposeQuoteFollowupAction", () => {
  it("returns a schema-valid proposal for valid inputs", () => {
    const proposal = proposeQuoteFollowupAction(baseInputs());
    expect(proposedQuoteFollowupActionSchema.parse(proposal)).toEqual(proposal);
  });

  it("is deterministic for identical inputs", () => {
    const a = proposeQuoteFollowupAction(baseInputs());
    const b = proposeQuoteFollowupAction(baseInputs());
    expect(a).toEqual(b);
  });

  it("embeds the customer name and the quote reference in the body", () => {
    const proposal = proposeQuoteFollowupAction(baseInputs());
    expect(proposal.body).toContain("Mme Dupont");
    expect(proposal.body).toContain("DEV-2026-042");
  });

  it("mentions the amount when present", () => {
    const proposal = proposeQuoteFollowupAction(baseInputs());
    expect(proposal.body).toMatch(/18\s?450\s*EUR/);
  });

  it("falls back to the title when reference is null or empty", () => {
    const inputs = baseInputs();
    inputs.quoteReference = null;
    const proposal = proposeQuoteFollowupAction(inputs);
    expect(proposal.subject).toContain("Fenêtres double vitrage");
  });

  it("uses the step number in the subject", () => {
    const inputs = baseInputs();
    inputs.step = { step: 3, scheduledFor: new Date("2026-09-19T09:00:00.000Z") };
    const proposal = proposeQuoteFollowupAction(inputs);
    expect(proposal.subject).toMatch(/étape\s+3/);
  });

  it("omits the amount section entirely when amount is null", () => {
    const inputs = baseInputs();
    inputs.quoteAmount = null;
    const proposal = proposeQuoteFollowupAction(inputs);
    expect(proposal.body).not.toMatch(/\(\s*EUR\s*\)/);
  });

  it("throws when customer email is missing", () => {
    const inputs = baseInputs();
    inputs.customerEmail = null;
    expect(() => proposeQuoteFollowupAction(inputs)).toThrow(/no email/);
  });

  it("throws when customer email is whitespace", () => {
    const inputs = baseInputs();
    inputs.customerEmail = "   ";
    expect(() => proposeQuoteFollowupAction(inputs)).toThrow(/no email/);
  });

  it("trims the recipient email", () => {
    const inputs = baseInputs();
    inputs.customerEmail = "  dupont@example.com  ";
    const proposal = proposeQuoteFollowupAction(inputs);
    expect(proposal.recipient_email).toBe("dupont@example.com");
  });

  it("persists scheduled_for as an ISO string", () => {
    const proposal = proposeQuoteFollowupAction(baseInputs());
    expect(proposal.scheduled_for_iso).toBe("2026-09-05T09:00:00.000Z");
  });
});
