"use server";

import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getViewerContext } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

async function looseClient(): Promise<SupabaseClient> {
  return (await createClient()) as unknown as SupabaseClient;
}

export async function markRegulatoryAttentionSeenAction(formData: FormData) {
  const viewer = await getViewerContext();
  if (!viewer) redirect("/login");
  const attentionId = String(formData.get("attentionId") ?? "");
  if (!attentionId) redirect("/app/obligations/documents?result=invalid");
  const client = await looseClient();
  const result = await client.rpc("mark_regulatory_attention_seen", {
    target_organization_id: viewer.organization.id,
    target_attention_id: attentionId,
    target_seen_by_user_id: viewer.userId,
  });
  redirect(`/app/obligations/documents?result=${!result.error && result.data === true ? "seen" : "not-applied"}`);
}

export async function resolveRegulatoryAttentionAction(formData: FormData) {
  const viewer = await getViewerContext();
  if (!viewer) redirect("/login");
  const attentionId = String(formData.get("attentionId") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 2000);
  if (!attentionId) redirect("/app/obligations/documents?result=invalid");
  const client = await looseClient();
  const result = await client.rpc("resolve_regulatory_attention", {
    target_organization_id: viewer.organization.id,
    target_attention_id: attentionId,
    target_resolved_by_user_id: viewer.userId,
    target_note: note || null,
  });
  redirect(`/app/obligations/documents?result=${!result.error && result.data === true ? "resolved" : "not-applied"}`);
}

export async function prepareAnnualBilanAction(formData: FormData) {
  const viewer = await getViewerContext();
  if (!viewer) redirect("/login");
  const year = Number(formData.get("year"));
  if (!Number.isInteger(year) || year < 2024 || year > 2100) redirect("/app/obligations/documents?result=invalid-year");
  const client = await looseClient();
  const result = await client.rpc("generate_annual_regulatory_bilan", {
    target_organization_id: viewer.organization.id,
    target_year: year,
    target_generator_user_id: viewer.userId,
  });
  redirect(`/app/obligations/documents?result=${result.error ? "not-applied" : "prepared"}`);
}

export async function prepareCerfaAction(formData: FormData) {
  const viewer = await getViewerContext();
  if (!viewer) redirect("/login");
  const interventionId = String(formData.get("interventionId") ?? "");
  if (!interventionId) redirect("/app/obligations/documents?result=invalid");
  const client = await looseClient();
  const result = await client.rpc("generate_cerfa_intervention_export", {
    target_organization_id: viewer.organization.id,
    target_intervention_id: interventionId,
    target_generator_user_id: viewer.userId,
  });
  redirect(`/app/obligations/documents?result=${result.error ? "not-applied" : "cerfa-prepared"}`);
}
