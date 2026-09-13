import { describe, expect, it } from "vitest";

import {
  customerRowSchema,
  equipmentRowSchema,
  invoiceRowSchema,
  isImportKind,
  maintenanceContractRowSchema,
  quoteRowSchema,
} from "./schemas";

describe("customerRowSchema", () => {
  it("parses a minimal valid row", () => {
    const result = customerRowSchema.safeParse({
      external_id: "c1",
      display_name: "Alice",
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.external_provider).toBe("csv_import");
    expect(result.data.type).toBe("PERSON");
    expect(result.data.email).toBeNull();
    expect(result.data.phone).toBeNull();
    expect(result.data.company_name).toBeNull();
  });

  it("accepts an explicit provider and COMPANY", () => {
    const result = customerRowSchema.safeParse({
      external_id: "c2",
      external_provider: "crm_x",
      display_name: "Acme SA",
      type: "COMPANY",
      company_name: "Acme SA",
      email: "sales@acme.example",
      phone: "+33123456789",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a malformed email", () => {
    expect(
      customerRowSchema.safeParse({
        external_id: "c1",
        display_name: "x",
        email: "not-an-email",
      }).success,
    ).toBe(false);
  });
});

describe("quoteRowSchema", () => {
  it("requires a deterministic customer reference", () => {
    expect(
      quoteRowSchema.safeParse({
        external_id: "q1",
        title: "Devis test",
      }).success,
    ).toBe(false);
  });

  it("accepts customer email and French decimal notation", () => {
    const result = quoteRowSchema.safeParse({
      external_id: "q1",
      customer_email: "client@example.test",
      title: "Devis test",
      amount: "1 250,50",
      currency: "eur",
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.amount).toBe(1250.5);
    expect(result.data.currency).toBe("EUR");
  });
});

describe("invoiceRowSchema", () => {
  it("accepts an optional quote reference", () => {
    const result = invoiceRowSchema.safeParse({
      external_ref: "FA-001",
      customer_external_id: "C-001",
      quote_reference: "DV-001",
      amount: "1200",
      issued_at: "2026-09-13",
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.issued_at).toBe("2026-09-13T00:00:00.000Z");
  });
});

describe("equipmentRowSchema", () => {
  it("normalizes localized booleans", () => {
    const result = equipmentRowSchema.safeParse({
      external_ref: "EQ-001",
      customer_external_id: "C-001",
      label: "PAC toiture",
      equipment_category: "PAC",
      fluid_code: "R410A",
      charge_kg: "7,8",
      is_hermetic: "non",
      is_residential: "oui",
      has_leak_detector: "1",
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.charge_kg).toBe(7.8);
    expect(result.data.is_hermetic).toBe(false);
    expect(result.data.is_residential).toBe(true);
    expect(result.data.has_leak_detector).toBe(true);
  });

  it("rejects a decommission date before commissioning", () => {
    expect(
      equipmentRowSchema.safeParse({
        external_ref: "EQ-001",
        customer_external_id: "C-001",
        label: "PAC",
        equipment_category: "PAC",
        fluid_code: "R410A",
        charge_kg: "1",
        commissioned_at: "2026-09-20",
        decommissioned_at: "2026-09-10",
      }).success,
    ).toBe(false);
  });
});

describe("maintenanceContractRowSchema", () => {
  it("accepts a valid active contract", () => {
    const result = maintenanceContractRowSchema.safeParse({
      external_ref: "CM-001",
      customer_external_id: "C-001",
      title: "Maintenance annuelle",
      cadence_days: "90",
      amount: "4800",
      status: "ACTIVE",
      start_date: "2026-01-01",
      end_date: "2026-12-31",
    });
    expect(result.success).toBe(true);
  });

  it("rejects cadence below seven days", () => {
    expect(
      maintenanceContractRowSchema.safeParse({
        external_ref: "CM-001",
        customer_external_id: "C-001",
        title: "Maintenance",
        cadence_days: "2",
      }).success,
    ).toBe(false);
  });
});

describe("isImportKind", () => {
  it.each([
    "customers",
    "quotes",
    "invoices",
    "equipment",
    "maintenance_contracts",
  ])("accepts %s", (kind) => {
    expect(isImportKind(kind)).toBe(true);
  });

  it("rejects unknown kinds", () => {
    expect(isImportKind("requests")).toBe(false);
    expect(isImportKind("")).toBe(false);
  });
});
