import { describe, expect, it } from "vitest";

import {
  canTransitionOpportunity,
  isOpportunityState,
  isQuoteOptionStatus,
  isTerminalOpportunityState,
  OPPORTUNITY_STATES,
  QUOTE_OPTION_STATUSES,
} from "./schema";

describe("opportunity state vocabulary", () => {
  it("recognizes every enum member as a valid state", () => {
    for (const s of OPPORTUNITY_STATES) {
      expect(isOpportunityState(s)).toBe(true);
    }
    expect(isOpportunityState("UNKNOWN")).toBe(false);
    expect(isOpportunityState("")).toBe(false);
  });

  it("flags WON / LOST / CANCELLED as terminal", () => {
    expect(isTerminalOpportunityState("WON")).toBe(true);
    expect(isTerminalOpportunityState("LOST")).toBe(true);
    expect(isTerminalOpportunityState("CANCELLED")).toBe(true);
    expect(isTerminalOpportunityState("NEW")).toBe(false);
    expect(isTerminalOpportunityState("QUALIFYING")).toBe(false);
    expect(isTerminalOpportunityState("ACTIVE")).toBe(false);
  });

  it("allows NEW → QUALIFYING / ACTIVE / WON / LOST / CANCELLED", () => {
    expect(canTransitionOpportunity("NEW", "QUALIFYING")).toBe(true);
    expect(canTransitionOpportunity("NEW", "ACTIVE")).toBe(true);
    expect(canTransitionOpportunity("NEW", "WON")).toBe(true);
    expect(canTransitionOpportunity("NEW", "LOST")).toBe(true);
    expect(canTransitionOpportunity("NEW", "CANCELLED")).toBe(true);
    expect(canTransitionOpportunity("NEW", "NEW")).toBe(false);
  });

  it("allows QUALIFYING → ACTIVE / WON / LOST / CANCELLED", () => {
    expect(canTransitionOpportunity("QUALIFYING", "ACTIVE")).toBe(true);
    expect(canTransitionOpportunity("QUALIFYING", "WON")).toBe(true);
    expect(canTransitionOpportunity("QUALIFYING", "NEW")).toBe(false);
  });

  it("allows ACTIVE → WON / LOST / CANCELLED only", () => {
    expect(canTransitionOpportunity("ACTIVE", "WON")).toBe(true);
    expect(canTransitionOpportunity("ACTIVE", "LOST")).toBe(true);
    expect(canTransitionOpportunity("ACTIVE", "CANCELLED")).toBe(true);
    expect(canTransitionOpportunity("ACTIVE", "NEW")).toBe(false);
    expect(canTransitionOpportunity("ACTIVE", "QUALIFYING")).toBe(false);
  });

  it("forbids ANY transition from a terminal state", () => {
    for (const to of OPPORTUNITY_STATES) {
      expect(canTransitionOpportunity("WON", to)).toBe(false);
      expect(canTransitionOpportunity("LOST", to)).toBe(false);
      expect(canTransitionOpportunity("CANCELLED", to)).toBe(false);
    }
  });
});

describe("quote option statuses", () => {
  it("recognizes every enum member", () => {
    for (const s of QUOTE_OPTION_STATUSES) {
      expect(isQuoteOptionStatus(s)).toBe(true);
    }
    expect(isQuoteOptionStatus("SELECTED")).toBe(false);
  });
});
