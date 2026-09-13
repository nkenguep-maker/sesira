import { describe, expect, it } from "vitest";

import { isDocumentKind, safeStorageName, sniffDocumentType } from "./upload-policy";

describe("document upload policy", () => {
  it("accepts supported document kinds", () => {
    expect(isDocumentKind("CONTRACT")).toBe(true);
    expect(isDocumentKind("INVOICE")).toBe(true);
    expect(isDocumentKind("OTHER")).toBe(true);
    expect(isDocumentKind("EXECUTABLE")).toBe(false);
  });

  it("normalizes storage file names", () => {
    expect(safeStorageName("Facture n° 42 — août 2026.pdf")).toBe("Facture-n-42-aout-2026.pdf");
    expect(safeStorageName("../../contrat?.pdf")).toBe("contrat-.pdf");
  });

  it("sniffs supported file signatures instead of trusting extensions", () => {
    expect(sniffDocumentType(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]))).toBe("application/pdf");
    expect(sniffDocumentType(new Uint8Array([0xff, 0xd8, 0xff, 0x00]))).toBe("image/jpeg");
    expect(sniffDocumentType(new Uint8Array([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))).toBe("image/png");
    expect(sniffDocumentType(new Uint8Array([0x52,0x49,0x46,0x46,0,0,0,0,0x57,0x45,0x42,0x50]))).toBe("image/webp");
    expect(sniffDocumentType(new TextEncoder().encode("not really a PDF.pdf"))).toBeNull();
  });
});
