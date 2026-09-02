"use server";

import { revalidatePath } from "next/cache";

import { getViewerContext } from "@/lib/auth/viewer";
import { transitionOpportunityState } from "@/lib/opportunities/actions";
import { isOpportunityState } from "@/lib/opportunities/schema";
import { setOpportunityOperationalNextStep } from "@/lib/value-policies/actions";

export async function transitionOpportunityAction(formData: FormData) {
  const viewer = await getViewerContext();
  if (!viewer) return;
  const opportunityId = String(formData.get("opportunityId") ?? "");
  const newState = String(formData.get("newState") ?? "");
  if (!opportunityId || !isOpportunityState(newState)) return;
  const result = await transitionOpportunityState({ organizationId: viewer.organization.id, opportunityId, newState });
  if (result.status === "APPLIED") revalidateOpportunity(opportunityId);
}

export async function setOperationalNextStepAction(formData: FormData) {
  const viewer = await getViewerContext();
  if (!viewer) return;
  const opportunityId = String(formData.get("opportunityId") ?? "");
  if (!opportunityId) return;

  const clear = formData.get("clear") === "1";
  const dateRaw = String(formData.get("nextStepDate") ?? "").trim();
  const kind = String(formData.get("nextStepKind") ?? "").trim();
  if (!clear && (!/^\d{4}-\d{2}-\d{2}$/.test(dateRaw) || !kind)) return;

  const result = await setOpportunityOperationalNextStep({
    organizationId: viewer.organization.id,
    opportunityId,
    nextStepAt: clear ? null : new Date(`${dateRaw}T12:00:00.000Z`),
    nextStepKind: clear ? null : kind,
  });
  if (result.status === "APPLIED") revalidateOpportunity(opportunityId);
}

function revalidateOpportunity(opportunityId: string) {
  revalidatePath("/app/opportunites");
  revalidatePath(`/app/opportunites/${opportunityId}`);
  revalidatePath("/app/suivi");
}
