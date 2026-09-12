import "server-only";

/**
 * C44 — SmsProvider seam.
 *
 * Copy of the EmailProvider pattern (C9). Adapters send an SMS via
 * a real gateway (Twilio, Ovh, Sinch, …). PendingProductionSmsProvider
 * returns PROVIDER_UNAVAILABLE — never fakes a SENT return.
 *
 * Kill switch (C9 doctrine): adapters MUST verify
 * EXTERNAL_ACTIONS_ENABLED=true AND VERCEL_ENV=production before
 * calling any real gateway. TestSmsProvider is exempt.
 */

export interface SmsSendPayload {
  toPhone: string;
  bodyText: string;
  organizationId: string;
  messageId: string;
}

export type SmsSendOutcome =
  | { status: "HANDED_OFF"; providerMessageId: string; integrationId: string }
  | { status: "PROVIDER_UNAVAILABLE"; reason?: string }
  | { status: "ERROR"; errorClass: "TRANSIENT" | "PERMANENT"; reason: string };

export type SmsProviderKind = "TEST" | "PENDING_PRODUCTION" | "TWILIO" | "OVH" | "SINCH" | "OTHER";

export interface SmsProvider {
  readonly kind: SmsProviderKind;
  send(payload: SmsSendPayload): Promise<SmsSendOutcome>;
}
