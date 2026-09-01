import { describe, expect, it } from "vitest";

import { parseResendInbound } from "./parse-resend";

const BASE = {
  type: "email.received",
  created_at: "2026-09-06T10:00:00Z",
  data: {
    email_id: "evt_abc",
    from: "customer@example.com",
    to: ["quotes@sesira.example"],
    subject: "Re: Devis",
    text: "Merci pour le devis",
    html: "<p>Merci pour le devis</p>",
    headers: {
      "Message-ID": "<inbound-abc@example.com>",
      "In-Reply-To": "<outbound-xyz@resend.dev>",
      References: "<outbound-abc@resend.dev> <outbound-xyz@resend.dev>",
    },
    received_at: "2026-09-06T09:59:30Z",
  },
};

describe("parseResendInbound", () => {
  it("parses a well-formed payload into a normalized envelope", () => {
    const result = parseResendInbound(BASE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.envelope).toMatchObject({
      provider: "resend",
      providerEventId: "evt_abc",
      messageId: "inbound-abc@example.com",
      inReplyTo: "outbound-xyz@resend.dev",
      references: ["outbound-abc@resend.dev", "outbound-xyz@resend.dev"],
      from: "customer@example.com",
      to: ["quotes@sesira.example"],
      subject: "Re: Devis",
      text: "Merci pour le devis",
      html: "<p>Merci pour le devis</p>",
    });
    expect(result.envelope.receivedAt).toEqual(new Date("2026-09-06T09:59:30Z"));
  });

  it("also accepts type `email.inbound`", () => {
    const result = parseResendInbound({ ...BASE, type: "email.inbound" });
    expect(result.ok).toBe(true);
  });

  it("rejects unknown type", () => {
    const result = parseResendInbound({ ...BASE, type: "email.delivered" });
    expect(result).toEqual({ ok: false, reason: expect.stringContaining("unsupported event type") });
  });

  it("rejects non-object body", () => {
    expect(parseResendInbound(null)).toEqual({ ok: false, reason: expect.stringContaining("not a JSON object") });
    expect(parseResendInbound("string")).toEqual({ ok: false, reason: expect.stringContaining("not a JSON object") });
    expect(parseResendInbound([])).toEqual({ ok: false, reason: expect.stringContaining("not a JSON object") });
  });

  it("rejects missing data", () => {
    const result = parseResendInbound({ type: "email.received" });
    expect(result).toEqual({ ok: false, reason: expect.stringContaining("missing data") });
  });

  it("rejects missing email_id", () => {
    const result = parseResendInbound({ ...BASE, data: { ...BASE.data, email_id: undefined } });
    expect(result).toEqual({ ok: false, reason: expect.stringContaining("missing data.email_id") });
  });

  it("rejects missing from", () => {
    const result = parseResendInbound({ ...BASE, data: { ...BASE.data, from: undefined } });
    expect(result).toEqual({ ok: false, reason: expect.stringContaining("missing data.from") });
  });

  it("accepts `to` as a bare string", () => {
    const result = parseResendInbound({ ...BASE, data: { ...BASE.data, to: "quotes@sesira.example" } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.envelope.to).toEqual(["quotes@sesira.example"]);
  });

  it("falls back messageId to email_id when Message-ID header missing", () => {
    const result = parseResendInbound({
      ...BASE,
      data: { ...BASE.data, headers: { "In-Reply-To": "<outbound-xyz@resend.dev>" } },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.envelope.messageId).toBe("evt_abc");
  });

  it("returns inReplyTo=null when header missing", () => {
    const result = parseResendInbound({ ...BASE, data: { ...BASE.data, headers: {} } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.envelope.inReplyTo).toBeNull();
    expect(result.envelope.references).toEqual([]);
  });

  it("normalizes headers case-insensitively", () => {
    const result = parseResendInbound({
      ...BASE,
      data: { ...BASE.data, headers: { "in-reply-to": "<lower-xyz@resend.dev>" } },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.envelope.inReplyTo).toBe("lower-xyz@resend.dev");
  });

  it("rejects invalid received_at", () => {
    const result = parseResendInbound({ ...BASE, data: { ...BASE.data, received_at: "not a date" } });
    expect(result).toEqual({ ok: false, reason: expect.stringContaining("invalid received_at") });
  });
});
