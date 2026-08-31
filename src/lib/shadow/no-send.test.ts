import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Structural invariant: no file under `src/lib/shadow/` may import a
 * module capable of triggering an external side effect (email provider,
 * HTTP send, webhook dispatch). Shadow Mode is a permanent no-send
 * mode; the safety of that claim is enforced here on the import graph
 * so a future refactor cannot silently open a send path.
 *
 * The list of forbidden module identifiers is deliberately conservative:
 * anything that could plausibly reach outbound I/O to a provider counts.
 * `@/lib/idempotency/store` IS allowed because it only performs internal
 * DB writes via already-audited RPCs.
 *
 * If a legitimate need to import something from this list ever arises,
 * add a targeted allowlist entry AND document the reasoning inline —
 * silently loosening this test defeats its purpose.
 */
const SHADOW_MODULE_DIR = join(__dirname);

const FORBIDDEN_IMPORT_PATTERNS: RegExp[] = [
  /@\/lib\/providers?\//,
  /@\/lib\/email\//,
  /@\/lib\/sms\//,
  /@\/lib\/webhook(s)?\//,
  /["']resend["']/,
  /["']@resend\//,
  /["']@sendgrid\//,
  /["']nodemailer["']/,
  /["']twilio["']/,
  /["']@mailgun\//,
  /["']postmark["']/,
  /assertExternalActionsEnabled/,
  /areExternalActionsEnabled/,
];

const FORBIDDEN_CALL_PATTERNS: RegExp[] = [
  /\bfetch\s*\(/,
  /new\s+Request\s*\(/,
  /\.request\s*\(/,
];

function collectTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const s = statSync(full);
    if (s.isDirectory()) {
      out.push(...collectTsFiles(full));
      continue;
    }
    if (![".ts", ".tsx"].includes(extname(name))) continue;
    if (name.endsWith(".test.ts") || name.endsWith(".test.tsx")) continue;
    out.push(full);
  }
  return out;
}

describe("src/lib/shadow — no-send import invariant", () => {
  const files = collectTsFiles(SHADOW_MODULE_DIR);

  it("finds shadow module files to audit", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)("%s does not import any provider/send module", (file) => {
    const source = readFileSync(file, "utf8");
    for (const pattern of FORBIDDEN_IMPORT_PATTERNS) {
      const match = source.match(pattern);
      expect(
        match,
        `${file} contains forbidden import matching ${pattern}. Shadow Mode must never reach a send boundary.`,
      ).toBeNull();
    }
  });

  it.each(files)("%s does not invoke a raw network primitive", (file) => {
    const source = readFileSync(file, "utf8");
    for (const pattern of FORBIDDEN_CALL_PATTERNS) {
      const match = source.match(pattern);
      expect(
        match,
        `${file} contains forbidden call matching ${pattern}. Shadow Mode must not perform network I/O directly.`,
      ).toBeNull();
    }
  });
});
