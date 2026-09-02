import { beforeEach, describe, expect, it } from "vitest";

import { outboundMessageIntentKey } from "@/lib/idempotency/keys";

import type { InboundReplyEnvelope } from "./envelope";
import { ingestInboundReply } from "./ingest";

const ORG = "91000000-0000-4000-8000-000000000001";
const QUOTE = "91500000-0000-4000-8000-000000000001";
const CUSTOMER = "91300000-0000-4000-8000-000000000001";
const OUTBOUND_MSG_ID = "outbound_msg_id_abc";
const OUTBOUND_IDEMPOTENCY = outboundMessageIntentKey("quote_followup", QUOTE, 1);

function makeEnvelope(overrides: Partial<InboundReplyEnvelope> = {}): InboundReplyEnvelope {
  return {
    provider: "resend",
    providerEventId: "evt_abc",
    messageId: "inbound_msg_abc@example.com",
    inReplyTo: OUTBOUND_MSG_ID,
    references: [OUTBOUND_MSG_ID],
    from: "customer@example.com",
    to: ["quotes@sesira.example"],
    subject: "Re: Devis",
    text: "Merci pour le devis",
    html: null,
    receivedAt: new Date("2026-09-06T10:00:00Z"),
    raw: { type: "email.received" },
    ...overrides,
  };
}

interface FakeState {
  outboundLookup: {
    organization_id: string;
    idempotency_key: string;
    integration_id: string | null;
    provider_message_id: string;
  } | null;
  quoteRow: { customer_id: string } | null;
  quoteStatus: string;
  recordInboundCalls: Array<Record<string, unknown>>;
  messageLedger: Map<string, string>;
  messageNextId: number;
  eventCalls: Array<Record<string, unknown>>;
  transitionCalls: Array<Record<string, unknown>>;
  transitionReturns: boolean;
  attentionCalls: Array<Record<string, unknown>>;
  attentionNextId: number;
}

function makeState(overrides: Partial<FakeState> = {}): FakeState {
  return {
    outboundLookup: {
      organization_id: ORG,
      idempotency_key: OUTBOUND_IDEMPOTENCY,
      integration_id: null,
      provider_message_id: OUTBOUND_MSG_ID,
    },
    quoteRow: { customer_id: CUSTOMER },
    quoteStatus: "SENT",
    recordInboundCalls: [],
    messageLedger: new Map(),
    messageNextId: 0,
    eventCalls: [],
    transitionCalls: [],
    transitionReturns: true,
    attentionCalls: [],
    attentionNextId: 0,
    ...overrides,
  };
}

function makeFakeClient(state: FakeState) {
  return {
    from(table: string) {
      if (table === "outbound_messages") {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                maybeSingle: () => Promise.resolve({ data: state.outboundLookup, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === "quotes") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: state.quoteRow, error: null }),
              }),
            }),
          }),
        };
      }
      throw new Error(`unhandled table ${table}`);
    },
    rpc(name: string, args: Record<string, unknown>) {
      if (name === "record_inbound_message") {
        state.recordInboundCalls.push(args);
        const key = `${args.target_organization_id}|${args.target_idempotency_key}`;
        const existing = state.messageLedger.get(key);
        if (existing) {
          return Promise.resolve({ data: [{ id: existing, created: false }], error: null });
        }
        state.messageNextId += 1;
        const id = `msg-${state.messageNextId}`;
        state.messageLedger.set(key, id);
        return Promise.resolve({ data: [{ id, created: true }], error: null });
      }
      if (name === "insert_event_once") {
        state.eventCalls.push(args);
        return Promise.resolve({ data: [{ id: `evt-${state.eventCalls.length}`, created: true }], error: null });
      }
      if (name === "mark_quote_replied") {
        state.transitionCalls.push(args);
        return Promise.resolve({ data: state.transitionReturns, error: null });
      }
      if (name === "insert_attention_once") {
        state.attentionCalls.push(args);
        state.attentionNextId += 1;
        return Promise.resolve({
          data: [{ id: `att-${state.attentionNextId}`, created: true }],
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: { message: `unhandled rpc ${name}` } });
    },
  };
}

describe("ingestInboundReply", () => {
  let state: FakeState;
  let client: ReturnType<typeof makeFakeClient>;

  beforeEach(() => {
    state = makeState();
    client = makeFakeClient(state);
  });

  it("accepts a well-formed reply, records message, event, attention, transitions the quote", async () => {
    const result = await ingestInboundReply(makeEnvelope(), { client: client as never });
    expect(result.status).toBe("ACCEPTED");
    if (result.status !== "ACCEPTED") return;
    expect(result.organizationId).toBe(ORG);
    expect(result.quoteId).toBe(QUOTE);
    expect(result.quoteTransitioned).toBe(true);
    expect(state.recordInboundCalls).toHaveLength(1);
    expect(state.eventCalls).toHaveLength(1);
    expect(state.eventCalls[0].target_type).toBe("quote.reply_received");
    expect(state.transitionCalls).toHaveLength(1);
    expect(state.attentionCalls).toHaveLength(1);
    expect(state.attentionCalls[0].target_reason).toBe("REPLY_NEEDS_REVIEW");
  });

  it("returns UNMATCHED when In-Reply-To is null", async () => {
    const result = await ingestInboundReply(makeEnvelope({ inReplyTo: null }), { client: client as never });
    expect(result).toEqual({ status: "UNMATCHED", providerEventId: "evt_abc", inReplyTo: null });
    expect(state.recordInboundCalls).toHaveLength(0);
    expect(state.eventCalls).toHaveLength(0);
    expect(state.transitionCalls).toHaveLength(0);
    expect(state.attentionCalls).toHaveLength(0);
  });

  it("returns UNMATCHED when outbound lookup finds no row", async () => {
    state.outboundLookup = null;
    const result = await ingestInboundReply(makeEnvelope(), { client: client as never });
    expect(result.status).toBe("UNMATCHED");
    expect(state.recordInboundCalls).toHaveLength(0);
  });

  it("returns UNMATCHED when outbound key is not a quote_followup", async () => {
    state.outboundLookup = {
      ...state.outboundLookup!,
      idempotency_key: outboundMessageIntentKey("other_kind", QUOTE, 1),
    };
    const result = await ingestInboundReply(makeEnvelope(), { client: client as never });
    expect(result.status).toBe("UNMATCHED");
    expect(state.recordInboundCalls).toHaveLength(0);
  });

  it("returns REPLAY_MESSAGE on repeated webhook (same providerEventId)", async () => {
    const first = await ingestInboundReply(makeEnvelope(), { client: client as never });
    expect(first.status).toBe("ACCEPTED");
    const second = await ingestInboundReply(makeEnvelope(), { client: client as never });
    expect(second.status).toBe("REPLAY_MESSAGE");
    if (second.status !== "REPLAY_MESSAGE") return;
    expect(second.messageId).toBe(first.status === "ACCEPTED" ? first.messageId : "");
    expect(state.recordInboundCalls).toHaveLength(2);
    expect(state.eventCalls).toHaveLength(1);
    expect(state.transitionCalls).toHaveLength(1);
    expect(state.attentionCalls).toHaveLength(1);
  });

  it("still emits an Attention when the quote transition is a no-op (quote already terminal)", async () => {
    state.transitionReturns = false;
    const result = await ingestInboundReply(makeEnvelope(), { client: client as never });
    expect(result.status).toBe("ACCEPTED");
    if (result.status !== "ACCEPTED") return;
    expect(result.quoteTransitioned).toBe(false);
    expect(state.attentionCalls).toHaveLength(1);
  });
});
