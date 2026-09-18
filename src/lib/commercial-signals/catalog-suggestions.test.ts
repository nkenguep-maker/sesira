import { describe, expect, it } from "vitest";

import {
  catalogKindsForSignalKind,
  suggestCatalogItemForSignalKind,
} from "./catalog-suggestions";

const ORG = "91000000-0000-4000-8000-000000000001";

describe("catalogKindsForSignalKind", () => {
  it("keeps the future deterministic mapping explicit", () => {
    expect(catalogKindsForSignalKind("LEAK_CHECK_DUE")).toEqual(["MAINTENANCE"]);
  });
});

describe("suggestCatalogItemForSignalKind", () => {
  it("fails closed until C51 publishes the production catalog contract", async () => {
    await expect(
      suggestCatalogItemForSignalKind(ORG, "LEAK_CHECK_DUE"),
    ).resolves.toEqual({ status: "NO_MATCH" });
  });

  it("never invents a catalog suggestion for an unmapped future kind", async () => {
    await expect(
      suggestCatalogItemForSignalKind(ORG, "UNMAPPED_KIND" as never),
    ).resolves.toEqual({ status: "NO_MATCH" });
  });
});
