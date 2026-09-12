import "server-only";

/**
 * C45 — TrustProvider seam (timestamp / signature / seal).
 *
 * Adapters wrap a real trust provider (Docusign, YouSign, Signicat,
 * Universign, ...). Each method returns a discriminated outcome
 * — HANDED_OFF (provider accepted, external_ref returned),
 * PROVIDER_UNAVAILABLE (no provider configured / disabled),
 * ERROR (provider explicitly refused or exception).
 *
 * Wording rule: SESIRA NEVER re-classifies the legal level. The read
 * model exposes `signature_seal_level_reported_by_provider` VERBATIM
 * and only renders "qualifié" / "certifié" wording when the level
 * ∈ (QUALIFIED, QES, QESeal) AND the provider is production_ready=true.
 * That gate lives in the C49 read model.
 */

export type TrustProviderKind =
  | "TEST" | "PENDING_PRODUCTION" | "DOCUSIGN" | "YOUSIGN"
  | "SIGNICAT" | "UNIVERSIGN" | "OTHER";

export type TrustCapability = "TIMESTAMP" | "SIGNATURE" | "SEAL";

export interface TrustRequestPayload {
  organizationId: string;
  documentVersionId: string;
  sha256: string;
  storageBucket: string;
  storagePath: string;
  requestedLevel: string;
}

export type TrustProviderOutcome =
  | {
      status: "HANDED_OFF";
      externalRef: string;
      providerRef: string;
      levelReported?: string | null;
    }
  | { status: "PROVIDER_UNAVAILABLE"; reason?: string }
  | { status: "ERROR"; reason: string };

export interface TrustProvider {
  readonly kind: TrustProviderKind;
  requestTimestamp(payload: TrustRequestPayload): Promise<TrustProviderOutcome>;
  requestSignature(payload: TrustRequestPayload): Promise<TrustProviderOutcome>;
  requestSeal(payload: TrustRequestPayload): Promise<TrustProviderOutcome>;
}
