import { describe, expect, it } from "vitest";

import { organizationSettingsSchema } from "./schema";

describe("organization settings", () => {
  it("normalizes safe persisted fields", () => {
    expect(
      organizationSettingsSchema.parse({
        name: "  Clima Rhône  ",
        timezone: "Europe/Paris",
        currency: "eur",
      }),
    ).toEqual({
      name: "Clima Rhône",
      timezone: "Europe/Paris",
      currency: "EUR",
    });
  });

  it("rejects invalid company data", () => {
    const result = organizationSettingsSchema.safeParse({
      name: "C",
      timezone: "Fuseau inventé",
      currency: "EURO",
    });

    expect(result.success).toBe(false);
  });
});
