import { describe, expect, it, vi } from "vitest";

import { createClaudeReplyClassifier } from "./claude";

function claudeSuccess(input: unknown) {
  return new Response(
    JSON.stringify({
      content: [
        { type: "text", text: "ignored" },
        {
          type: "tool_use",
          name: "classify_reply",
          input,
        },
      ],
      usage: { input_tokens: 120, output_tokens: 40 },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

function claudeStatus(status: number, body: unknown = { error: { message: "boom" } }) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const INPUT = {
  subject: "Re: Devis",
  body: "OK pour le montant. Peut-on programmer une réunion la semaine prochaine ?",
};

describe("createClaudeReplyClassifier", () => {
  it("rejects an empty api key", () => {
    expect(() => createClaudeReplyClassifier({ apiKey: "" })).toThrow(RangeError);
  });

  it("parses a valid tool_use payload into a SUCCEEDED classification", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      claudeSuccess({
        intent: "ACCEPTED_QUOTE",
        confidence: 0.9,
        summary: "Client accepte le devis et demande un rendez-vous.",
      }),
    );
    const provider = createClaudeReplyClassifier({ apiKey: "sk-test", fetchImpl });
    const result = await provider.classify(INPUT);
    expect(result.status).toBe("SUCCEEDED");
    if (result.status !== "SUCCEEDED") return;
    expect(result.classification.intent).toBe("ACCEPTED_QUOTE");
    expect(result.classification.confidence).toBe(0.9);
    expect(result.inputTokens).toBe(120);
    expect(result.outputTokens).toBe(40);
    expect(result.model).toBe("claude-haiku-4-5-20251001");

    const [, init] = fetchImpl.mock.calls[0];
    const body = JSON.parse(init.body as string);
    expect(body.tool_choice).toEqual({ type: "tool", name: "classify_reply" });
    expect(body.temperature).toBe(0);
    expect(Array.isArray(body.tools)).toBe(true);
  });

  it("classifies HTTP 500 as TRANSIENT", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(claudeStatus(500));
    const provider = createClaudeReplyClassifier({ apiKey: "sk-test", fetchImpl });
    const result = await provider.classify(INPUT);
    expect(result).toMatchObject({ status: "FAILED", errorClass: "TRANSIENT" });
  });

  it("classifies HTTP 429 as TRANSIENT (rate limit)", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(claudeStatus(429));
    const provider = createClaudeReplyClassifier({ apiKey: "sk-test", fetchImpl });
    const result = await provider.classify(INPUT);
    expect(result).toMatchObject({ status: "FAILED", errorClass: "TRANSIENT" });
  });

  it("classifies HTTP 401/403 as PERMANENT", async () => {
    for (const status of [401, 403]) {
      const fetchImpl = vi.fn().mockResolvedValue(claudeStatus(status));
      const provider = createClaudeReplyClassifier({ apiKey: "sk-test", fetchImpl });
      const result = await provider.classify(INPUT);
      expect(result).toMatchObject({ status: "FAILED", errorClass: "PERMANENT" });
    }
  });

  it("classifies network exception as TRANSIENT", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("ECONNRESET"));
    const provider = createClaudeReplyClassifier({ apiKey: "sk-test", fetchImpl });
    const result = await provider.classify(INPUT);
    expect(result).toMatchObject({ status: "FAILED", errorClass: "TRANSIENT" });
    expect((result as { errorMessage: string }).errorMessage).toContain("ECONNRESET");
  });

  it("classifies missing tool_use block as PERMANENT", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ content: [{ type: "text", text: "no tool call" }] }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const provider = createClaudeReplyClassifier({ apiKey: "sk-test", fetchImpl });
    const result = await provider.classify(INPUT);
    expect(result).toMatchObject({ status: "FAILED", errorClass: "PERMANENT" });
    expect((result as { errorMessage: string }).errorMessage).toContain("classify_reply");
  });

  it("classifies schema-invalid tool_use payload as PERMANENT", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      claudeSuccess({ intent: "UNKNOWN_ENUM", confidence: 1.5, summary: "" }),
    );
    const provider = createClaudeReplyClassifier({ apiKey: "sk-test", fetchImpl });
    const result = await provider.classify(INPUT);
    expect(result).toMatchObject({ status: "FAILED", errorClass: "PERMANENT" });
    expect((result as { errorMessage: string }).errorMessage).toContain("validate");
  });

  it("honors a custom model override", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      claudeSuccess({ intent: "OTHER", confidence: 0.3, summary: "meh" }),
    );
    const provider = createClaudeReplyClassifier({
      apiKey: "sk-test",
      model: "claude-sonnet-4-6",
      fetchImpl,
    });
    await provider.classify(INPUT);
    const body = JSON.parse(fetchImpl.mock.calls[0][1].body as string);
    expect(body.model).toBe("claude-sonnet-4-6");
    expect(provider.model).toBe("claude-sonnet-4-6");
  });
});
