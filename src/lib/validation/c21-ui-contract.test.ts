import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("U21 technical UI contract", () => {
  it("mounts C20 commercial explainability in the real opportunity detail route", () => {
    const page = source("src/app/app/opportunites/[id]/page.tsx");
    expect(page).toContain("CommercialSignalsPanel");
    expect(page).toContain("getOpportunityCommercialSnapshot");
    expect(page).toContain("snapshot={commercialSnapshot}");
  });

  it("keeps the commercial surface human first and rejects email open inference", () => {
    const panel = source("src/components/opportunities/commercial-signals-panel.tsx");
    expect(panel).toContain("Aucun score global");
    expect(panel).toContain("Décision humaine");
    expect(panel).toContain("CORRIGER LA CATÉGORIE");
    expect(panel).toContain("Une ouverture d’email n’est pas de l’intérêt");
    expect(panel).toContain("ils ne deviennent jamais à eux seuls un signal commercial");
  });

  it("provides responsive layouts, keyboard focus and long content resilience", () => {
    const premium = source("src/app/premium-surfaces.css");
    const hardening = source("src/app/c21-hardening.css");
    const layout = source("src/app/layout.tsx");
    expect(premium).toContain("@media (max-width: 720px)");
    expect(premium).toContain("grid-template-columns: 1fr");
    expect(hardening).toContain(":focus-visible");
    expect(hardening).toContain("overflow-wrap: anywhere");
    expect(hardening).toContain("min-width: 0");
    expect(layout).toContain('import "./c21-hardening.css"');
  });

  it("bounds opportunity feed reads instead of rendering an unbounded business list", () => {
    const data = source("src/lib/data/opportunities.ts");
    expect(data).toContain("Math.min(options.limit ?? 100, 500)");
  });

  it("keeps structured objections tenant scoped and human corrections authoritative", () => {
    const migration = source("supabase/migrations/20260913000000_commercial_signals_objections.sql");
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("unique (organization_id, message_id)");
    expect(migration).toContain("A human correction is authoritative and is never overwritten by AI");
    expect(migration).toContain("private.is_organization_member(target_organization_id)");
  });
});
