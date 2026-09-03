"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getViewerContext } from "@/lib/auth/viewer";
import { saveSpeedToLeadPolicy } from "@/lib/speed-to-lead/actions";
import { saveSoldNotScheduledPolicy } from "@/lib/value-policies/actions";

export async function saveSoldNotScheduledPolicyAction(formData: FormData) {
  const viewer = await getViewerContext();
  if (!viewer) redirect("/login");

  const enabled = formData.get("enabled") === "on";
  const graceHours = parseOptionalNumber(formData.get("graceHours"));
  const highValueAmount = parseOptionalNumber(formData.get("highValueAmount"));
  const noteRaw = String(formData.get("note") ?? "").trim();

  if ((enabled && graceHours === null) || graceHours === "INVALID" || highValueAmount === "INVALID") {
    redirect("/app/parametres/politiques?status=invalid");
  }

  const result = await saveSoldNotScheduledPolicy({
    organizationId: viewer.organization.id,
    enabled,
    graceHours: graceHours === null ? null : graceHours,
    highValueAmount: highValueAmount === null ? null : highValueAmount,
    note: noteRaw || null,
  });

  if (result.status !== "APPLIED") redirect("/app/parametres/politiques?status=error");
  refreshPolicySurfaces();
  redirect("/app/parametres/politiques?status=saved");
}

export async function saveSpeedToLeadPolicyAction(formData: FormData) {
  const viewer = await getViewerContext();
  if (!viewer) redirect("/login");

  const enabled = formData.get("enabled") === "on";
  const targetMinutes = parseOptionalInteger(formData.get("targetMinutes"));
  const noteRaw = String(formData.get("note") ?? "").trim();

  if ((enabled && targetMinutes === null) || targetMinutes === "INVALID") {
    redirect("/app/parametres/politiques?speed=invalid");
  }

  const result = await saveSpeedToLeadPolicy({
    organizationId: viewer.organization.id,
    enabled,
    targetMinutes,
    note: noteRaw || null,
  });

  if (result.status !== "APPLIED") redirect("/app/parametres/politiques?speed=error");
  refreshPolicySurfaces();
  redirect("/app/parametres/politiques?speed=saved");
}

function refreshPolicySurfaces() {
  revalidatePath("/app");
  revalidatePath("/app/parametres");
  revalidatePath("/app/parametres/politiques");
  revalidatePath("/app/suivi");
}

function parseOptionalNumber(value: FormDataEntryValue | null): number | null | "INVALID" {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : "INVALID";
}

function parseOptionalInteger(value: FormDataEntryValue | null): number | null | "INVALID" {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 10080 ? parsed : "INVALID";
}
