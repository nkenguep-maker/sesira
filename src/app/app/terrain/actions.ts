"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getViewerContext } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

async function client(): Promise<SupabaseClient> { return (await createClient()) as unknown as SupabaseClient; }

const OFFLINE_KINDS = new Set(["NOTE", "ANOMALY", "MEASUREMENT", "PART_USED"]);

export type OfflineFieldArtifactInput = {
  interventionId: string;
  artifactKind: "NOTE" | "ANOMALY" | "MEASUREMENT" | "PART_USED";
  payload: Record<string, unknown>;
  capturedAt: string;
  offlineClientId: string;
};

export async function syncOfflineFieldArtifactAction(input: OfflineFieldArtifactInput) {
  const viewer = await getViewerContext();
  if (!viewer) return { status: "ERROR" as const, reason: "Session expirée" };
  if (!input.interventionId || !OFFLINE_KINDS.has(input.artifactKind)) return { status: "ERROR" as const, reason: "Saisie invalide" };
  if (!input.offlineClientId || input.offlineClientId.length > 100) return { status: "ERROR" as const, reason: "Identifiant hors connexion invalide" };
  const capturedAt = new Date(input.capturedAt);
  if (Number.isNaN(capturedAt.getTime())) return { status: "ERROR" as const, reason: "Date de capture invalide" };

  const result = await (await client()).rpc("submit_intervention_field_artifact", {
    target_organization_id: viewer.organization.id,
    target_intervention_id: input.interventionId,
    target_artifact_kind: input.artifactKind,
    target_payload: input.payload,
    target_captured_at: capturedAt.toISOString(),
    target_captured_by_user_id: viewer.userId,
    target_offline_client_id: input.offlineClientId,
  });
  if (result.error) return { status: "ERROR" as const, reason: result.error.message };
  const first = Array.isArray(result.data) ? result.data[0] as Record<string, unknown> | undefined : undefined;
  revalidatePath("/app/terrain");
  revalidatePath("/app");
  if (first?.upload_status === "CONFLICT") return { status: "CONFLICT" as const };
  return { status: "SYNCED" as const };
}

export async function arriveAtInterventionAction(formData: FormData) {
  const viewer = await getViewerContext();
  if (!viewer) redirect("/login");
  const interventionId = String(formData.get("interventionId") ?? "");
  if (!interventionId) redirect("/app/terrain?result=invalid");
  const capturedAt = new Date();
  const result = await (await client()).rpc("arrive_at_intervention", {
    target_organization_id: viewer.organization.id,
    target_intervention_id: interventionId,
    target_actor_user_id: viewer.userId,
    target_arrived_at: capturedAt.toISOString(),
    target_offline_client_id: `web-arrival:${viewer.userId}:${interventionId}:${capturedAt.getTime()}`,
  });
  redirect(`/app/terrain?result=${!result.error && result.data === true ? "arrived" : "not-applied"}`);
}

export async function startInterventionAction(formData: FormData) {
  const viewer = await getViewerContext();
  if (!viewer) redirect("/login");
  const interventionId = String(formData.get("interventionId") ?? "");
  if (!interventionId) redirect("/app/terrain?result=invalid");
  const result = await (await client()).rpc("start_intervention_work", {
    target_organization_id: viewer.organization.id,
    target_intervention_id: interventionId,
    target_actor_user_id: viewer.userId,
    target_started_at: new Date().toISOString(),
  });
  redirect(`/app/terrain?result=${!result.error && result.data === true ? "started" : "not-applied"}`);
}

export async function addFieldNoteAction(formData: FormData) {
  const viewer = await getViewerContext();
  if (!viewer) redirect("/login");
  const interventionId = String(formData.get("interventionId") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 4000);
  if (!interventionId || !note) redirect("/app/terrain?result=invalid");
  const capturedAt = new Date();
  const result = await (await client()).rpc("submit_intervention_field_artifact", {
    target_organization_id: viewer.organization.id,
    target_intervention_id: interventionId,
    target_artifact_kind: "NOTE",
    target_payload: { text: note, ai_structured: false },
    target_captured_at: capturedAt.toISOString(),
    target_captured_by_user_id: viewer.userId,
    target_offline_client_id: `web-note:${viewer.userId}:${interventionId}:${capturedAt.getTime()}`,
  });
  if (result.error) redirect("/app/terrain?result=not-applied");
  const first = Array.isArray(result.data) ? result.data[0] as Record<string, unknown> | undefined : undefined;
  const status = first?.upload_status === "CONFLICT" ? "conflict" : "note-saved";
  redirect(`/app/terrain?result=${status}`);
}

export async function resolveFieldConflictAction(formData: FormData) {
  const viewer = await getViewerContext();
  if (!viewer) redirect("/login");
  const artifactId = String(formData.get("artifactId") ?? "");
  const resolution = String(formData.get("resolution") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 1000);
  if (!artifactId || !["SYNCED", "IGNORED"].includes(resolution)) redirect("/app/terrain?result=invalid");
  const result = await (await client()).rpc("resolve_field_artifact_conflict", {
    target_organization_id: viewer.organization.id,
    target_artifact_id: artifactId,
    target_actor_user_id: viewer.userId,
    target_new_status: resolution,
    target_note: note || null,
  });
  redirect(`/app/terrain?result=${!result.error && result.data === true ? "conflict-resolved" : "not-applied"}`);
}
