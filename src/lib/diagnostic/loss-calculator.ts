export const LOSS_DIAGNOSTIC_VERSION = "2.0.0";

export type FollowUpHabit = 0.1 | 0.4 | 0.6 | 1;

export type LossDiagnosticInput = {
  monthlyQuotes: number;
  averageQuoteAmount: number;
  followUpHabit: FollowUpHabit;
  unscheduledJobs: number;
  overdueInvoices: number;
};

export type LossAssumptions = {
  unansweredAfterSevenDaysShare: number;
  additionalFollowUpConversionShare: number;
  unscheduledCancellationShare: number;
};

export type LossDiagnosticResult = {
  annualQuotedVolume: number;
  unansweredQuotesPerMonth: number;
  neverFollowedUpPerMonth: number;
  annualQuoteLoss: number;
  annualQuoteLossLow: number;
  annualQuoteLossHigh: number;
  annualQuoteLossShare: number;
  signedValueWaitingForDate: number;
  unscheduledRisk: number;
  overdueInvoices: number;
};

export const DEFAULT_LOSS_ASSUMPTIONS: LossAssumptions = {
  unansweredAfterSevenDaysShare: 0.4,
  additionalFollowUpConversionShare: 0.1,
  unscheduledCancellationShare: 0.1,
};

export function calculateLossDiagnostic(
  input: LossDiagnosticInput,
  assumptions: LossAssumptions = DEFAULT_LOSS_ASSUMPTIONS,
): LossDiagnosticResult {
  assertPercent("unansweredAfterSevenDaysShare", assumptions.unansweredAfterSevenDaysShare);
  assertPercent("additionalFollowUpConversionShare", assumptions.additionalFollowUpConversionShare);
  assertPercent("unscheduledCancellationShare", assumptions.unscheduledCancellationShare);
  assertNonNegative("monthlyQuotes", input.monthlyQuotes);
  assertNonNegative("averageQuoteAmount", input.averageQuoteAmount);
  assertNonNegative("unscheduledJobs", input.unscheduledJobs);
  assertNonNegative("overdueInvoices", input.overdueInvoices);

  const annualQuotedVolume = input.monthlyQuotes * input.averageQuoteAmount * 12;
  const unansweredQuotesPerMonth = input.monthlyQuotes * assumptions.unansweredAfterSevenDaysShare;
  const neverFollowedUpPerMonth = unansweredQuotesPerMonth * input.followUpHabit;
  const annualQuoteLoss = neverFollowedUpPerMonth * assumptions.additionalFollowUpConversionShare * input.averageQuoteAmount * 12;
  const annualQuoteLossLow = neverFollowedUpPerMonth * 0.05 * input.averageQuoteAmount * 12;
  const annualQuoteLossHigh = neverFollowedUpPerMonth * 0.15 * input.averageQuoteAmount * 12;
  const annualQuoteLossShare = annualQuotedVolume > 0 ? annualQuoteLoss / annualQuotedVolume : 0;
  const signedValueWaitingForDate = input.unscheduledJobs * input.averageQuoteAmount;
  const unscheduledRisk = signedValueWaitingForDate * assumptions.unscheduledCancellationShare;

  return {
    annualQuotedVolume: roundEuro(annualQuotedVolume),
    unansweredQuotesPerMonth: roundTwo(unansweredQuotesPerMonth),
    neverFollowedUpPerMonth: roundTwo(neverFollowedUpPerMonth),
    annualQuoteLoss: roundEuro(annualQuoteLoss),
    annualQuoteLossLow: roundEuro(annualQuoteLossLow),
    annualQuoteLossHigh: roundEuro(annualQuoteLossHigh),
    annualQuoteLossShare: roundFour(annualQuoteLossShare),
    signedValueWaitingForDate: roundEuro(signedValueWaitingForDate),
    unscheduledRisk: roundEuro(unscheduledRisk),
    overdueInvoices: roundEuro(input.overdueInvoices),
  };
}

export function simulateFollowUpLoss(
  input: LossDiagnosticInput,
  assumptions: LossAssumptions,
  simulatedHabit: number,
) {
  assertPercent("simulatedHabit", simulatedHabit);
  const simulatedLoss =
    input.monthlyQuotes *
    assumptions.unansweredAfterSevenDaysShare *
    simulatedHabit *
    assumptions.additionalFollowUpConversionShare *
    input.averageQuoteAmount *
    12;
  const current = calculateLossDiagnostic(input, assumptions).annualQuoteLoss;
  const roundedSimulated = roundEuro(simulatedLoss);

  return {
    simulatedLoss: roundedSimulated,
    difference: roundEuro(current - roundedSimulated),
  };
}

export function comparisonMessage(estimate: number, calculated: number) {
  assertNonNegative("estimate", estimate);
  if (calculated === 0) {
    return estimate === 0
      ? "D’après vos réponses, rien ne se perd de façon mesurable. C’est rare, et c’est une bonne nouvelle."
      : "Vous avez vu plus large que nous. Notre calcul est volontairement prudent.";
  }

  const deltaShare = Math.abs(estimate - calculated) / calculated;
  if (deltaShare <= 0.2) return "Vous saviez déjà. La question est ce que vous en faites lundi.";
  if (estimate < calculated) return "L’écart entre les deux, c’est ce qui ne se voit pas.";
  return "Vous avez vu plus large que nous. Notre calcul est volontairement prudent.";
}

function assertNonNegative(label: string, value: number) {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} doit être un nombre positif ou nul.`);
}

function assertPercent(label: string, value: number) {
  if (!Number.isFinite(value) || value < 0 || value > 1) throw new Error(`${label} doit être compris entre 0 et 1.`);
}

function roundEuro(value: number) {
  return Math.round(value);
}

function roundTwo(value: number) {
  return Math.round(value * 100) / 100;
}

function roundFour(value: number) {
  return Math.round(value * 10_000) / 10_000;
}
