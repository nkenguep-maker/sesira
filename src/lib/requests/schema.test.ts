import { describe, expect, it } from "vitest";

import {
  canChangeRequestStatus,
  createRequestData,
  readRequestDescription,
  requestInputSchema,
} from "./schema";

describe("request input", () => {
  it("normalizes optional fields", () => {
    expect(
      requestInputSchema.parse({
        customerId: "10000000-0000-4000-8000-000000000001",
        serviceCatalogItemId: "",
        title: "  Remplacement chauffage  ",
        source: "MANUAL",
        description: "  Maison individuelle  ",
      }),
    ).toEqual({
      customerId: "10000000-0000-4000-8000-000000000001",
      serviceCatalogItemId: undefined,
      title: "Remplacement chauffage",
      source: "MANUAL",
      description: "Maison individuelle",
    });
  });

  it("rejects an unknown source and malformed customer", () => {
    const result = requestInputSchema.safeParse({
      customerId: "another-organization",
      title: "Projet",
      source: "PHONE",
    });

    expect(result.success).toBe(false);
  });
});

describe("request status transitions", () => {
  it("allows the narrow qualification path", () => {
    expect(canChangeRequestStatus("NEW", "PROCESSING")).toBe(true);
    expect(canChangeRequestStatus("QUALIFIED", "READY")).toBe(true);
  });

  it("blocks reopening terminal requests and unsafe jumps", () => {
    expect(canChangeRequestStatus("CLOSED", "NEW")).toBe(false);
    expect(canChangeRequestStatus("NEW", "READY")).toBe(false);
  });
});

describe("request data", () => {
  it("stores and reads the versioned description", () => {
    const data = createRequestData("Besoin avant octobre.");

    expect(data).toEqual({ schema_version: 1, description: "Besoin avant octobre." });
    expect(readRequestDescription(data)).toBe("Besoin avant octobre.");
  });

  it("safely ignores malformed descriptions", () => {
    expect(readRequestDescription({ description: 42 })).toBeNull();
    expect(readRequestDescription(null)).toBeNull();
  });
});
