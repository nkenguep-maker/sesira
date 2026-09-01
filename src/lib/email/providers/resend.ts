import "server-only";

import type {
  EmailProvider,
  EmailSendInput,
  EmailSendResult,
} from "@/lib/email/provider";

const RESEND_API_URL = "https://api.resend.com/emails";

interface ResendSuccessBody {
  id?: unknown;
}

interface ResendErrorBody {
  name?: unknown;
  message?: unknown;
}

/**
 * Resend adapter. Uses `fetch` directly to keep the surface small and
 * avoid pulling a provider SDK for one API call. Error classification:
 *
 *   * `TRANSIENT` — network exception, HTTP 5xx, HTTP 429.
 *   * `PERMANENT` — HTTP 4xx (invalid recipient, revoked API key,
 *     missing domain verification).
 *
 * The Resend response body's `id` is the stable provider message id
 * used by the delivery-receipt webhook (`providerDeliveryKey`).
 */
export function createResendProvider(apiKey: string, fetchImpl: typeof fetch = fetch): EmailProvider {
  if (typeof apiKey !== "string" || apiKey.length === 0) {
    throw new RangeError("createResendProvider: apiKey is required");
  }
  return {
    name: "resend",
    async send(input: EmailSendInput): Promise<EmailSendResult> {
      const payload: Record<string, unknown> = {
        from: input.from,
        to: [input.to],
        subject: input.subject,
        text: input.text,
      };
      if (input.replyTo !== undefined) payload.reply_to = input.replyTo;
      if (input.html !== undefined) payload.html = input.html;
      if (input.headers !== undefined) payload.headers = input.headers;

      let response: Response;
      try {
        response = await fetchImpl(RESEND_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        return {
          status: "FAILED",
          errorClass: "TRANSIENT",
          errorMessage: `resend: network error — ${(err as Error).message}`,
        };
      }

      if (response.status >= 500 || response.status === 429) {
        const detail = await safeReadErrorBody(response);
        return {
          status: "FAILED",
          errorClass: "TRANSIENT",
          errorMessage: `resend: HTTP ${response.status}${detail ? ` — ${detail}` : ""}`,
        };
      }

      if (response.status >= 400) {
        const detail = await safeReadErrorBody(response);
        return {
          status: "FAILED",
          errorClass: "PERMANENT",
          errorMessage: `resend: HTTP ${response.status}${detail ? ` — ${detail}` : ""}`,
        };
      }

      let body: ResendSuccessBody;
      try {
        body = (await response.json()) as ResendSuccessBody;
      } catch (err) {
        return {
          status: "FAILED",
          errorClass: "PERMANENT",
          errorMessage: `resend: malformed success body — ${(err as Error).message}`,
        };
      }
      if (typeof body.id !== "string" || body.id.length === 0) {
        return {
          status: "FAILED",
          errorClass: "PERMANENT",
          errorMessage: "resend: success body missing id",
        };
      }
      return { status: "SENT", providerMessageId: body.id };
    },
  };
}

async function safeReadErrorBody(response: Response): Promise<string | null> {
  try {
    const parsed = (await response.json()) as ResendErrorBody;
    if (typeof parsed.message === "string" && parsed.message.length > 0) {
      return parsed.message.slice(0, 500);
    }
    if (typeof parsed.name === "string" && parsed.name.length > 0) {
      return parsed.name.slice(0, 200);
    }
    return null;
  } catch {
    return null;
  }
}
