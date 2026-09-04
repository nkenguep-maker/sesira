import "server-only";

/**
 * C37 — Voice provider abstractions.
 *
 * Roadmap architecture:
 *   Voice transport (VoiceProvider) → STT provider → AIProvider (Mistral)
 *
 *   Mistral NEVER receives raw audio. Transport and speech-to-text
 *   are DELIBERATELY separated so we can swap either without
 *   rewriting the other.
 *
 * At C37 launch, only the TEST providers are wired. Production
 * transport + STT + AI adapters land later, each behind their
 * own PRODUCTION_PROVIDER_INTEGRATION_PENDING gate.
 */

export type VoiceProviderKind =
  | "TEST"
  | "PRODUCTION_PROVIDER_INTEGRATION_PENDING";

// -------- Voice transport --------

export interface InboundCallPayload {
  externalCallRef: string;
  callerPhone: string | null;
  startedAt: string;
  metadata?: Record<string, unknown>;
}

export interface DisclosurePlaybackResult {
  status: "PLAYED" | "OPTED_OUT" | "ERROR";
  reason?: string;
}

/**
 * A voice transport handles the phone call layer. It plays the
 * mandatory art. 50 AI disclosure + recording notice BEFORE any
 * recording starts. If the caller opts out (touch tone), the
 * transport signals it and hangs up recording.
 */
export interface VoiceProvider {
  readonly kind: VoiceProviderKind;
  readonly label: string;

  /**
   * Play the disclosure messages to the caller and return whether
   * the call proceeds (PLAYED) or the caller opted out (OPTED_OUT).
   * Implementations MUST play the disclosure BEFORE returning
   * PLAYED — no exceptions.
   */
  playMandatoryDisclosures(
    payload: InboundCallPayload,
    aiDisclosureMessage: string,
    recordingNoticeMessage: string,
  ): Promise<DisclosurePlaybackResult>;
}

export class TestVoiceProvider implements VoiceProvider {
  readonly kind = "TEST" as const;
  readonly label: string;

  constructor(label = "Test voice provider") {
    this.label = label;
  }

  async playMandatoryDisclosures(
    payload: InboundCallPayload,
    aiDisclosureMessage: string,
    recordingNoticeMessage: string,
  ): Promise<DisclosurePlaybackResult> {
    if (!aiDisclosureMessage || !recordingNoticeMessage) {
      return { status: "ERROR", reason: "test voice provider requires both disclosure messages to be non-empty" };
    }
    // Deterministic: never opts out unless payload.metadata.opt_out is truthy.
    if (payload.metadata && payload.metadata.opt_out === true) {
      return { status: "OPTED_OUT" };
    }
    return { status: "PLAYED" };
  }
}

export class PendingProductionVoiceProvider implements VoiceProvider {
  readonly kind = "PRODUCTION_PROVIDER_INTEGRATION_PENDING" as const;
  readonly label: string;

  constructor(label = "Voice production (à intégrer)") {
    this.label = label;
  }

  async playMandatoryDisclosures(): Promise<DisclosurePlaybackResult> {
    return {
      status: "ERROR",
      reason: "PRODUCTION_PROVIDER_INTEGRATION_PENDING: no real voice provider integrated (REGULATORY.md D-5 also requires Europe-verified region).",
    };
  }
}

// -------- STT (speech-to-text) — separate provider --------

export interface SpeechToTextInput {
  recordingRef: string;
  languageHint?: string;
}

export type SpeechToTextResult =
  | { status: "TRANSCRIBED"; transcriptRef: string; wordCount: number }
  | { status: "PROVIDER_UNAVAILABLE"; reason: string }
  | { status: "ERROR"; reason: string };

export interface SpeechToTextProvider {
  readonly kind: VoiceProviderKind;
  readonly label: string;

  transcribe(input: SpeechToTextInput): Promise<SpeechToTextResult>;
}

export class TestSpeechToTextProvider implements SpeechToTextProvider {
  readonly kind = "TEST" as const;
  readonly label: string;

  constructor(label = "Test STT provider") {
    this.label = label;
  }

  async transcribe(input: SpeechToTextInput): Promise<SpeechToTextResult> {
    return {
      status: "TRANSCRIBED",
      transcriptRef: `test-transcript:${input.recordingRef}`,
      wordCount: 42,
    };
  }
}

export class PendingProductionSpeechToTextProvider implements SpeechToTextProvider {
  readonly kind = "PRODUCTION_PROVIDER_INTEGRATION_PENDING" as const;
  readonly label: string;

  constructor(label = "STT production (à intégrer)") {
    this.label = label;
  }

  async transcribe(): Promise<SpeechToTextResult> {
    return {
      status: "PROVIDER_UNAVAILABLE",
      reason: "PRODUCTION_PROVIDER_INTEGRATION_PENDING: no real STT provider integrated (REGULATORY.md D-5 requires Europe-verified region).",
    };
  }
}
