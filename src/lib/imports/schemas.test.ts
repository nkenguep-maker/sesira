import { describe, expect, it } from "vitest";

import { customerRowSchema, isImportKind } from "./schemas";

describe("customerRowSchema", () => {
  it("parses a minimal valid row", () => {
    const r = customerRowSchema.safeParse({
      external_id: "c1", display_name: "Alice",
    });
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.external_provider).toBe("csv_import");
    expect(r.data.type).toBe("PERSON");
    expect(r.data.email).toBeNull();
    expect(r.data.phone).toBeNull();
    expect(r.data.company_name).toBeNull();
  });

  it("accepts an explicit provider + COMPANY type + phone", () => {
    const r = customerRowSchema.safeParse({
      external_id: "c2", external_provider: "crm_x",
      display_name: "Acme SA", type: "COMPANY",
      company_name: "Acme SA", email: "sales@acme.example",
      phone: "+33123456789",
    });
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.type).toBe("COMPANY");
    expect(r.data.email).toBe("sales@acme.example");
    expect(r.data.phone).toBe("+33123456789");
  });

  it("rejects an empty external_id", () => {
    const r = customerRowSchema.safeParse({ external_id: "", display_name: "x" });
    expect(r.success).toBe(false);
  });

  it("rejects an unknown type", () => {
    const r = customerRowSchema.safeParse({
      external_id: "c1", display_name: "x", type: "ROBOT",
    });
    expect(r.success).toBe(false);
  });

  it("coerces an empty email string to null", () => {
    const r = customerRowSchema.safeParse({
      external_id: "c1", display_name: "x", email: "",
    });
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.email).toBeNull();
  });

  it("rejects a malformed email", () => {
    const r = customerRowSchema.safeParse({
      external_id: "c1", display_name: "x", email: "not-an-email",
    });
    expect(r.success).toBe(false);
  });
});

describe("isImportKind", () => {
  it("accepts customers", () => {
    expect(isImportKind("customers")).toBe(true);
  });

  it("rejects unknown kinds", () => {
    expect(isImportKind("invoices")).toBe(false);
    expect(isImportKind("")).toBe(false);
  });
});
