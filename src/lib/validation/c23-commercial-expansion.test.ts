import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("C23/U23 controlled commercial expansion", () => {
  it("enforces quote readiness at the database boundary", () => {
    const migration = source("supabase/migrations/20260915000000_quote_drafting_and_reactivation.sql");
    expect(migration).toContain("old.status = 'DRAFT' and new.status = 'SENT'");
    expect(migration).toContain("cannot be sent before draft analysis");
    expect(migration).toContain("cannot be sent with unresolved draft gaps");
    expect(migration).toContain("quotes_enforce_draft_readiness");
  });

  it("prevents authenticated clients from forging draft analysis fields", () => {
    const migration = source("supabase/migrations/20260915000000_quote_drafting_and_reactivation.sql");
    expect(migration).toContain("quote draft analysis fields are RPC-managed");
    expect(migration).toContain("record_quote_draft_gaps");
    expect(migration).toContain("quote.draft_gaps_recorded");
  });

  it("excludes opt outs and both complaint signals from reactivation", () => {
    const migration = source("supabase/migrations/20260915000000_quote_drafting_and_reactivation.sql");
    const reactivation = migration.split("create or replace function public.dormant_opportunities")[1] ?? "";
    expect(reactivation).toContain("q.opted_out_at is not null");
    expect(reactivation).toContain("q.automation_pause_reason = 'COMPLAINT'");
    expect(reactivation).toContain("co.kind = 'COMPLAINT'");
    expect(reactivation).toContain("o.commercial_state not in ('WON','LOST','CANCELLED')");
    expect(reactivation).not.toContain("update public.opportunities");
    expect(reactivation).not.toContain("insert into public.outbound_messages");
  });

  it("keeps reactivation explicitly observational in the canonical UI", () => {
    const page = source("src/app/app/opportunites/page.tsx");
    expect(page).toContain("getReactivationCandidates");
    expect(page).toContain("RÉACTIVATION");
    expect(page).toContain("Ce délai n’est pas présenté comme un benchmark");
    expect(page).toContain("aucune relance ne part depuis cette vue");
    expect(page).not.toContain("Envoyer une relance");
  });

  it("shows authoritative draft readiness without offering a bypass send control", () => {
    const page = source("src/app/app/devis/page.tsx");
    expect(page).toContain("getQuoteDraftReadiness");
    expect(page).toContain("SESIRA applique ce contrôle au moment de l’enregistrement");
    expect(page).toContain("Analyse requise");
    expect(page).not.toContain("Envoyer ce devis");
  });
});
