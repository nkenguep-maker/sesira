import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Svix-style HMAC signature verification. Resend webhooks are signed
 * via Svix; the same scheme works for any provider that follows the
 * Svix convention (svix-id, svix-timestamp, svix-signature).
 *
 * Signature format is `v1,<base64>` (possibly multiple space-separated
 * versions). We accept the payload as verified iff ANY presented
 * signature matches the HMAC of `id.timestamp.body` computed with the
 * (base64-decoded) secret.
 *
 * The signing secret must be provisioned as `RESEND_WEBHOOK_SECRET`
 * in the environment; a missing secret refuses verification (fails
 * closed).
 *
 * We also enforce a 5-minute window on the timestamp to reject replay
 * attempts. The window is generous to accommodate clock skew on
 * managed infra; tighter values are safe but pointless without a
 * proof-of-freshness protocol.
 */

export interface VerifyResendWebhookInput {
  signingSecret: string;
  svixId: string | null;
  svixTimestamp: string | null;
  svixSignature: string | null;
  body: string;
  now?: Date;
}

export type VerifyResendWebhookResult =
  | { valid: true }
  | { valid: false; reason: string };

const MAX_TIMESTAMP_SKEW_SECONDS = 300;
const SVIX_SECRET_PREFIX = "whsec_";

export function verifyResendWebhook(input: VerifyResendWebhookInput): VerifyResendWebhookResult {
  if (typeof input.signingSecret !== "string" || input.signingSecret.length === 0) {
    return { valid: false, reason: "signingSecret missing" };
  }
  if (typeof input.svixId !== "string" || input.svixId.length === 0) {
    return { valid: false, reason: "svix-id header missing" };
  }
  if (typeof input.svixTimestamp !== "string" || input.svixTimestamp.length === 0) {
    return { valid: false, reason: "svix-timestamp header missing" };
  }
  if (typeof input.svixSignature !== "string" || input.svixSignature.length === 0) {
    return { valid: false, reason: "svix-signature header missing" };
  }

  const timestampSeconds = Number.parseInt(input.svixTimestamp, 10);
  if (!Number.isFinite(timestampSeconds)) {
    return { valid: false, reason: "svix-timestamp not numeric" };
  }
  const nowSeconds = Math.floor((input.now ?? new Date()).getTime() / 1000);
  const skew = Math.abs(nowSeconds - timestampSeconds);
  if (skew > MAX_TIMESTAMP_SKEW_SECONDS) {
    return { valid: false, reason: `svix-timestamp outside acceptance window (${skew}s > ${MAX_TIMESTAMP_SKEW_SECONDS}s)` };
  }

  let secretBytes: Buffer;
  try {
    const rawSecret = input.signingSecret.startsWith(SVIX_SECRET_PREFIX)
      ? input.signingSecret.slice(SVIX_SECRET_PREFIX.length)
      : input.signingSecret;
    secretBytes = Buffer.from(rawSecret, "base64");
    if (secretBytes.length === 0) throw new Error("empty secret bytes");
  } catch (err) {
    return { valid: false, reason: `signingSecret base64 decode failed: ${(err as Error).message}` };
  }

  const signedPayload = `${input.svixId}.${input.svixTimestamp}.${input.body}`;
  const expected = createHmac("sha256", secretBytes).update(signedPayload, "utf8").digest();

  const presented = input.svixSignature
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.startsWith("v1,"))
    .map((token) => token.slice("v1,".length));

  if (presented.length === 0) {
    return { valid: false, reason: "no v1 signature in svix-signature header" };
  }

  for (const candidate of presented) {
    let candidateBytes: Buffer;
    try {
      candidateBytes = Buffer.from(candidate, "base64");
    } catch {
      continue;
    }
    if (candidateBytes.length !== expected.length) continue;
    if (timingSafeEqual(candidateBytes, expected)) return { valid: true };
  }

  return { valid: false, reason: "no presented signature matched" };
}
