import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const seed = readFileSync(
  fileURLToPath(new URL("../../../supabase/seed.sql", import.meta.url)),
  "utf8",
);

describe("development demo seed", () => {
  it("contains two isolated fictional organizations with members and business data", () => {
    expect(seed).toContain("Clima Rhône — Démo");
    expect(seed).toContain("Studio Nova — Démo");
    expect(seed).toContain("insert into public.organization_members");
    expect(seed).toContain("insert into public.customers");
    expect(seed).toContain("insert into public.requests");
    expect(seed).toContain("insert into public.quotes");
    expect(seed).toContain("insert into public.attention_items");
    expect(seed).toContain("insert into public.events");
  });

  it("preserves the complete Clima Rhône manual demo story", () => {
    expect(seed).toContain("Sophie Lefèvre");
    expect(seed).toContain("Pompe à chaleur");
    expect(seed).toContain("Surface : 145 m²");
    expect(seed).toContain("Chauffage actuel : Chaudière gaz");
    expect(seed).toContain("Année de construction : 1998");
    expect(seed).toContain("18450");
    expect(seed).toContain("La cliente reste intéressée mais demande un geste sur le prix.");
  });

  it("marks the decision as manual demo data without fake AI or automation runs", () => {
    expect(seed).toContain('"demo_data": true');
    expect(seed).toContain('"created_manually": true');
    expect(seed).toContain('"ai_classified": false');
    expect(seed).toContain('"automation_triggered": false');
    expect(seed).not.toContain("insert into public.ai_runs");
    expect(seed).not.toContain("insert into public.automation_runs");
  });
});
