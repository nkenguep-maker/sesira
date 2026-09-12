import "server-only";

import type { SmsProvider, SmsSendOutcome, SmsSendPayload } from "./provider";

/**
 * TestSmsProvider — deterministic HANDED_OFF for tests only.
 * Never wired in production. Records the payload in memory for
 * assertions.
 */
export class TestSmsProvider implements SmsProvider {
  readonly kind = "TEST" as const;
  readonly integrationId: string;
  readonly sent: SmsSendPayload[] = [];

  constructor(integrationId = "00000000-0000-4000-8000-000000000001") {
    this.integrationId = integrationId;
  }

  async send(payload: SmsSendPayload): Promise<SmsSendOutcome> {
    this.sent.push(payload);
    return {
      status: "HANDED_OFF",
      providerMessageId: `test_${payload.messageId}`,
      integrationId: this.integrationId,
    };
  }
}
