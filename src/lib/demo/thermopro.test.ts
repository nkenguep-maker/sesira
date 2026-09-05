import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("THERMOPRO demo workspace", () => {
  it("labels fictional data clearly in the product shell and dashboard", () => {
    const shell = source("src/components/sesira/app-shell.tsx");
    const dashboard = source("src/app/app/page.tsx");

    expect(shell).toContain("MODE DÉMO · DONNÉES FICTIVES");
    expect(dashboard).toContain("Chaque nom, montant et situation de cet espace est fictif");
    expect(dashboard).toContain("Bonjour Marc.");
  });

  it("selects workspaces only from active memberships", () => {
    const viewer = source("src/lib/auth/viewer.ts");
    const action = source("src/app/app/organization-actions.ts");

    expect(viewer).toContain('.eq("status", "ACTIVE")');
    expect(viewer).toContain('cookieStore.get("sesira_organization")');
    expect(action).toContain('.eq("organization_id", organizationId)');
    expect(action).toContain('.eq("user_id", userId)');
    expect(action).toContain('.eq("status", "ACTIVE")');
  });

  it("never sends an external follow-up from a demo workspace", () => {
    const approval = source("src/app/app/suivi/actions.ts");
    const boundary = source("supabase/migrations/20260905055710_block_demo_outbound_messages.sql");

    expect(approval).toContain("viewer.organization.demoMode");
    expect(approval.indexOf("viewer.organization.demoMode")).toBeLessThan(
      approval.indexOf("const dispatched = await dispatchApprovedFollowup"),
    );
    expect(boundary).toContain("external actions are disabled for demo organizations");
    expect(boundary).toContain("feature_flags ->> 'demo_mode'");
    expect(boundary).toContain("config ->> 'demo_data'");
  });

  it("derives headline demo metrics from tenant data instead of hard-coded numbers", () => {
    const metrics = source("src/lib/demo/dashboard.ts");
    expect(metrics).toContain('.from("quotes")');
    expect(metrics).toContain('.from("interventions")');
    expect(metrics).toContain('.from("invoices")');
    expect(metrics).toContain('.contains("metadata", { demo_today: true })');
  });

  it("uses a fictional team roster instead of exposing the presenter account", () => {
    const teamPage = source("src/app/app/equipe/page.tsx");
    const demoTeam = source("src/lib/demo/team.ts");

    expect(teamPage).toContain("viewer.organization.demoMode");
    expect(teamPage).toContain("getDemoTeamMembers");
    expect(demoTeam).toContain("config.demo_team");
    expect(demoTeam).not.toContain("auth.users");
  });
});
