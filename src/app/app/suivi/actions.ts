"use server";

import { redirect } from "next/navigation";

import { dispatchApprovedFollowup } from "@/lib/approval/dispatch";
import { approveAutomationRun, rejectAutomationRun } from "@/lib/approval/resolve";
import { getViewerContext } from "@/lib/auth/viewer";
import { createResendProvider } from "@/lib/email/providers/resend";
import { serverEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function approveFollowupAction(formData: FormData) {
  const viewer = await getViewerContext();
  if (!viewer) redirect("/login");

  const runId = String(formData.get("runId") ?? "");
  const comment = optionalText(formData.get("comment"));
  if (!runId) redirect("/app/suivi?approval=invalid");

  if (
    serverEnv.EXTERNAL_ACTIONS_ENABLED !== "true" ||
    process.env.VERCEL_ENV !== "production" ||
    !serverEnv.RESEND_API_KEY ||
    !serverEnv.EMAIL_FROM
  ) {
    redirect("/app/suivi?approval=send-unavailable");
  }

  const supabase = await createClient();
  const integration = await supabase
    .from("integrations")
    .select("id")
    .eq("organization_id", viewer.organization.id)
    .eq("type", "EMAIL")
    .eq("status", "CONNECTED")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (integration.error || !integration.data) {
    redirect("/app/suivi?approval=send-unavailable");
  }

  const dispatcherWorker = `ui-approval:${viewer.userId}:${runId}`;
  const resolved = await approveAutomationRun({
    runId,
    organizationId: viewer.organization.id,
    approverUserId: viewer.userId,
    comment,
    dispatcherWorker,
  });

  if (resolved.status !== "RESOLVED") {
    redirect(`/app/suivi?approval=${resolved.status === "NOT_ELIGIBLE" ? "stale" : "error"}`);
  }

  const dispatched = await dispatchApprovedFollowup({
    runId,
    organizationId: viewer.organization.id,
    dispatcherWorker,
    provider: createResendProvider(serverEnv.RESEND_API_KEY),
    integrationId: integration.data.id,
    fromEmail: serverEnv.EMAIL_FROM,
    replyTo: serverEnv.EMAIL_REPLY_TO,
  });

  if (dispatched.status === "SENT" || dispatched.status === "REPLAY") {
    redirect("/app/suivi?approval=sent");
  }
  redirect("/app/suivi?approval=send-failed");
}

export async function rejectFollowupAction(formData: FormData) {
  const viewer = await getViewerContext();
  if (!viewer) redirect("/login");

  const runId = String(formData.get("runId") ?? "");
  const comment = optionalText(formData.get("comment"));
  if (!runId) redirect("/app/suivi?approval=invalid");

  const result = await rejectAutomationRun({
    runId,
    organizationId: viewer.organization.id,
    approverUserId: viewer.userId,
    comment,
  });

  if (result.status === "RESOLVED") redirect("/app/suivi?approval=rejected");
  redirect(`/app/suivi?approval=${result.status === "NOT_ELIGIBLE" ? "stale" : "error"}`);
}

function optionalText(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed.slice(0, 1000) : null;
}
