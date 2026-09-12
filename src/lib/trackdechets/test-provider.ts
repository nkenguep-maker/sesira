import "server-only";

import type {
  TrackdechetsProvider, TrackdechetsSubmitOutcome, WasteSubmissionPayload,
} from "./provider";

export class TestTrackdechetsProvider implements TrackdechetsProvider {
  readonly kind = "TEST" as const;
  readonly submissions: WasteSubmissionPayload[] = [];

  async submit(payload: WasteSubmissionPayload): Promise<TrackdechetsSubmitOutcome> {
    this.submissions.push(payload);
    return {
      status: "HANDED_OFF",
      externalRef: `test-bsd-${payload.submissionId}`,
      providerRef: `test-ref-${payload.submissionId}`,
    };
  }
}
