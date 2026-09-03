import "server-only";

/**
 * C18 — opportunity state vocabulary + valid transitions.
 *
 * The DB trigger + `transition_opportunity_state` RPC are the
 * authoritative enforcement. This file gives the TypeScript surface
 * a stable enum + a pure-function `canTransition` helper so a UI
 * layer can disable illegal actions before firing the RPC.
 */

export const OPPORTUNITY_STATES = [
  "NEW",
  "QUALIFYING",
  "ACTIVE",
  "WON",
  "LOST",
  "CANCELLED",
] as const;

export type OpportunityState = (typeof OPPORTUNITY_STATES)[number];

const VALID_TRANSITIONS: Record<OpportunityState, ReadonlyArray<OpportunityState>> = {
  NEW: ["QUALIFYING", "ACTIVE", "WON", "LOST", "CANCELLED"],
  QUALIFYING: ["ACTIVE", "WON", "LOST", "CANCELLED"],
  ACTIVE: ["WON", "LOST", "CANCELLED"],
  WON: [],
  LOST: [],
  CANCELLED: [],
};

export function isOpportunityState(value: string): value is OpportunityState {
  return (OPPORTUNITY_STATES as readonly string[]).includes(value);
}

export function canTransitionOpportunity(
  from: OpportunityState,
  to: OpportunityState,
): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

export function isTerminalOpportunityState(state: OpportunityState): boolean {
  return state === "WON" || state === "LOST" || state === "CANCELLED";
}

export const QUOTE_OPTION_STATUSES = [
  "PROPOSED",
  "INCLUDED",
  "EXCLUDED",
  "REJECTED",
] as const;

export type QuoteOptionStatus = (typeof QUOTE_OPTION_STATUSES)[number];

export function isQuoteOptionStatus(value: string): value is QuoteOptionStatus {
  return (QUOTE_OPTION_STATUSES as readonly string[]).includes(value);
}
