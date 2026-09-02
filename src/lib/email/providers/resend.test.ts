import { describe, expect, it, vi } from "vitest";

import type { EmailSendInput } from "@/lib/email/provider";

import { createResendProvider } from "./resend";

const BASE_INPUT: EmailSendInput = {
  to: "to@example.com",
  from: "from@example.com",
  subject: "Hello",
  text: "plain body",
};

function fakeResponse({
  status,
  body,
}: {
  status: number;
  body?: unknown;
}): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("createResendProvider", () => {
  it("rejects an empty api key at construction", () => {
    expect(() => createResendProvider("")).toThrow(RangeError);
  });

  it("returns SENT with the provider message id on 200", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      fakeResponse({ status: 200, body: { id: "resend_msg_abc" } }),
    );
    const provider = createResendProvider("key_abc", fetchImpl as unknown as typeof fetch);
    const result = await provider.send(BASE_INPUT);
    expect(result).toEqual({ status: "SENT", providerMessageId: "resend_msg_abc" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [, init] = fetchImpl.mock.calls[0];
    const body = JSON.parse(init.body as string);
    expect(body.to).toEqual(["to@example.com"]);
    expect(body.subject).toBe("Hello");
    // reply_to and html are omitted when not provided — do not send undefined
    expect(body).not.toHaveProperty("reply_to");
    expect(body).not.toHaveProperty("html");
  });

  it("forwards reply_to, html, headers when supplied", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      fakeResponse({ status: 200, body: { id: "id_1" } }),
    );
    const provider = createResendProvider("key", fetchImpl as unknown as typeof fetch);
    await provider.send({
      ...BASE_INPUT,
      replyTo: "reply@example.com",
      html: "<p>hi</p>",
      headers: { "X-Sesira-Trace": "quote_followup:abc:step:1" },
    });
    const body = JSON.parse(fetchImpl.mock.calls[0][1].body as string);
    expect(body.reply_to).toBe("reply@example.com");
    expect(body.html).toBe("<p>hi</p>");
    expect(body.headers).toEqual({ "X-Sesira-Trace": "quote_followup:abc:step:1" });
  });

  it("classifies HTTP 500 as TRANSIENT", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      fakeResponse({ status: 500, body: { message: "server_error" } }),
    );
    const provider = createResendProvider("key", fetchImpl as unknown as typeof fetch);
    const result = await provider.send(BASE_INPUT);
    expect(result).toMatchObject({ status: "FAILED", errorClass: "TRANSIENT" });
    expect((result as { errorMessage: string }).errorMessage).toContain("500");
    expect((result as { errorMessage: string }).errorMessage).toContain("server_error");
  });

  it("classifies HTTP 502/503/504 as TRANSIENT", async () => {
    for (const status of [502, 503, 504]) {
      const fetchImpl = vi.fn().mockResolvedValue(fakeResponse({ status }));
      const provider = createResendProvider("key", fetchImpl as unknown as typeof fetch);
      const result = await provider.send(BASE_INPUT);
      expect(result).toMatchObject({ status: "FAILED", errorClass: "TRANSIENT" });
    }
  });

  it("classifies HTTP 429 as TRANSIENT (rate limit)", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(fakeResponse({ status: 429 }));
    const provider = createResendProvider("key", fetchImpl as unknown as typeof fetch);
    const result = await provider.send(BASE_INPUT);
    expect(result).toMatchObject({ status: "FAILED", errorClass: "TRANSIENT" });
  });

  it("classifies HTTP 400/401/403/404/422 as PERMANENT", async () => {
    for (const status of [400, 401, 403, 404, 422]) {
      const fetchImpl = vi.fn().mockResolvedValue(
        fakeResponse({ status, body: { name: "invalid_request", message: "detail" } }),
      );
      const provider = createResendProvider("key", fetchImpl as unknown as typeof fetch);
      const result = await provider.send(BASE_INPUT);
      expect(result).toMatchObject({ status: "FAILED", errorClass: "PERMANENT" });
    }
  });

  it("classifies fetch network exception as TRANSIENT", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("ECONNRESET"));
    const provider = createResendProvider("key", fetchImpl as unknown as typeof fetch);
    const result = await provider.send(BASE_INPUT);
    expect(result).toMatchObject({ status: "FAILED", errorClass: "TRANSIENT" });
    expect((result as { errorMessage: string }).errorMessage).toContain("ECONNRESET");
  });

  it("classifies malformed success body (missing id) as PERMANENT", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      fakeResponse({ status: 200, body: { unrelated: true } }),
    );
    const provider = createResendProvider("key", fetchImpl as unknown as typeof fetch);
    const result = await provider.send(BASE_INPUT);
    expect(result).toMatchObject({ status: "FAILED", errorClass: "PERMANENT" });
    expect((result as { errorMessage: string }).errorMessage).toContain("missing id");
  });
});
