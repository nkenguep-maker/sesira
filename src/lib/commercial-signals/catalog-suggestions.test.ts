import { beforeEach, describe, expect, it } from "vitest";

import {
  catalogKindsForSignalKind,
  suggestCatalogItemForSignalKind,
} from "./catalog-suggestions";

const ORG = "91000000-0000-4000-8000-000000000001";

interface FakeState {
  lastFrom: string | null;
  filters: Array<{ op: string; column: string; value: unknown }>;
  response: { data: unknown[] | null; error: { message: string } | null };
}

let state: FakeState;

function fakeClient() {
  return {
    from(table: string) {
      state.lastFrom = table;
      const builder = {
        select() { return builder; },
        eq(column: string, value: unknown) {
          state.filters.push({ op: "eq", column, value });
          return builder;
        },
        in(column: string, value: unknown) {
          state.filters.push({ op: "in", column, value });
          return builder;
        },
        is(column: string, value: unknown) {
          state.filters.push({ op: "is", column, value });
          return builder;
        },
        order() { return builder; },
        limit() {
          return Promise.resolve(state.response);
        },
      };
      return builder;
    },
  };
}

beforeEach(() => {
  state = { lastFrom: null, filters: [], response: { data: [], error: null } };
});

describe("catalogKindsForSignalKind", () => {
  it("maps LEAK_CHECK_DUE to MAINTENANCE", () => {
    expect(catalogKindsForSignalKind("LEAK_CHECK_DUE")).toEqual(["MAINTENANCE"]);
  });
});

describe("suggestCatalogItemForSignalKind", () => {
  it("returns OK with a mapped item when a matching active row exists", async () => {
    state.response = {
      data: [
        {
          id: "91500000-0000-4000-8000-000000000001",
          name: "Contrôle d'étanchéité",
          kind: "MAINTENANCE",
          code: "MAINT-LEAK-01",
          base_amount: 240,
          currency: "EUR",
          active: true,
          archived_at: null,
        },
      ],
      error: null,
    };
    const result = await suggestCatalogItemForSignalKind(ORG, "LEAK_CHECK_DUE", {
      client: fakeClient() as never,
    });
    expect(result.status).toBe("OK");
    if (result.status === "OK") {
      expect(result.item.catalogItemId).toBe("91500000-0000-4000-8000-000000000001");
      expect(result.item.kind).toBe("MAINTENANCE");
      expect(result.item.baseAmount).toBe(240);
      expect(result.item.currency).toBe("EUR");
    }
    expect(state.lastFrom).toBe("service_catalog_items");
    // Verify tenant + kind + active + archived_at filters were all applied.
    const has = (op: string, column: string) =>
      state.filters.some((f) => f.op === op && f.column === column);
    expect(has("eq", "organization_id")).toBe(true);
    expect(has("in", "kind")).toBe(true);
    expect(has("eq", "active")).toBe(true);
    expect(has("is", "archived_at")).toBe(true);
  });

  it("returns NO_MATCH when the org has no matching catalog item", async () => {
    state.response = { data: [], error: null };
    const result = await suggestCatalogItemForSignalKind(ORG, "LEAK_CHECK_DUE", {
      client: fakeClient() as never,
    });
    expect(result).toEqual({ status: "NO_MATCH" });
  });

  it("returns NO_MATCH when the signal kind has no mapping (defense)", async () => {
    // Force a type escape to simulate a hypothetical future kind not yet mapped.
    const result = await suggestCatalogItemForSignalKind(
      ORG,
      "UNMAPPED_KIND" as never,
      { client: fakeClient() as never },
    );
    expect(result).toEqual({ status: "NO_MATCH" });
    // Never touched the DB — no query needed for an unmappable kind.
    expect(state.lastFrom).toBeNull();
  });

  it("returns ERROR when the DB query errors", async () => {
    state.response = { data: null, error: { message: "42501: RLS denied" } };
    const result = await suggestCatalogItemForSignalKind(ORG, "LEAK_CHECK_DUE", {
      client: fakeClient() as never,
    });
    expect(result.status).toBe("ERROR");
    if (result.status === "ERROR") expect(result.reason).toContain("42501");
  });

  it("returns baseAmount=null when the row has no price", async () => {
    state.response = {
      data: [
        {
          id: "91500000-0000-4000-8000-000000000002",
          name: "Contrôle d'étanchéité",
          kind: "MAINTENANCE",
          code: null,
          base_amount: null,
          currency: "EUR",
          active: true,
          archived_at: null,
        },
      ],
      error: null,
    };
    const result = await suggestCatalogItemForSignalKind(ORG, "LEAK_CHECK_DUE", {
      client: fakeClient() as never,
    });
    expect(result.status).toBe("OK");
    if (result.status === "OK") {
      expect(result.item.baseAmount).toBeNull();
    }
  });

  it("never auto-applies the item — only returns it as a suggestion", async () => {
    state.response = {
      data: [
        {
          id: "91500000-0000-4000-8000-000000000003",
          name: "Contrôle",
          kind: "MAINTENANCE",
          code: null,
          base_amount: 100,
          currency: "EUR",
          active: true,
          archived_at: null,
        },
      ],
      error: null,
    };
    await suggestCatalogItemForSignalKind(ORG, "LEAK_CHECK_DUE", {
      client: fakeClient() as never,
    });
    // The function must never call any mutation RPC (apply_catalog_to_*).
    // We only queried the catalog table for a SELECT.
    expect(state.lastFrom).toBe("service_catalog_items");
  });
});
