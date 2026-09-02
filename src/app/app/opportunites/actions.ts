"use server";

import { revalidatePath } from "next/cache";

import { getViewerContext } from "@/lib/auth/viewer";
import { transitionOpportunityState } from "@/lib/opportunities/actions";
import { isOpportunityState } from "@/lib/opportunities/schema";

export async function transitionOpportunityAction(formData: FormData) {
  const viewer = await getViewerContext();
  if (!viewer) return;

  const opportunityId = String(formData.get("opportunityId") ?? "");
  const newState = String(formData.get("newState") ?? "");
  if (!opportunityId || !isOpportunityState(newState)) return;

  const result = await transitionOpportunityState({
    organizationId: viewer.organization.id,
    opportunityId,
    newState,
  });

  if (result.status === "APPLIED") {
    revalidatePath("/app/opportunites");
    revalidatePath(`/app/opportunites/${opportunityId}`);
  }
}
