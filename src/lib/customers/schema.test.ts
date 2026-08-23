import { describe, expect, it } from "vitest";

import { customerInputSchema } from "./schema";

describe("customer input", () => {
  it("normalizes optional blank fields", () => {
    expect(
      customerInputSchema.parse({
        type: "PERSON",
        displayName: "  Amina Diallo  ",
        companyName: "",
        email: "",
        phone: "",
      }),
    ).toEqual({
      type: "PERSON",
      displayName: "Amina Diallo",
      companyName: undefined,
      email: undefined,
      phone: undefined,
    });
  });

  it("rejects malformed contact data", () => {
    const result = customerInputSchema.safeParse({
      type: "PERSON",
      displayName: "A",
      email: "not-an-email",
    });

    expect(result.success).toBe(false);
  });

  it("requires a company name for company records", () => {
    const result = customerInputSchema.safeParse({
      type: "COMPANY",
      displayName: "Thomas Martin",
      companyName: "",
    });

    expect(result.success).toBe(false);
  });
});
