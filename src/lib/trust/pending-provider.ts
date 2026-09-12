import "server-only";

import type {
  TrustProvider, TrustProviderOutcome, TrustRequestPayload,
} from "./provider";

/**
 * PendingProductionTrustProvider — default until a real provider is
 * wired. Always PROVIDER_UNAVAILABLE. Never fakes a HANDED_OFF.
 */
export class PendingProductionTrustProvider implements TrustProvider {
  readonly kind = "PENDING_PRODUCTION" as const;

  async requestTimestamp(_payload: TrustRequestPayload): Promise<TrustProviderOutcome> {
    return { status: "PROVIDER_UNAVAILABLE", reason: "No trust provider configured" };
  }
  async requestSignature(_payload: TrustRequestPayload): Promise<TrustProviderOutcome> {
    return { status: "PROVIDER_UNAVAILABLE", reason: "No trust provider configured" };
  }
  async requestSeal(_payload: TrustRequestPayload): Promise<TrustProviderOutcome> {
    return { status: "PROVIDER_UNAVAILABLE", reason: "No trust provider configured" };
  }
}
