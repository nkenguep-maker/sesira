import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("C24 commercial core maturity gate", () => {
  it("keeps every external email effect behind the production kill switch", () => {
    const policy = source("src/lib/automation/external-actions.ts");
    const guard = source("src/lib/email/guard.ts");
    const send = source("src/lib/email/send.ts");

    expect(policy).toContain('configuredValue === "true" && deploymentEnvironment === "production"');
    expect(guard).toContain("assertGuardedEmailAllowed");
    expect(send.indexOf("assertGuardedEmailAllowed")).toBeLessThan(send.indexOf("provider.send"));
  });

  it("records outbound intent before touching the provider and collapses replays", () => {
    const send = source("src/lib/email/send.ts");
    expect(send.indexOf("recordOutboundMessageIntent")).toBeLessThan(send.indexOf("provider.send"));
    expect(send).toContain('status: "REPLAY"');
    expect(send).toContain("markOutboundMessageSent");
    expect(send).toContain("markOutboundMessageFailed");
  });

  it("uses the JWT role claim for service-role bypasses rather than session_user membership", () => {
    const correction = source("supabase/migrations/20260831000000_fix_idempotency_service_role_check.sql");
    expect(correction).toContain("(select auth.role()) = 'service_role'");
    const executable = correction.split("create or replace function public.insert_event_once")[1] ?? "";
    expect(executable).not.toContain("pg_has_role(session_user");
  });

  it("keeps retries bounded and permanent failures non-retriable", () => {
    const runner = source("src/lib/retry/runner.ts");
    expect(runner).toContain('category === "TRANSIENT" && canAttemptAgain');
    expect(runner).toContain('category === "PERMANENT"');
    expect(runner).toContain('status: "PERMANENT_FAILED"');
    expect(runner).toContain('status: "RETRY_EXHAUSTED"');
  });

  it("fails webhook verification closed and rejects stale signatures", () => {
    const verify = source("src/lib/email/webhook/verify.ts");
    expect(verify).toContain("signingSecret missing");
    expect(verify).toContain("MAX_TIMESTAMP_SKEW_SECONDS = 300");
    expect(verify).toContain("timingSafeEqual");
    expect(verify).toContain("outside acceptance window");
  });

  it("routes uncertain or sensitive AI classifications back to human Attention", () => {
    const classification = source("src/lib/ai/classify-reply.ts");
    expect(classification).toContain("REPLY_CLASSIFICATION_MIN_CONFIDENCE");
    expect(classification).toContain("LOW_AI_CONFIDENCE");
    expect(classification).toContain("OBJECTION_NEEDS_REVIEW");
    expect(classification).toContain("Aucun traitement automatique ne doit en dépendre");
  });

  it("keeps C22 measurement honest and C23 send readiness authoritative", () => {
    const speed = source("supabase/migrations/20260914000000_speed_to_lead.sql");
    const drafting = source("supabase/migrations/20260915000000_quote_drafting_and_reactivation.sql");
    expect(speed).toContain("FIRST_INTERNAL_HANDLING");
    expect(speed).toContain("does NOT claim a customer reply was sent");
    expect(drafting).toContain("cannot be sent before draft analysis");
    expect(drafting).toContain("cannot be sent with unresolved draft gaps");
    expect(drafting).toContain("q.opted_out_at is not null");
    expect(drafting).toContain("co.kind = 'COMPLAINT'");
  });

  it("keeps technical maturity separate from real-world and commercial validation", () => {
    const audit = source("docs/commercial-core-maturity-audit.md");
    expect(audit).toContain("COMMERCIAL_CORE_MATURE");
    expect(audit).toContain("REAL_WORLD_CALIBRATION = PENDING");
    expect(audit).toContain("COMMERCIAL_VALIDATION = PENDING");
    expect(audit).toContain("PRODUCTION_PROMOTION = LOCKED");
  });
});
