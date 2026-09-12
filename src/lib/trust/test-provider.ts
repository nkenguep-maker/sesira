import "server-only";

import type {
  TrustProvider, TrustProviderOutcome, TrustRequestPayload,
} from "./provider";

/**
 * TestTrustProvider — deterministic HANDED_OFF outputs for tests.
 * `levelReported` echoes back the requested level string so tests can
 * assert wording (never re-classifying). Not wired in production.
 */
export class TestTrustProvider implements TrustProvider {
  readonly kind = "TEST" as const;
  readonly requests: Array<{ capability: string; payload: TrustRequestPayload }> = [];

  private handoff(capability: string, payload: TrustRequestPayload): TrustProviderOutcome {
    this.requests.push({ capability, payload });
    return {
      status: "HANDED_OFF",
      externalRef: `test-${capability.toLowerCase()}-${payload.documentVersionId}`,
      providerRef: `test-${capability.toLowerCase()}-ref`,
      levelReported: payload.requestedLevel,
    };
  }

  async requestTimestamp(p: TrustRequestPayload): Promise<TrustProviderOutcome> {
    return this.handoff("TIMESTAMP", p);
  }
  async requestSignature(p: TrustRequestPayload): Promise<TrustProviderOutcome> {
    return this.handoff("SIGNATURE", p);
  }
  async requestSeal(p: TrustRequestPayload): Promise<TrustProviderOutcome> {
    return this.handoff("SEAL", p);
  }
}
