import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("post-C40 product truth", () => {
  it("keeps Growth on real organization workspaces and removes the old demo repository", () => {
    const overview = source("src/app/app/croissance/page.tsx");
    const content = source("src/app/app/croissance/contenus/page.tsx");
    const conversations = source("src/app/app/croissance/conversations/page.tsx");
    const attribution = source("src/app/app/croissance/attribution/page.tsx");

    expect(overview).toContain("@/lib/data/c32-workspaces");
    expect(content).toContain("@/lib/data/c32-workspaces");
    expect(conversations).toContain("@/lib/data/c32-workspaces");
    expect(attribution).toContain("@/lib/data/attribution-report");
    expect(existsSync(join(process.cwd(), "src/lib/growth/demo-repository.ts"))).toBe(false);
    expect(existsSync(join(process.cwd(), "src/lib/growth/viewer-repository.ts"))).toBe(false);
  });

  it("requires an explicit Voice retention and opt-out choice before the first saved policy", () => {
    const calls = source("src/app/app/appels/page.tsx");

    expect(calls).not.toContain("policy?.retentionRecordingDays ?? 30");
    expect(calls).not.toContain("policy?.retentionTranscriptDays ?? 30");
    expect(calls).toContain('defaultValue={policy?.retentionRecordingDays ?? ""}');
    expect(calls).toContain('defaultValue={policy?.retentionTranscriptDays ?? ""}');
    expect(calls).toContain('defaultValue={policy?.optOutBehavior ?? ""}');
    expect(calls).toContain("Choisir le comportement");
  });

  it("documents the server variables already consumed by email, webhook and AI runtime", () => {
    const example = source(".env.example");

    for (const variable of [
      "RESEND_API_KEY=",
      "EMAIL_FROM=",
      "EMAIL_REPLY_TO=",
      "RESEND_WEBHOOK_SECRET=",
      "ANTHROPIC_API_KEY=",
      "ANTHROPIC_MODEL=",
    ]) {
      expect(example).toContain(variable);
    }
  });
});
