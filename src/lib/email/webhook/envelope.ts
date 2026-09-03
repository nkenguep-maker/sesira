import "server-only";

/**
 * Provider-neutral inbound reply envelope. Every provider parser
 * (Resend, Sendgrid Inbound Parse, Postmark Inbound, ...) normalizes
 * the raw webhook body into this shape before handing it to the
 * ingest orchestrator. Downstream code MUST NOT read provider-specific
 * fields — it only sees this envelope.
 *
 * Fields:
 *   * `providerEventId`: stable event id from the provider (their
 *     webhook payload's canonical dedup key). Used for the outer
 *     provider-delivery-receipt dedup AND to derive the message
 *     idempotency key.
 *   * `messageId`: RFC 5322 Message-ID of the inbound email.
 *   * `inReplyTo`: RFC 5322 In-Reply-To header. Normalized (angle
 *     brackets stripped). Used to match against
 *     `outbound_messages.provider_message_id`.
 *   * `references`: RFC 5322 References chain (ordered, normalized).
 *   * `from` / `to`: RFC 5322 addresses (bare form, no display name).
 *   * `raw`: full provider payload for audit and future re-parsing.
 */
export interface InboundReplyEnvelope {
  provider: string;
  providerEventId: string;
  messageId: string;
  inReplyTo: string | null;
  references: string[];
  from: string;
  to: string[];
  subject: string;
  text: string;
  html: string | null;
  receivedAt: Date;
  raw: Record<string, unknown>;
}

/**
 * Strip angle brackets and whitespace from a RFC 5322 Message-ID
 * value. Providers vary in whether they include the `<…>` — our
 * comparison against `outbound_messages.provider_message_id` uses
 * the bare form.
 */
export function normalizeMessageId(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.startsWith("<") && trimmed.endsWith(">")) {
    return trimmed.slice(1, -1).trim() || null;
  }
  return trimmed;
}

/**
 * Split a References header (whitespace-separated tokens, each
 * bracketed) into an ordered list of bare Message-IDs.
 */
export function normalizeReferences(value: string | null | undefined): string[] {
  if (typeof value !== "string") return [];
  return value
    .split(/\s+/)
    .map((token) => normalizeMessageId(token))
    .filter((id): id is string => id !== null);
}
