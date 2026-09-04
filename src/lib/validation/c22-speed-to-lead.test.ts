import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("C22/U22 Speed to Lead integration contracts", () => {
  it("records first handling once and keeps the metric internal", () => {
    const migration = source("supabase/migrations/20260914000000_speed_to_lead.sql");
    expect(migration).toContain("add column first_handled_at timestamptz");
    expect(migration).toContain("old.first_handled_at is null and old.status = 'NEW'");
    expect(migration).toContain("new.first_handled_at := now()");
    expect(migration).toContain("new.first_handled_at := old.first_handled_at");
    expect(migration).toContain("FIRST_INTERNAL_HANDLING");
    expect(migration).toContain("does NOT claim a customer reply was sent");
  });

  it("uses organization policy instead of a hidden global threshold", () => {
    const migration = source("supabase/migrations/20260914000000_speed_to_lead.sql");
    expect(migration).toContain("{value_policies,speed_to_lead}");
    expect(migration).toContain("set_speed_to_lead_policy");
    expect(migration).toContain("target_minutes is required when enabled");
    expect(migration).not.toContain("target_minutes integer :=");
  });

  it("creates one future due Attention and lets existing inbox semantics reveal it at deadline", () => {
    const hardening = source("supabase/migrations/20260914010000_speed_to_lead_due_attention.sql");
    const attentionRead = source("src/lib/data/attention.ts");
    expect(hardening).toContain("attention:speed_to_lead:");
    expect(hardening).toContain("after insert on public.requests");
    expect(hardening).toContain("due_at_value");
    expect(hardening).toContain("automation_eligible', false");
    expect(attentionRead).toContain("new Date(row.due_at).getTime() > now");
  });

  it("does not count future Attention as currently open in results", () => {
    const repository = source("src/lib/results/supabase-results-repository.ts");
    expect(repository).toContain("due_at.is.null,due_at.lte.");
    expect(repository).toContain("Ouverts et arrivés à échéance à ce jour");
  });

  it("mounts configuration and measured summary in the canonical UI", () => {
    const settings = source("src/app/app/parametres/politiques/page.tsx");
    const dashboard = source("src/app/app/page.tsx");
    expect(settings).toContain("saveSpeedToLeadPolicyAction");
    expect(settings).toContain("prise en charge interne");
    expect(settings).toContain("Cette mesure ne signifie pas qu’une réponse a été envoyée au client");
    expect(dashboard).toContain("getSpeedToLeadSummary");
    expect(dashboard).toContain("première transition interne hors de");
    expect(dashboard).toContain("Ce n’est pas présenté comme un temps de réponse envoyé au client");
  });
});
