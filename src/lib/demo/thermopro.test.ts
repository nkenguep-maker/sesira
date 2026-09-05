import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string) { return readFileSync(join(process.cwd(), path), "utf8"); }

describe("isolated THERMOPRO demo", () => {
  it("keeps all demo navigation under /demo", () => {
    const shell = source("src/components/sesira/demo-shell.tsx");
    expect(shell).toContain('href="/"');
    expect(shell).not.toContain('href="/app');
    expect(shell).toContain("/demo/relances");
    expect(shell).toContain("/demo/automatisations");
  });

  it("shows concrete cross-tool scenarios instead of a static dashboard", () => {
    const center = source("src/components/sesira/demo-command-center.tsx");
    const stories = source("src/lib/demo/stories.ts");
    expect(center).toContain("Suivez un dossier à travers SESIRA");
    expect(center).toContain("Simuler la validation");
    expect(stories).toContain("Devis sans réponse");
    expect(stories).toContain("Promesse de paiement");
    expect(stories).toContain("Rapport terrain");
  });

  it("loads demo communications from the isolated tenant", () => {
    const data = source("src/lib/demo/communications.ts");
    expect(data).toContain("DEMO_ORGANIZATION_ID");
    expect(data).toContain("demo_story_v2");
    expect(data).toContain('.from("messages")');
  });

  it("keeps the durable demo outbound guard", () => {
    const boundary = source("supabase/migrations/20260905055710_block_demo_outbound_messages.sql");
    expect(boundary).toContain("external actions are disabled for demo organizations");
    expect(boundary).toContain("feature_flags ->> 'demo_mode'");
  });
});
