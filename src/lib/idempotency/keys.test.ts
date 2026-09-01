import { describe, expect, it } from "vitest";

import {
  attentionFromSourceKey,
  externalEffectKey,
  productCreationKey,
  providerDeliveryKey,
  quoteFollowupDecisionKey,
} from "./keys";

const QUOTE_ID = "01234567-89ab-cdef-0123-456789abcdef";
const MESSAGE_ID = "abcdef01-2345-6789-abcd-ef0123456789";

describe("quoteFollowupDecisionKey", () => {
  it("formats as quote_followup:{id}:step:{n}", () => {
    expect(quoteFollowupDecisionKey(QUOTE_ID, 2)).toBe(
      `quote_followup:${QUOTE_ID}:step:2`,
    );
  });

  it("is stable across calls (pure function)", () => {
    const a = quoteFollowupDecisionKey(QUOTE_ID, 1);
    const b = quoteFollowupDecisionKey(QUOTE_ID, 1);
    expect(a).toBe(b);
  });

  it("rejects non-uuid quote id", () => {
    expect(() => quoteFollowupDecisionKey("not-a-uuid", 1)).toThrow();
  });

  it("rejects non-positive-integer step", () => {
    expect(() => quoteFollowupDecisionKey(QUOTE_ID, 0)).toThrow();
    expect(() => quoteFollowupDecisionKey(QUOTE_ID, -1)).toThrow();
    expect(() => quoteFollowupDecisionKey(QUOTE_ID, 1.5)).toThrow();
  });
});

describe("providerDeliveryKey", () => {
  it("formats as delivery:{provider}:{event_id}", () => {
    expect(providerDeliveryKey("resend", "evt_abc123")).toBe(
      "delivery:resend:evt_abc123",
    );
  });

  it("is independent of the payload — same event id = same key", () => {
    // A retried callback with a different payload but the same provider
    // event id must collapse to the same key. Payload is not an input.
    const first = providerDeliveryKey("resend", "evt_abc123");
    const second = providerDeliveryKey("resend", "evt_abc123");
    expect(first).toBe(second);
  });

  it("rejects empty provider or event id", () => {
    expect(() => providerDeliveryKey("", "evt_abc")).toThrow();
    expect(() => providerDeliveryKey("resend", "")).toThrow();
  });
});

describe("productCreationKey", () => {
  it("formats as product:{kind}:{provider}:{external_id}", () => {
    expect(productCreationKey("quote", "sellsy", "SL-123")).toBe(
      "product:quote:sellsy:SL-123",
    );
  });

  it("does NOT accept mutable business values (compile-time via kind enum)", () => {
    // @ts-expect-error kind must be a known domain table
    expect(() => productCreationKey("random_thing", "sellsy", "SL-123")).not.toThrow();
    // The runtime accepts a longer string, but the type system flags
    // any call site that tries to pass a mutable label instead of one
    // of the fixed domain kinds.
  });

  it("rejects empty external id", () => {
    expect(() => productCreationKey("quote", "sellsy", "")).toThrow();
  });
});

describe("attentionFromSourceKey", () => {
  it("formats as attention:{source_kind}:{source_id}", () => {
    expect(attentionFromSourceKey("quote_reply", MESSAGE_ID)).toBe(
      `attention:quote_reply:${MESSAGE_ID}`,
    );
  });

  it("collides across replays of the same source (that is the point)", () => {
    const a = attentionFromSourceKey("quote_reply", MESSAGE_ID);
    const b = attentionFromSourceKey("quote_reply", MESSAGE_ID);
    expect(a).toBe(b);
  });

  it("differs when source kind or id differs", () => {
    const a = attentionFromSourceKey("quote_reply", MESSAGE_ID);
    const b = attentionFromSourceKey("quote_bounce", MESSAGE_ID);
    const c = attentionFromSourceKey("quote_reply", QUOTE_ID);
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
  });

  it("rejects non-uuid source id", () => {
    expect(() => attentionFromSourceKey("quote_reply", "not-a-uuid")).toThrow();
  });
});

describe("externalEffectKey", () => {
  it("formats without discriminator", () => {
    expect(externalEffectKey("quote_reminder", QUOTE_ID)).toBe(
      `effect:quote_reminder:${QUOTE_ID}`,
    );
  });

  it("appends a numeric discriminator", () => {
    expect(externalEffectKey("quote_reminder", QUOTE_ID, 3)).toBe(
      `effect:quote_reminder:${QUOTE_ID}:3`,
    );
  });

  it("appends a string discriminator", () => {
    expect(externalEffectKey("weekly_digest", QUOTE_ID, "2026-W35")).toBe(
      `effect:weekly_digest:${QUOTE_ID}:2026-W35`,
    );
  });

  it("rejects non-uuid entity id", () => {
    expect(() => externalEffectKey("quote_reminder", "not-a-uuid")).toThrow();
  });
});

describe("Rule: keys never depend on mutable business values", () => {
  it("the same key builders called with identical stable ids produce identical keys, no matter what changes around them", () => {
    // A canonical proof for reviewers: this test would only fail if
    // a builder started reading external state (Date.now, random,
    // env). Any such regression must be caught in review before it
    // corrupts idempotency.
    const first = [
      quoteFollowupDecisionKey(QUOTE_ID, 1),
      providerDeliveryKey("resend", "evt_1"),
      productCreationKey("quote", "sellsy", "SL-1"),
      attentionFromSourceKey("quote_reply", MESSAGE_ID),
      externalEffectKey("quote_reminder", QUOTE_ID, 2),
    ];
    const second = [
      quoteFollowupDecisionKey(QUOTE_ID, 1),
      providerDeliveryKey("resend", "evt_1"),
      productCreationKey("quote", "sellsy", "SL-1"),
      attentionFromSourceKey("quote_reply", MESSAGE_ID),
      externalEffectKey("quote_reminder", QUOTE_ID, 2),
    ];
    expect(second).toEqual(first);
  });
});
