import { describe, expect, it } from "vitest";

import {
  COMMERCIAL_SIGNAL_KINDS,
  COMMERCIAL_SIGNAL_STATUSES,
  COMMERCIAL_SIGNAL_SEVERITIES,
  COMMERCIAL_SIGNAL_SOURCE_TYPES,
  COMMERCIAL_SIGNAL_SEVERITY_ORDER,
  convertSignalToProposalInputSchema,
  dismissSignalInputSchema,
  isCommercialSignalKind,
  isCommercialSignalSeverity,
  isCommercialSignalStatus,
  markSignalPlannedInputSchema,
  markSignalReviewedInputSchema,
  snoozeSignalInputSchema,
} from "./schema";

const UUID = "91000000-0000-4000-8000-000000000001";
const UUID2 = "91000000-0000-4000-8000-000000000002";

describe("vocabulary constants stay in sync with the migration CHECK constraints", () => {
  it("only ships LEAK_CHECK_DUE at C50", () => {
    expect([...COMMERCIAL_SIGNAL_KINDS]).toEqual(["LEAK_CHECK_DUE"]);
  });

  it("only ships regulatory_leak_check as source_type at C50", () => {
    expect([...COMMERCIAL_SIGNAL_SOURCE_TYPES]).toEqual(["regulatory_leak_check"]);
  });

  it("declares the 6-state commercial lifecycle", () => {
    expect([...COMMERCIAL_SIGNAL_STATUSES].sort()).toEqual([
      "CONVERTED",
      "DETECTED",
      "DISMISSED",
      "PLANNED",
      "REVIEWED",
      "SNOOZED",
    ]);
  });

  it("declares the 4-severity ladder in the priority order", () => {
    expect([...COMMERCIAL_SIGNAL_SEVERITIES]).toEqual(["LOW", "NORMAL", "HIGH", "URGENT"]);
    expect(COMMERCIAL_SIGNAL_SEVERITY_ORDER).toEqual({
      URGENT: 1,
      HIGH: 2,
      NORMAL: 3,
      LOW: 4,
    });
  });
});

describe("type guards", () => {
  it("isCommercialSignalKind narrows only to declared kinds", () => {
    expect(isCommercialSignalKind("LEAK_CHECK_DUE")).toBe(true);
    expect(isCommercialSignalKind("REPLACEMENT_TO_PREPARE")).toBe(false);
    expect(isCommercialSignalKind("")).toBe(false);
  });

  it("isCommercialSignalStatus narrows correctly", () => {
    for (const s of COMMERCIAL_SIGNAL_STATUSES) {
      expect(isCommercialSignalStatus(s)).toBe(true);
    }
    expect(isCommercialSignalStatus("OPEN")).toBe(false);
    expect(isCommercialSignalStatus("resolved")).toBe(false);
  });

  it("isCommercialSignalSeverity narrows correctly", () => {
    for (const s of COMMERCIAL_SIGNAL_SEVERITIES) {
      expect(isCommercialSignalSeverity(s)).toBe(true);
    }
    expect(isCommercialSignalSeverity("Urgent")).toBe(false);
  });
});

describe("markSignalReviewedInputSchema", () => {
  it("accepts a valid pair", () => {
    expect(() =>
      markSignalReviewedInputSchema.parse({ organizationId: UUID, signalId: UUID2 }),
    ).not.toThrow();
  });
  it("rejects a non-UUID", () => {
    expect(() =>
      markSignalReviewedInputSchema.parse({ organizationId: "not-uuid", signalId: UUID }),
    ).toThrow();
  });
});

describe("markSignalPlannedInputSchema", () => {
  it("accepts a null note", () => {
    expect(() =>
      markSignalPlannedInputSchema.parse({ organizationId: UUID, signalId: UUID2, note: null }),
    ).not.toThrow();
  });
  it("rejects an empty-string note (trim min 1)", () => {
    expect(() =>
      markSignalPlannedInputSchema.parse({ organizationId: UUID, signalId: UUID2, note: "   " }),
    ).toThrow();
  });
  it("rejects a note over 500 chars", () => {
    expect(() =>
      markSignalPlannedInputSchema.parse({
        organizationId: UUID,
        signalId: UUID2,
        note: "x".repeat(501),
      }),
    ).toThrow();
  });
});

describe("snoozeSignalInputSchema", () => {
  it("accepts a valid future ISO datetime", () => {
    expect(() =>
      snoozeSignalInputSchema.parse({
        organizationId: UUID,
        signalId: UUID2,
        snoozedUntil: "2027-01-01T09:00:00Z",
        reason: null,
      }),
    ).not.toThrow();
  });
  it("rejects a bare date without time", () => {
    expect(() =>
      snoozeSignalInputSchema.parse({
        organizationId: UUID,
        signalId: UUID2,
        snoozedUntil: "2027-01-01",
      }),
    ).toThrow();
  });
});

describe("dismissSignalInputSchema", () => {
  it("requires a non-empty reason", () => {
    expect(() =>
      dismissSignalInputSchema.parse({ organizationId: UUID, signalId: UUID2, reason: "" }),
    ).toThrow();
  });
  it("accepts a trimmed reason", () => {
    expect(() =>
      dismissSignalInputSchema.parse({
        organizationId: UUID,
        signalId: UUID2,
        reason: "customer refuses",
      }),
    ).not.toThrow();
  });
});

describe("convertSignalToProposalInputSchema", () => {
  const base = {
    organizationId: UUID,
    signalId: UUID2,
    quoteTitle: "Contrôle d'étanchéité",
  };

  it("accepts the minimal required set", () => {
    expect(() => convertSignalToProposalInputSchema.parse(base)).not.toThrow();
  });

  it("accepts optional catalog and owner", () => {
    expect(() =>
      convertSignalToProposalInputSchema.parse({
        ...base,
        catalogItemId: "91000000-0000-4000-8000-000000000003",
        ownerUserId: "91000000-0000-4000-8000-000000000004",
        estimatedValue: 1200.5,
        currency: "EUR",
        variantKey: "default",
        overrideCustomerId: "91000000-0000-4000-8000-000000000005",
      }),
    ).not.toThrow();
  });

  it("rejects a negative estimated value", () => {
    expect(() =>
      convertSignalToProposalInputSchema.parse({ ...base, estimatedValue: -1 }),
    ).toThrow();
  });

  it("rejects a lowercase currency", () => {
    expect(() =>
      convertSignalToProposalInputSchema.parse({ ...base, currency: "eur" }),
    ).toThrow();
  });

  it("rejects an empty quote title", () => {
    expect(() =>
      convertSignalToProposalInputSchema.parse({ ...base, quoteTitle: "  " }),
    ).toThrow();
  });
});
