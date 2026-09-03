import "server-only";

import {
  type InboundReplyEnvelope,
  normalizeMessageId,
  normalizeReferences,
} from "@/lib/email/webhook/envelope";

/**
 * Resend inbound-email webhook shape. Documented at
 * https://resend.com/docs (Inbound Emails). This parser accepts an
 * `unknown` body and returns a fully-typed envelope OR a structured
 * error. It NEVER throws — the route handler decides how to respond
 * to a malformed payload (typically 400 + no side effect).
 *
 * The parser intentionally reads a MINIMAL surface. Anything the
 * ingest pipeline does not consult (SPF/DKIM verdicts, spam scores,
 * message parts array, attachments) is captured in `raw` for audit
 * but not exposed as a typed field.
 */

export interface ResendInboundEnvelope {
  type?: unknown;
  created_at?: unknown;
  data?: unknown;
}

export interface ResendInboundEmailData {
  email_id?: unknown;
  from?: unknown;
  to?: unknown;
  subject?: unknown;
  text?: unknown;
  html?: unknown;
  headers?: unknown;
  received_at?: unknown;
}

export type ParseResendInboundResult =
  | { ok: true; envelope: InboundReplyEnvelope }
  | { ok: false; reason: string };

export function parseResendInbound(rawBody: unknown): ParseResendInboundResult {
  if (!isPlainObject(rawBody)) return { ok: false, reason: "body is not a JSON object" };

  const envelope = rawBody as ResendInboundEnvelope;
  if (envelope.type !== "email.received" && envelope.type !== "email.inbound") {
    return { ok: false, reason: `unsupported event type: ${String(envelope.type)}` };
  }
  if (!isPlainObject(envelope.data)) {
    return { ok: false, reason: "missing data object" };
  }

  const data = envelope.data as ResendInboundEmailData;

  const providerEventId = asNonEmptyString(data.email_id);
  if (!providerEventId) return { ok: false, reason: "missing data.email_id" };

  const from = asNonEmptyString(data.from);
  if (!from) return { ok: false, reason: "missing data.from" };

  const to = asStringArray(data.to);
  if (to.length === 0) return { ok: false, reason: "missing data.to" };

  const subject = asString(data.subject) ?? "";
  const text = asString(data.text) ?? "";
  const html = asString(data.html);

  const headers = isPlainObject(data.headers) ? (data.headers as Record<string, unknown>) : {};
  const headerLookup = buildCaseInsensitiveHeaderLookup(headers);
  const messageId = normalizeMessageId(asString(headerLookup["message-id"]))
    ?? providerEventId;
  const inReplyTo = normalizeMessageId(asString(headerLookup["in-reply-to"]));
  const references = normalizeReferences(asString(headerLookup["references"]));

  const receivedAtRaw = asString(data.received_at);
  const receivedAt = receivedAtRaw ? new Date(receivedAtRaw) : new Date();
  if (Number.isNaN(receivedAt.getTime())) {
    return { ok: false, reason: `invalid received_at: ${receivedAtRaw}` };
  }

  return {
    ok: true,
    envelope: {
      provider: "resend",
      providerEventId,
      messageId,
      inReplyTo,
      references,
      from,
      to,
      subject,
      text,
      html,
      receivedAt,
      raw: rawBody as Record<string, unknown>,
    },
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.length > 0);
  }
  if (typeof value === "string" && value.length > 0) return [value];
  return [];
}

function buildCaseInsensitiveHeaderLookup(headers: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(headers)) {
    out[key.toLowerCase()] = value;
  }
  return out;
}
