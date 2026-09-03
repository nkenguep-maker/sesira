import "server-only";

/**
 * Provider-neutral outbound message shape. The caller (`sendGuardedEmail`)
 * hands this to a chosen adapter after the intent has been recorded.
 */
export type EmailSendInput = {
  to: string;
  from: string;
  replyTo?: string;
  subject: string;
  text: string;
  html?: string;
  headers?: Record<string, string>;
};

export type EmailSendSuccess = {
  status: "SENT";
  providerMessageId: string;
};

export type EmailSendFailure = {
  status: "FAILED";
  errorClass: "TRANSIENT" | "PERMANENT";
  errorMessage: string;
};

export type EmailSendResult = EmailSendSuccess | EmailSendFailure;

/**
 * Every provider adapter (Resend, SendGrid, Postmark, ...) implements
 * this interface. Adapters MUST:
 *   * never throw for provider-observable errors — return a FAILED
 *     result with a classification instead so the boundary can persist
 *     the failure and let the retry runner decide;
 *   * classify 5xx / network / rate-limit (429) as TRANSIENT;
 *   * classify 4xx (except 429) as PERMANENT;
 *   * return a stable `providerMessageId` on success — the callback
 *     webhook will key delivery receipts on it.
 */
export interface EmailProvider {
  readonly name: string;
  send(input: EmailSendInput): Promise<EmailSendResult>;
}
