import { describe, expect, it } from "vitest";

import { normalizeName, normalizePhone, normalizeReference } from "./linking";

describe("document entity matching normalization", () => {
  it("normalizes company names without legal suffix noise", () => {
    expect(normalizeName("Clinique des Cèdres SAS")).toBe("clinique des cedres");
    expect(normalizeName("CLINIQUE DES CEDRES")).toBe("clinique des cedres");
  });

  it("normalizes references across punctuation and casing", () => {
    expect(normalizeReference("FA-2026/0142")).toBe("FA20260142");
    expect(normalizeReference("fa 2026-0142")).toBe("FA20260142");
  });

  it("normalizes international phone formatting", () => {
    expect(normalizePhone("+33 6 10 20 30 40")).toBe("33610203040");
    expect(normalizePhone("0033 6 10 20 30 40")).toBe("33610203040");
  });
});
