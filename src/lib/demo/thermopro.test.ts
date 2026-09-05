import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) { return readFileSync(join(process.cwd(), path), "utf8"); }

describe("THERMOPRO isolated demo", () => {
  it("lives under /demo with its own shell", () => {
    const shell = source("src/components/sesira/demo-shell.tsx");
    const layout = source("src/app/demo/layout.tsx");
    expect(layout).toContain("DemoShell");
    expect(shell).toContain("MODE DÉMO · DONNÉES FICTIVES");
    expect(shell).toContain('"/demo/clients"');
    expect(shell).not.toContain('href="/app');
  });

  it("uses a fixed isolated tenant instead of changing the real viewer context", () => {
    const context = source("src/lib/demo/context.ts");
    expect(context).toContain('DEMO_ORGANIZATION_ID = "10000000-0000-4000-8000-000000000001"');
    expect(context).toContain('.eq("status", "ACTIVE")');
    expect(context).toContain("flags.demo_mode !== true");
  });

  it("derives dashboard metrics from tenant data", () => {
    const metrics = source("src/lib/demo/dashboard.ts");
    expect(metrics).toContain('.from("quotes")');
    expect(metrics).toContain('.from("interventions")');
    expect(metrics).toContain('.from("invoices")');
  });

  it("keeps the demo read only and blocks external outbound intent", () => {
    const page = source("src/app/demo/page.tsx");
    const boundary = source("supabase/migrations/20260905055710_block_demo_outbound_messages.sql");
    expect(page).toContain("Lecture seule");
    expect(boundary).toContain("external actions are disabled for demo organizations");
    expect(boundary).toContain("feature_flags ->> 'demo_mode'");
  });

  it("uses only a fictional team roster", () => {
    const team = source("src/lib/demo/team.ts");
    expect(team).toContain("config.demo_team");
    expect(team).not.toContain("auth.users");
  });
});
