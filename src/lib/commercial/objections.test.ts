import { describe, expect, it } from "vitest";

import { COMMERCIAL_OBJECTION_KINDS, isCommercialObjectionKind, isSensitiveObjectionKind } from "./objections";

describe("commercial objections", () => {
  it("keeps the advanced taxonomy finite", () => {
    expect(COMMERCIAL_OBJECTION_KINDS).toContain("COMPETITION");
    expect(COMMERCIAL_OBJECTION_KINDS).toContain("LEGAL");
    expect(COMMERCIAL_OBJECTION_KINDS).toContain("UNCERTAIN");
    expect(isCommercialObjectionKind("RANDOM")).toBe(false);
  });

  it("keeps price, complaints, legal, contractual and financial objections human-sensitive", () => {
    for (const kind of ["PRICE","COMPLAINT","LEGAL","CONTRACTUAL","FINANCIAL"] as const) {
      expect(isSensitiveObjectionKind(kind)).toBe(true);
    }
    expect(isSensitiveObjectionKind("TIMING")).toBe(false);
    expect(isSensitiveObjectionKind("TECHNICAL")).toBe(false);
  });
});
