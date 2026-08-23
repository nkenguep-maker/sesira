import { describe, expect, it } from "vitest";

import {
  canChangeQuoteStatus,
  getAllowedQuoteStatuses,
  quoteDateToTimestamp,
  quoteInputSchema,
} from "./schema";

const customerId = "10000000-0000-4000-8000-000000000001";

describe("quote input", () => {
  it("normalizes a French amount and optional fields", () => {
    const result = quoteInputSchema.parse({
      customerId,
      requestId: "",
      ownerUserId: "",
      title: "Remplacement chaudière",
      reference: " DEV-2026-0042 ",
      amount: "18 450,50",
      expiresOn: "2099-09-30",
      nextActionOn: "2099-09-10",
    });

    expect(result.amount).toBe(18_450.5);
    expect(result.reference).toBe("DEV-2026-0042");
    expect(result.requestId).toBeUndefined();
  });

  it("rejects invalid amounts and identifiers", () => {
    expect(
      quoteInputSchema.safeParse({ customerId: "other-tenant", title: "PAC", amount: "-1" }).success,
    ).toBe(false);
    expect(quoteInputSchema.safeParse({ customerId, title: "PAC", amount: "12.999" }).success).toBe(false);
  });

  it("rejects a next date after expiration", () => {
    const result = quoteInputSchema.safeParse({
      customerId,
      title: "PAC",
      amount: "12000",
      expiresOn: "2099-09-01",
      nextActionOn: "2099-09-02",
    });

    expect(result.success).toBe(false);
  });

  it("rejects impossible calendar dates", () => {
    const result = quoteInputSchema.safeParse({
      customerId,
      title: "PAC",
      amount: "12000",
      expiresOn: "2099-02-31",
    });

    expect(result.success).toBe(false);
  });
});

describe("quote status transitions", () => {
  it("allows a real send and commercial outcomes", () => {
    expect(canChangeQuoteStatus("DRAFT", "SENT")).toBe(true);
    expect(getAllowedQuoteStatuses("SENT")).toContain("WON");
    expect(canChangeQuoteStatus("REPLIED", "LOST")).toBe(true);
  });

  it("keeps terminal quotes closed", () => {
    expect(getAllowedQuoteStatuses("WON")).toEqual([]);
    expect(canChangeQuoteStatus("LOST", "SENT")).toBe(false);
    expect(canChangeQuoteStatus("EXPIRED", "FOLLOWING_UP")).toBe(false);
  });
});

describe("quote dates", () => {
  it("stores calendar dates without a midnight timezone shift", () => {
    expect(quoteDateToTimestamp("2099-09-30")).toBe("2099-09-30T12:00:00.000Z");
    expect(quoteDateToTimestamp()).toBeNull();
  });
});
