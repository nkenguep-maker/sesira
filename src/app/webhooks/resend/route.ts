import { NextResponse, type NextRequest } from "next/server";

import { createClaudeReplyClassifier } from "@/lib/ai/providers/claude";
import { ingestInboundReply } from "@/lib/email/webhook/ingest";
import { parseResendInbound } from "@/lib/email/webhook/parse-resend";
import { verifyResendWebhook } from "@/lib/email/webhook/verify";
import { serverEnv } from "@/lib/env";

/**
 * Resend inbound-email webhook endpoint.
 *
 * Contract:
 *   * Body is a JSON payload matching Resend's inbound webhook shape.
 *     The signature envelope is Svix (svix-id, svix-timestamp,
 *     svix-signature headers).
 *   * `RESEND_WEBHOOK_SECRET` must be provisioned; a missing secret
 *     refuses verification (fails closed → 503).
 *   * The route ACKs 200 for both `ACCEPTED` and `UNMATCHED` — Svix
 *     retries on 5xx, so a persistent 500 causes a queue; a 200 with
 *     `{ status: "unmatched" }` tells the provider the payload was
 *     accepted for reception even though no downstream action fired.
 *   * `REPLAY_MESSAGE` also returns 200 — the second delivery of the
 *     same event id is a no-op past the outbound match.
 *   * Malformed payloads or bad signatures return 400 — Svix will
 *     stop retrying and log the failure on their side.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<Response> {
  const signingSecret = serverEnv.RESEND_WEBHOOK_SECRET;
  if (!signingSecret) {
    return NextResponse.json(
      { status: "error", reason: "webhook_secret_missing" },
      { status: 503 },
    );
  }

  const bodyText = await request.text();
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  const verification = verifyResendWebhook({
    signingSecret,
    svixId,
    svixTimestamp,
    svixSignature,
    body: bodyText,
  });
  if (!verification.valid) {
    return NextResponse.json(
      { status: "error", reason: `signature: ${verification.reason}` },
      { status: 400 },
    );
  }

  let bodyJson: unknown;
  try {
    bodyJson = JSON.parse(bodyText) as unknown;
  } catch (err) {
    return NextResponse.json(
      { status: "error", reason: `body not JSON: ${(err as Error).message}` },
      { status: 400 },
    );
  }

  const parsed = parseResendInbound(bodyJson);
  if (!parsed.ok) {
    return NextResponse.json(
      { status: "error", reason: parsed.reason },
      { status: 400 },
    );
  }

  const classifier = serverEnv.ANTHROPIC_API_KEY
    ? createClaudeReplyClassifier({
        apiKey: serverEnv.ANTHROPIC_API_KEY,
        model: serverEnv.ANTHROPIC_MODEL,
      })
    : null;

  const result = await ingestInboundReply(parsed.envelope, { classifier });
  switch (result.status) {
    case "ACCEPTED":
      return NextResponse.json({
        status: "accepted",
        organization_id: result.organizationId,
        quote_id: result.quoteId,
        message_id: result.messageId,
        quote_transitioned: result.quoteTransitioned,
        attention_id: result.attentionId,
        classification: result.classification,
      });
    case "REPLAY_MESSAGE":
      return NextResponse.json({
        status: "replay",
        organization_id: result.organizationId,
        quote_id: result.quoteId,
        message_id: result.messageId,
      });
    case "UNMATCHED":
      return NextResponse.json({
        status: "unmatched",
        provider_event_id: result.providerEventId,
        in_reply_to: result.inReplyTo,
      });
    case "ERROR":
      return NextResponse.json(
        { status: "error", reason: result.reason },
        { status: 500 },
      );
  }
}
