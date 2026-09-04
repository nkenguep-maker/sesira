"use server";

import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getViewerContext } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

export async function saveVoicePolicyAction(formData: FormData) {
  const viewer = await getViewerContext();
  if (!viewer) redirect("/login");
  if (!["OWNER", "ADMIN"].includes(viewer.role)) redirect("/app/appels?result=forbidden");

  const aiDisclosureMessage = String(formData.get("aiDisclosureMessage") ?? "").trim();
  const recordingNoticeMessage = String(formData.get("recordingNoticeMessage") ?? "").trim();
  const retentionRecordingDays = Number(formData.get("retentionRecordingDays"));
  const retentionTranscriptDays = Number(formData.get("retentionTranscriptDays"));
  const optOutBehavior = String(formData.get("optOutBehavior") ?? "NO_RECORDING_HUMAN_MESSAGE");
  if (!aiDisclosureMessage || !recordingNoticeMessage || !Number.isInteger(retentionRecordingDays) || !Number.isInteger(retentionTranscriptDays) || retentionRecordingDays < 1 || retentionTranscriptDays < 1 || !["NO_RECORDING_HUMAN_MESSAGE", "HANG_UP"].includes(optOutBehavior)) {
    redirect("/app/appels?result=invalid");
  }

  const client = (await createClient()) as unknown as SupabaseClient;
  const result = await client.rpc("upsert_voice_policy", {
    target_organization_id: viewer.organization.id,
    target_actor_user_id: viewer.userId,
    target_ai_disclosure_message: aiDisclosureMessage.slice(0, 4000),
    target_ai_disclosure_version: `ui-${new Date().toISOString()}`,
    target_recording_notice_message: recordingNoticeMessage.slice(0, 4000),
    target_recording_notice_version: `ui-${new Date().toISOString()}`,
    target_retention_recording_days: retentionRecordingDays,
    target_retention_transcript_days: retentionTranscriptDays,
    target_opt_out_behavior: optOutBehavior,
    target_synthetic_audio_watermark_enabled: true,
    target_legal_hold_finality_note: null,
  });
  redirect(`/app/appels?result=${result.error ? "not-applied" : "saved"}`);
}
