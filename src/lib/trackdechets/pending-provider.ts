import "server-only";

import type {
  TrackdechetsProvider, TrackdechetsSubmitOutcome, WasteSubmissionPayload,
} from "./provider";

export class PendingProductionTrackdechetsProvider implements TrackdechetsProvider {
  readonly kind = "PENDING_PRODUCTION" as const;
  async submit(_payload: WasteSubmissionPayload): Promise<TrackdechetsSubmitOutcome> {
    return { status: "PROVIDER_UNAVAILABLE", reason: "No Trackdéchets provider configured" };
  }
}
