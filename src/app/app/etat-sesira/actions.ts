"use server";

import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getViewerContext } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

export async function togglePlatformComponentAction(formData: FormData) {
  const viewer = await getViewerContext();
  if (!viewer) redirect("/login");
  if (!["OWNER", "ADMIN"].includes(viewer.role)) redirect("/app/etat-sesira?result=forbidden");
  const componentKind = String(formData.get("componentKind") ?? "");
  const intent = String(formData.get("intent") ?? "");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 1000);
  if (!componentKind || !reason || !["disable", "enable"].includes(intent)) redirect("/app/etat-sesira?result=invalid");
  const client = (await createClient()) as unknown as SupabaseClient;
  const rpc = intent === "disable" ? "engage_kill_switch" : "release_kill_switch";
  const result = await client.rpc(rpc, {
    target_organization_id: viewer.organization.id,
    target_component_kind: componentKind,
    target_actor_user_id: viewer.userId,
    target_reason: reason,
  });
  redirect(`/app/etat-sesira?result=${!result.error && result.data === true ? (intent === "disable" ? "disabled" : "enabled") : "not-applied"}`);
}
