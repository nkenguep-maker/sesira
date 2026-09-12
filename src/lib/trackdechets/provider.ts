import "server-only";

/**
 * C46 — TrackdechetsProvider seam.
 *
 * Adapters wrap the Trackdéchets API (or an equivalent waste tracking
 * system). SESIRA NEVER produces a "bordereau officiel" locally — the
 * bordereau id is what the provider returned in `external_ref`.
 *
 * TestTrackdechetsProvider echoes deterministic HANDED_OFF for tests.
 * PendingProductionTrackdechetsProvider always returns
 * PROVIDER_UNAVAILABLE — never fakes.
 */

export type TrackdechetsProviderKind = "TEST" | "PENDING_PRODUCTION" | "TRACKDECHETS" | "OTHER";

export interface WasteSubmissionPayload {
  organizationId: string;
  wasteDossierId: string;
  submissionId: string;
  payloadSnapshot: Record<string, unknown>;
}

export type TrackdechetsSubmitOutcome =
  | { status: "HANDED_OFF"; externalRef: string; providerRef: string }
  | { status: "PROVIDER_UNAVAILABLE"; reason?: string }
  | { status: "ERROR"; reason: string };

export interface TrackdechetsProvider {
  readonly kind: TrackdechetsProviderKind;
  submit(payload: WasteSubmissionPayload): Promise<TrackdechetsSubmitOutcome>;
}
