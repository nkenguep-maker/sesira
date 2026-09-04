import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/database";

import type { VoiceProviderKind } from "./provider";

/**
 * C37 — voice intake server helpers.
 *
 * REGULATORY.md §4 discipline:
 *   * upsertVoicePolicy is the only public seam for org config.
 *   * markVoicePolicyEuropeVerified is service_role only — the D-5
 *     gate is data-ops attestation.
 *   * All lifecycle transitions on voice_calls are service_role only
 *     (webhook / worker) — a real caller drives the state via the
 *     voice provider callback chain, never via an authenticated
 *     browser session.
 *   * Read helpers (voicePolicyFor, voiceCallsFor) are the only
 *     authenticated seams.
 *
 * Forbidden metadata: recordVoiceCallProcessed will RAISE if the
 * caller supplies emotion / sentiment / diagnosis / price /
 * scoring keys in metadata (defense-in-depth for doctrine §7).
 */

interface Deps { client?: SupabaseClient<Database>; }

export type VoiceActionResult =
  | { status: "APPLIED" } | { status: "NOT_ELIGIBLE" } | { status: "ERROR"; reason: string };

export type VoiceResourceResult =
  | { status: "APPLIED"; id: string }
  | { status: "ERROR"; reason: string };

export type VoiceCallStatus =
  | "RECEIVED" | "DISCLOSED_TO_CALLER" | "RECORDED" | "OPTED_OUT"
  | "TRANSCRIBED" | "PROCESSED" | "CLOSED" | "FAILED";

export type OptOutBehavior = "NO_RECORDING_HUMAN_MESSAGE" | "HANG_UP";

// -------- Policy --------

export interface UpsertVoicePolicyInput {
  organizationId: string;
  actorUserId: string;
  aiDisclosureMessage: string;
  aiDisclosureVersion: string;
  recordingNoticeMessage: string;
  recordingNoticeVersion: string;
  retentionRecordingDays: number;
  retentionTranscriptDays: number;
  optOutBehavior: OptOutBehavior;
  syntheticAudioWatermarkEnabled: boolean;
  legalHoldFinalityNote?: string | null;
}

export async function upsertVoicePolicy(
  input: UpsertVoicePolicyInput,
  deps: Deps = {},
): Promise<VoiceResourceResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("upsert_voice_policy", {
    target_organization_id: input.organizationId,
    target_actor_user_id: input.actorUserId,
    target_ai_disclosure_message: input.aiDisclosureMessage,
    target_ai_disclosure_version: input.aiDisclosureVersion,
    target_recording_notice_message: input.recordingNoticeMessage,
    target_recording_notice_version: input.recordingNoticeVersion,
    target_retention_recording_days: input.retentionRecordingDays,
    target_retention_transcript_days: input.retentionTranscriptDays,
    target_opt_out_behavior: input.optOutBehavior,
    target_synthetic_audio_watermark_enabled: input.syntheticAudioWatermarkEnabled,
    target_legal_hold_finality_note: input.legalHoldFinalityNote ?? null,
  });
  if (error) return { status: "ERROR", reason: `upsert_voice_policy: ${error.message}` };
  return { status: "APPLIED", id: data as string };
}

// -------- Call lifecycle (service_role only from callers) --------

export interface RecordVoiceCallReceivedInput {
  organizationId: string;
  providerKind: VoiceProviderKind;
  externalCallRef: string;
  callerPhone?: string | null;
  startedAt?: Date | null;
}

export async function recordVoiceCallReceived(
  input: RecordVoiceCallReceivedInput,
  deps: Deps = {},
): Promise<VoiceResourceResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("record_voice_call_received", {
    target_organization_id: input.organizationId,
    target_provider_kind: input.providerKind,
    target_external_call_ref: input.externalCallRef,
    target_caller_phone: input.callerPhone ?? null,
    target_started_at: input.startedAt ? input.startedAt.toISOString() : null,
  });
  if (error) return { status: "ERROR", reason: `record_voice_call_received: ${error.message}` };
  return { status: "APPLIED", id: data as string };
}

export interface VoiceCallIdInput {
  organizationId: string;
  callId: string;
}

export async function markVoiceCallDisclosuresPlayed(
  input: VoiceCallIdInput,
  deps: Deps = {},
): Promise<VoiceActionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("mark_voice_call_disclosures_played", {
    target_organization_id: input.organizationId,
    target_call_id: input.callId,
  });
  if (error) return { status: "ERROR", reason: `mark_voice_call_disclosures_played: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

export async function markVoiceCallOptedOut(
  input: VoiceCallIdInput,
  deps: Deps = {},
): Promise<VoiceActionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("mark_voice_call_opted_out", {
    target_organization_id: input.organizationId,
    target_call_id: input.callId,
  });
  if (error) return { status: "ERROR", reason: `mark_voice_call_opted_out: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

export interface RecordRecordingInput extends VoiceCallIdInput {
  recordingRef: string;
  durationMs?: number | null;
}

export async function recordVoiceCallRecording(
  input: RecordRecordingInput,
  deps: Deps = {},
): Promise<VoiceActionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("record_voice_call_recording", {
    target_organization_id: input.organizationId,
    target_call_id: input.callId,
    target_recording_ref: input.recordingRef,
    target_duration_ms: input.durationMs ?? null,
  });
  if (error) return { status: "ERROR", reason: `record_voice_call_recording: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

export interface RecordTranscriptInput extends VoiceCallIdInput {
  transcriptRef: string;
}

export async function recordVoiceCallTranscript(
  input: RecordTranscriptInput,
  deps: Deps = {},
): Promise<VoiceActionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("record_voice_call_transcript", {
    target_organization_id: input.organizationId,
    target_call_id: input.callId,
    target_transcript_ref: input.transcriptRef,
  });
  if (error) return { status: "ERROR", reason: `record_voice_call_transcript: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

export interface RecordProcessedInput extends VoiceCallIdInput {
  processedAiRunId?: string | null;
  matchedCustomerId?: string | null;
  matchedLeadId?: string | null;
  processedRequestId?: string | null;
  processedAttentionId?: string | null;
  metadata?: Record<string, unknown> | null;
}

const FORBIDDEN_METADATA_KEYS = new Set([
  "emotion", "sentiment", "sentiment_score",
  "reliability", "reliability_score",
  "aggressiveness", "aggression_score",
  "diagnosis", "technical_diagnosis",
  "price", "quoted_price", "eligibility",
  "eligibility_score", "credit_score",
]);

export async function recordVoiceCallProcessed(
  input: RecordProcessedInput,
  deps: Deps = {},
): Promise<VoiceActionResult> {
  // Client-side pre-flight — the SQL RPC also refuses these keys.
  if (input.metadata) {
    for (const key of Object.keys(input.metadata)) {
      if (FORBIDDEN_METADATA_KEYS.has(key)) {
        return { status: "ERROR", reason: `metadata key "${key}" is forbidden (doctrine §7 / REGULATORY.md 4.2)` };
      }
    }
  }
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("record_voice_call_processed", {
    target_organization_id: input.organizationId,
    target_call_id: input.callId,
    target_processed_ai_run_id: input.processedAiRunId ?? null,
    target_matched_customer_id: input.matchedCustomerId ?? null,
    target_matched_lead_id: input.matchedLeadId ?? null,
    target_processed_request_id: input.processedRequestId ?? null,
    target_processed_attention_id: input.processedAttentionId ?? null,
    target_metadata: (input.metadata ?? {}) as unknown as Json,
  });
  if (error) return { status: "ERROR", reason: `record_voice_call_processed: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

export interface CloseVoiceCallInput extends VoiceCallIdInput {
  endedAt?: Date | null;
}

export async function closeVoiceCall(
  input: CloseVoiceCallInput,
  deps: Deps = {},
): Promise<VoiceActionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("close_voice_call", {
    target_organization_id: input.organizationId,
    target_call_id: input.callId,
    target_ended_at: input.endedAt ? input.endedAt.toISOString() : null,
  });
  if (error) return { status: "ERROR", reason: `close_voice_call: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

// -------- Read helpers --------

export interface VoicePolicyRow {
  policyId: string;
  aiDisclosureMessage: string;
  aiDisclosureMessageVersion: string;
  recordingNoticeMessage: string;
  recordingNoticeMessageVersion: string;
  retentionRecordingDays: number;
  retentionTranscriptDays: number;
  optOutBehavior: OptOutBehavior;
  syntheticAudioWatermarkEnabled: boolean;
  regionEuropeVerified: boolean;
  regionVerifiedAt: string | null;
  legalHoldFinalityNote: string | null;
}

export type VoicePolicyForResult =
  | { status: "APPLIED"; policy: VoicePolicyRow | null }
  | { status: "ERROR"; reason: string };

export async function voicePolicyFor(
  organizationId: string,
  deps: Deps = {},
): Promise<VoicePolicyForResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("voice_policy_for", {
    target_organization_id: organizationId,
  });
  if (error) return { status: "ERROR", reason: `voice_policy_for: ${error.message}` };
  const rows = (data ?? []) as Array<{
    policy_id: string; ai_disclosure_message: string; ai_disclosure_message_version: string;
    recording_notice_message: string; recording_notice_message_version: string;
    retention_recording_days: number; retention_transcript_days: number;
    opt_out_behavior: string; synthetic_audio_watermark_enabled: boolean;
    region_europe_verified: boolean; region_verified_at: string | null;
    legal_hold_finality_note: string | null;
  }>;
  if (rows.length === 0) return { status: "APPLIED", policy: null };
  const r = rows[0];
  return {
    status: "APPLIED",
    policy: {
      policyId: r.policy_id,
      aiDisclosureMessage: r.ai_disclosure_message,
      aiDisclosureMessageVersion: r.ai_disclosure_message_version,
      recordingNoticeMessage: r.recording_notice_message,
      recordingNoticeMessageVersion: r.recording_notice_message_version,
      retentionRecordingDays: r.retention_recording_days,
      retentionTranscriptDays: r.retention_transcript_days,
      optOutBehavior: r.opt_out_behavior as OptOutBehavior,
      syntheticAudioWatermarkEnabled: r.synthetic_audio_watermark_enabled,
      regionEuropeVerified: r.region_europe_verified,
      regionVerifiedAt: r.region_verified_at,
      legalHoldFinalityNote: r.legal_hold_finality_note,
    },
  };
}

export interface VoiceCallRow {
  callId: string;
  providerKind: VoiceProviderKind;
  externalCallRef: string;
  callerPhone: string | null;
  matchedCustomerId: string | null;
  matchedLeadId: string | null;
  status: VoiceCallStatus;
  aiDisclosurePlayedAt: string | null;
  recordingNoticePlayedAt: string | null;
  optOutAt: string | null;
  durationMs: number | null;
  startedAt: string;
  endedAt: string | null;
  retentionExpiresAt: string;
  purgedRecordingAt: string | null;
  purgedTranscriptAt: string | null;
}

export type VoiceCallsForResult =
  | { status: "APPLIED"; calls: VoiceCallRow[] }
  | { status: "ERROR"; reason: string };

export async function voiceCallsFor(
  organizationId: string,
  statusFilter: VoiceCallStatus | null = null,
  deps: Deps = {},
): Promise<VoiceCallsForResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("voice_calls_for", {
    target_organization_id: organizationId,
    target_status_filter: statusFilter,
  });
  if (error) return { status: "ERROR", reason: `voice_calls_for: ${error.message}` };
  const rows = (data ?? []) as Array<{
    call_id: string; provider_kind: string; external_call_ref: string;
    caller_phone: string | null; matched_customer_id: string | null;
    matched_lead_id: string | null; status: string;
    ai_disclosure_played_at: string | null; recording_notice_played_at: string | null;
    opt_out_at: string | null; duration_ms: number | null;
    started_at: string; ended_at: string | null;
    retention_expires_at: string; purged_recording_at: string | null;
    purged_transcript_at: string | null;
  }>;
  return {
    status: "APPLIED",
    calls: rows.map((r) => ({
      callId: r.call_id,
      providerKind: r.provider_kind as VoiceProviderKind,
      externalCallRef: r.external_call_ref,
      callerPhone: r.caller_phone,
      matchedCustomerId: r.matched_customer_id,
      matchedLeadId: r.matched_lead_id,
      status: r.status as VoiceCallStatus,
      aiDisclosurePlayedAt: r.ai_disclosure_played_at,
      recordingNoticePlayedAt: r.recording_notice_played_at,
      optOutAt: r.opt_out_at,
      durationMs: r.duration_ms,
      startedAt: r.started_at,
      endedAt: r.ended_at,
      retentionExpiresAt: r.retention_expires_at,
      purgedRecordingAt: r.purged_recording_at,
      purgedTranscriptAt: r.purged_transcript_at,
    })),
  };
}
