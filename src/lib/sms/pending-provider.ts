import "server-only";

import type { SmsProvider, SmsSendOutcome, SmsSendPayload } from "./provider";

/**
 * PendingProductionSmsProvider — default in production until a real
 * SMS gateway is configured. Never fakes SENT. Returns
 * PROVIDER_UNAVAILABLE so the caller can leave the outbound_messages
 * row in QUEUED and try again later without corrupting the audit trail.
 */
export class PendingProductionSmsProvider implements SmsProvider {
  readonly kind = "PENDING_PRODUCTION" as const;

  async send(_payload: SmsSendPayload): Promise<SmsSendOutcome> {
    return {
      status: "PROVIDER_UNAVAILABLE",
      reason: "No SMS provider configured for this environment",
    };
  }
}
