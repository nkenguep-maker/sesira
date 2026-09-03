import "server-only";

import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  assertGuardedEmailAllowed,
  type GuardedEmailPolicy,
} from "@/lib/email/guard";
import type { EmailProvider } from "@/lib/email/provider";
import {
  markOutboundMessageFailed,
  markOutboundMessageSent,
  recordOutboundMessageIntent,
} from "@/lib/idempotency/store";
import type { Database } from "@/types/database";

export type SendGuardedEmailInput = {
  organizationId: string;
  integrationId: string | null;
  provider: EmailProvider;
  to: string;
  from: string;
  replyTo?: string;
  subject: string;
  text: string;
  html?: string;
  headers?: Record<string, string>;
  idempotencyKey: string;
  /**
   * Optional guard override — used by tests and by future higher-level
   * orchestrators that want to short-circuit without touching env vars.
   * Production callers should not pass this; the default resolves the
   * live process environment at the boundary.
   */
  policy?: GuardedEmailPolicy;
  /** Reuse the caller-owned Supabase client across the whole transaction seam. */
  client?: SupabaseClient<Database>;
};

export type SendGuardedEmailResult =
  | {
      status: "SENT";
      messageId: string;
      providerMessageId: string;
    }
  | {
      status: "REPLAY";
      messageId: string;
    }
  | {
      status: "FAILED";
      messageId: string;
      errorClass: "TRANSIENT" | "PERMANENT";
      errorMessage: string;
    };

/**
 * The one and only outbound email boundary. Flow:
 *
 *   1. `assertGuardedEmailAllowed` — throws GuardedEmailDisabledError
 *      when the kill switch is off. NOTHING downstream runs.
 *   2. `record_outbound_message_intent` — insert-once by
 *      (organization_id, idempotency_key). On replay
 *      (`created=false`), we short-circuit with a REPLAY result and
 *      NEVER hit the provider a second time.
 *   3. `provider.send(...)` — adapter classifies errors as TRANSIENT
 *      vs PERMANENT and never throws for provider-observable errors.
 *   4. `mark_outbound_message_sent` or `mark_outbound_message_failed`
 *      closes the row. The caller receives a structured result.
 *
 * The caller MUST pass an `idempotencyKey` built via
 * `outboundMessageIntentKey`. Bypassing the key builder silently
 * defeats replay safety.
 */
export async function sendGuardedEmail(
  input: SendGuardedEmailInput,
): Promise<SendGuardedEmailResult> {
  assertGuardedEmailAllowed(input.policy);

  const bodyHash = computeBodyHash(input.text, input.html);
  const intent = await recordOutboundMessageIntent({
    organizationId: input.organizationId,
    idempotencyKey: input.idempotencyKey,
    integrationId: input.integrationId,
    providerName: input.provider.name,
    channel: "email",
    toEmail: input.to,
    fromEmail: input.from,
    replyTo: input.replyTo ?? null,
    subject: input.subject,
    bodyHash,
    client: input.client,
  });
  if (!intent.created) {
    return { status: "REPLAY", messageId: intent.id };
  }

  const result = await input.provider.send({
    to: input.to,
    from: input.from,
    replyTo: input.replyTo,
    subject: input.subject,
    text: input.text,
    html: input.html,
    headers: input.headers,
  });

  if (result.status === "SENT") {
    await markOutboundMessageSent({
      organizationId: input.organizationId,
      messageId: intent.id,
      providerMessageId: result.providerMessageId,
      client: input.client,
    });
    return {
      status: "SENT",
      messageId: intent.id,
      providerMessageId: result.providerMessageId,
    };
  }

  await markOutboundMessageFailed({
    organizationId: input.organizationId,
    messageId: intent.id,
    errorClass: result.errorClass,
    errorMessage: result.errorMessage,
    client: input.client,
  });
  return {
    status: "FAILED",
    messageId: intent.id,
    errorClass: result.errorClass,
    errorMessage: result.errorMessage,
  };
}

function computeBodyHash(text: string, html?: string): string {
  const hash = createHash("sha256");
  hash.update(text);
  if (html !== undefined) hash.update(html);
  return hash.digest("hex");
}
