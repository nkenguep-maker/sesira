"use server";

import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getViewerContext } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

async function client(): Promise<SupabaseClient> { return (await createClient()) as unknown as SupabaseClient; }

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
