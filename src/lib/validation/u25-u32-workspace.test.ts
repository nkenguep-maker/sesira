import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("U25-U32 operations and growth workspace", () => {
  it("keeps the dense navigation grouped instead of flattening new modules", () => {
    const nav = source("src/lib/navigation.ts");
    expect(nav).toContain('label: "Opérations"');
    expect(nav).toContain('label: "Croissance"');
    expect(nav).toContain('/app/interventions');
    expect(nav).toContain('/app/croissance/attribution');
    expect(nav).not.toMatch(/\{ href: "\/app\/interventions", label: "\d/);
  });

  it("does not expose a fake field-report send control", () => {
    const page = source("src/app/app/rapports/page.tsx");
    const actions = source("src/app/app/c32-actions.ts");
    expect(page).toContain("Preuve d’envoi séparée");
    expect(page).toContain("Aucun envoi n’est déclenché depuis cette page");
    expect(actions).toContain('["REVIEWED", "APPROVED"]');
    expect(actions).not.toContain('nextStatus === "SENT"');
  });

  it("requires provider proof before a publication is shown as confirmed", () => {
    const page = source("src/app/app/croissance/contenus/page.tsx");
    expect(page).toContain('publication.status === "PUBLISHED" && Boolean(publication.externalRef)');
    expect(page).toContain("Publication provider requise");
    expect(page).not.toContain("Publier maintenant");
  });

  it("separates observed estimated and unknown attribution", () => {
    const page = source("src/app/app/croissance/attribution/page.tsx");
    expect(page).toContain('row.confidence === "OBSERVED"');
    expect(page).toContain('row.confidence === "ESTIMATED"');
    expect(page).toContain('row.confidence === "UNKNOWN"');
    expect(page).toContain("ne fusionne jamais OBSERVÉ, ESTIMÉ et INCONNU");
  });

  it("keeps financial and maintenance decisions human", () => {
    const invoices = source("src/app/app/factures/page.tsx");
    const maintenance = source("src/app/app/maintenance/page.tsx");
    expect(invoices).toContain("Décision financière humaine");
    expect(invoices).toContain("ne change ni le montant");
    expect(maintenance).toContain("ne renouvelle pas un contrat");
    expect(maintenance).toContain("ne change pas son prix");
  });

  it("models payment promises and disputes without a universal age escalation", () => {
    const migration = source("supabase/migrations/20260926130000_invoice_collection_states.sql");
    const page = source("src/app/app/factures/page.tsx");
    expect(migration).toContain("PROMISE_TO_PAY");
    expect(migration).toContain("DISPUTED");
    expect(migration).toContain("record_invoice_payment_promise");
    expect(migration).toContain("open_invoice_dispute");
    expect(migration).toContain("resolve_invoice_dispute");
    expect(migration).toContain("No universal age threshold chooses the business escalation");
    expect(page).not.toContain("60 jours");
    expect(page).toContain("La prochaine décision reste humaine");
  });

  it("hardens C25-C32 lifecycle transitions and provider-confirmed terminal states", () => {
    const migration = source("supabase/migrations/20260926120000_c25_c32_state_and_provider_truth_hardening.sql");
    expect(migration).toContain("require_rpc_managed_status_transition");
    expect(migration).toContain("unresolved report gaps");
    expect(migration).toContain("record_field_report_delivery");
    expect(migration).toContain("service_role provider boundary required");
    expect(migration).toContain("mark_publication_published");
    expect(migration).toContain("revoke all on function public.mark_publication_published(uuid, uuid, uuid, text) from public, anon, authenticated");
  });

  it("keeps read failures distinct from empty workspaces", () => {
    const data = source("src/lib/data/c32-workspaces.ts");
    expect(data).toContain('status: "ERROR"');
    expect(data).toContain('status: "OK"');
    expect(data).toContain("if (error) return { status: \"ERROR\"");
  });
});
