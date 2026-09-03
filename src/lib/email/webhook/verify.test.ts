import { createHmac, randomBytes } from "node:crypto";

import { describe, expect, it } from "vitest";

import { verifyResendWebhook } from "./verify";

const SECRET_BYTES = randomBytes(24);
const SECRET_B64 = SECRET_BYTES.toString("base64");
const SECRET = `whsec_${SECRET_B64}`;
const NOW = new Date("2026-09-06T10:00:00.000Z");
const NOW_TIMESTAMP = Math.floor(NOW.getTime() / 1000).toString();

function sign(id: string, timestamp: string, body: string): string {
  const mac = createHmac("sha256", SECRET_BYTES).update(`${id}.${timestamp}.${body}`).digest("base64");
  return `v1,${mac}`;
}

describe("verifyResendWebhook", () => {
  const body = JSON.stringify({ type: "email.received", data: { email_id: "evt_1" } });
  const svixId = "msg_abc";

  it("accepts a valid signature within the timestamp window", () => {
    const signature = sign(svixId, NOW_TIMESTAMP, body);
    const result = verifyResendWebhook({
      signingSecret: SECRET,
      svixId,
      svixTimestamp: NOW_TIMESTAMP,
      svixSignature: signature,
      body,
      now: NOW,
    });
    expect(result).toEqual({ valid: true });
  });

  it("accepts the secret with or without the `whsec_` prefix", () => {
    const signature = sign(svixId, NOW_TIMESTAMP, body);
    const withPrefix = verifyResendWebhook({
      signingSecret: SECRET,
      svixId, svixTimestamp: NOW_TIMESTAMP, svixSignature: signature, body, now: NOW,
    });
    const bare = verifyResendWebhook({
      signingSecret: SECRET_B64,
      svixId, svixTimestamp: NOW_TIMESTAMP, svixSignature: signature, body, now: NOW,
    });
    expect(withPrefix.valid).toBe(true);
    expect(bare.valid).toBe(true);
  });

  it("rejects when signature is missing", () => {
    const result = verifyResendWebhook({
      signingSecret: SECRET,
      svixId, svixTimestamp: NOW_TIMESTAMP, svixSignature: null, body, now: NOW,
    });
    expect(result).toEqual({ valid: false, reason: expect.stringContaining("svix-signature") });
  });

  it("rejects when id header is missing", () => {
    const signature = sign(svixId, NOW_TIMESTAMP, body);
    const result = verifyResendWebhook({
      signingSecret: SECRET,
      svixId: null, svixTimestamp: NOW_TIMESTAMP, svixSignature: signature, body, now: NOW,
    });
    expect(result).toEqual({ valid: false, reason: expect.stringContaining("svix-id") });
  });

  it("rejects when timestamp is outside the 5-minute window", () => {
    const signature = sign(svixId, NOW_TIMESTAMP, body);
    const laterNow = new Date(NOW.getTime() + 6 * 60 * 1000);
    const result = verifyResendWebhook({
      signingSecret: SECRET,
      svixId, svixTimestamp: NOW_TIMESTAMP, svixSignature: signature, body, now: laterNow,
    });
    expect(result).toEqual({ valid: false, reason: expect.stringContaining("outside acceptance window") });
  });

  it("rejects a tampered body", () => {
    const signature = sign(svixId, NOW_TIMESTAMP, body);
    const tampered = body.replace("evt_1", "evt_hacked");
    const result = verifyResendWebhook({
      signingSecret: SECRET,
      svixId, svixTimestamp: NOW_TIMESTAMP, svixSignature: signature, body: tampered, now: NOW,
    });
    expect(result).toEqual({ valid: false, reason: expect.stringContaining("no presented signature matched") });
  });

  it("rejects when the secret is empty", () => {
    const signature = sign(svixId, NOW_TIMESTAMP, body);
    const result = verifyResendWebhook({
      signingSecret: "",
      svixId, svixTimestamp: NOW_TIMESTAMP, svixSignature: signature, body, now: NOW,
    });
    expect(result).toEqual({ valid: false, reason: expect.stringContaining("signingSecret missing") });
  });

  it("accepts multiple presented signatures if any matches", () => {
    const validSignature = sign(svixId, NOW_TIMESTAMP, body);
    const junk = `v1,${Buffer.from("not a real hmac").toString("base64")}`;
    const composite = `${junk} ${validSignature}`;
    const result = verifyResendWebhook({
      signingSecret: SECRET,
      svixId, svixTimestamp: NOW_TIMESTAMP, svixSignature: composite, body, now: NOW,
    });
    expect(result).toEqual({ valid: true });
  });

  it("rejects when svix-signature has no v1 tokens", () => {
    const result = verifyResendWebhook({
      signingSecret: SECRET,
      svixId, svixTimestamp: NOW_TIMESTAMP, svixSignature: "v0,abcd v2,efgh", body, now: NOW,
    });
    expect(result).toEqual({ valid: false, reason: expect.stringContaining("no v1 signature") });
  });
});
