"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getViewerContext } from "@/lib/auth/viewer";
import { recordAudit } from "@/lib/attention/audit";
import {
  attentionAssignmentSchema,
  attentionDateToTimestamp,
  attentionReopenSchema,
  attentionResolutionSchema,
  canCloseAttentionItem,
  manualQuoteAttentionInputSchema,
} from "@/lib/attention/schema";
import { createClient } from "@/lib/supabase/server";

export type AttentionActionState = {
  error?: string;
  success?: string;
};

export async function createManualQuoteAttentionAction(
  _previousState: AttentionActionState,
  formData: FormData,
): Promise<AttentionActionState> {
  const viewer = await getViewerContext();

  if (!viewer) {
    return { error: "Votre session a expiré. Reconnectez-vous avant de continuer." };
  }

  const parsed = manualQuoteAttentionInputSchema.safeParse({
    quoteId: formData.get("quoteId"),
    title: formData.get("title"),
    explanation: formData.get("explanation"),
    suggestedAction: formData.get("suggestedAction"),
    priority: formData.get("priority"),
    dueOn: formData.get("dueOn"),
  });

  if (!parsed.success) {
    return { error: "Vérifiez le titre, la priorité et la date saisis." };
  }

  const today = new Date().toISOString().slice(0, 10);
  if (parsed.data.dueOn && parsed.data.dueOn < today) {
    return { error: "L’échéance ne peut pas être dans le passé." };
  }

  const organizationId = viewer.organization.id;
  const supabase = await createClient();
  const { data: quote, error: quoteError } = await supabase
    .from("quotes")
    .select("id, customer_id, request_id")
    .eq("organization_id", organizationId)
    .eq("id", parsed.data.quoteId)
    .maybeSingle();

  if (quoteError || !quote) {
    return { error: "Ce devis est introuvable ou n’est plus disponible." };
  }

  const { data: attentionItem, error } = await supabase
    .from("attention_items")
    .insert({
      organization_id: organizationId,
      category: "SALES",
      priority: parsed.data.priority,
      status: "OPEN",
      reason: "MANUAL_REVIEW",
      title: parsed.data.title,
      explanation: parsed.data.explanation ?? null,
      entity_type: "quote",
      entity_id: quote.id,
      suggested_action: parsed.data.suggestedAction ?? null,
      assigned_user_id: viewer.userId,
      due_at: attentionDateToTimestamp(parsed.data.dueOn),
      metadata: { schema_version: 1, created_manually: true },
    })
    .select("id")
    .single();

  if (error || !attentionItem) {
    return { error: "L’élément n’a pas pu être ajouté. Réessayez dans un instant." };
  }

  await recordAudit({
    organizationId,
    action: "attention.created",
    entity: { type: "attention_item", id: attentionItem.id },
    metadata: {
      reason: "MANUAL_REVIEW",
      quote_id: quote.id,
      priority: parsed.data.priority,
      created_manually: true,
    },
  }).catch(() => {
    // Audit failure must not roll back the primary action — a missing
    // audit line is a monitoring signal, not a data-corruption event.
  });

  revalidatePath("/app");
  revalidatePath("/app/attention");
  revalidatePath(`/app/quotes/${quote.id}`);
  revalidatePath(`/app/customers/${quote.customer_id}`);

  if (quote.request_id) {
    revalidatePath(`/app/requests/${quote.request_id}`);
  }

  redirect(`/app/attention?created=1#attention-${attentionItem.id}`);
}

export async function closeAttentionItemAction(
  _previousState: AttentionActionState,
  formData: FormData,
): Promise<AttentionActionState> {
  const viewer = await getViewerContext();

  if (!viewer) {
    return { error: "Votre session a expiré. Reconnectez-vous avant de continuer." };
  }

  const parsed = attentionResolutionSchema.safeParse({
    attentionId: formData.get("attentionId"),
    intent: formData.get("intent"),
  });

  if (!parsed.success) {
    return { error: "Cette action n’est pas disponible." };
  }

  const organizationId = viewer.organization.id;
  const supabase = await createClient();
  const { data: currentItem, error: readError } = await supabase
    .from("attention_items")
    .select("id, status, entity_type, entity_id")
    .eq("organization_id", organizationId)
    .eq("id", parsed.data.attentionId)
    .maybeSingle();

  if (readError || !currentItem) {
    return { error: "Cet élément est introuvable ou n’est plus disponible." };
  }

  if (!canCloseAttentionItem(currentItem.status)) {
    return { error: "Cet élément a déjà été traité." };
  }

  const { data: updatedItem, error: updateError } = await supabase
    .from("attention_items")
    .update({
      status: parsed.data.intent,
      resolved_at: new Date().toISOString(),
    })
    .eq("organization_id", organizationId)
    .eq("id", parsed.data.attentionId)
    .eq("status", currentItem.status)
    .select("id")
    .maybeSingle();

  if (updateError || !updatedItem) {
    return { error: "La décision n’a pas pu être enregistrée. Actualisez puis réessayez." };
  }

  await recordAudit({
    organizationId,
    action: parsed.data.intent === "RESOLVED" ? "attention.resolved" : "attention.dismissed",
    entity: { type: "attention_item", id: parsed.data.attentionId },
    metadata: {
      previous_status: currentItem.status,
      next_status: parsed.data.intent,
      quote_id: currentItem.entity_type === "quote" ? currentItem.entity_id : null,
    },
  }).catch(() => {});

  revalidatePath("/app");
  revalidatePath("/app/attention");

  if (currentItem.entity_type === "quote" && currentItem.entity_id) {
    revalidatePath(`/app/quotes/${currentItem.entity_id}`);
  }

  redirect(`/app/attention?view=resolved#attention-${parsed.data.attentionId}`);
}

/**
 * Assign / re-assign / unassign an Attention item.
 *
 * The DB trigger (`enforce_attention_items_assignment`, migration
 * 20260826130000) rejects a foreign or non-ACTIVE assignee with 23514,
 * so this action only needs to make the intent explicit and record the
 * audit line. Empty `assigneeId` means unassign.
 *
 * Assignment status transitions:
 *   OPEN + assigneeId → IN_PROGRESS (soft claim by the assignee)
 *   Any status + null assignee → status unchanged, assigned_user_id cleared.
 */
export async function assignAttentionItemAction(
  _previousState: AttentionActionState,
  formData: FormData,
): Promise<AttentionActionState> {
  const viewer = await getViewerContext();
  if (!viewer) {
    return { error: "Votre session a expiré. Reconnectez-vous avant de continuer." };
  }

  const parsed = attentionAssignmentSchema.safeParse({
    attentionId: formData.get("attentionId"),
    assigneeId: formData.get("assigneeId"),
  });
  if (!parsed.success) {
    return { error: "Cette action n’est pas disponible." };
  }
  const assignee = parsed.data.assigneeId && parsed.data.assigneeId.length > 0
    ? parsed.data.assigneeId
    : null;

  const organizationId = viewer.organization.id;
  const supabase = await createClient();
  const { data: currentItem, error: readError } = await supabase
    .from("attention_items")
    .select("id, status, assigned_user_id, entity_type, entity_id")
    .eq("organization_id", organizationId)
    .eq("id", parsed.data.attentionId)
    .maybeSingle();
  if (readError || !currentItem) {
    return { error: "Cet élément est introuvable ou n’est plus disponible." };
  }
  if (currentItem.status === "RESOLVED" || currentItem.status === "DISMISSED") {
    return { error: "Cet élément est déjà clos ; rouvrez-le pour l’assigner." };
  }

  const nextStatus =
    assignee !== null && currentItem.status === "OPEN" ? "IN_PROGRESS" : currentItem.status;

  const { data: updated, error: updateError } = await supabase
    .from("attention_items")
    .update({
      assigned_user_id: assignee,
      status: nextStatus,
    })
    .eq("organization_id", organizationId)
    .eq("id", parsed.data.attentionId)
    .eq("status", currentItem.status)
    .select("id")
    .maybeSingle();
  if (updateError || !updated) {
    return { error: "L’assignation n’a pas pu être enregistrée. Actualisez puis réessayez." };
  }

  await recordAudit({
    organizationId,
    action: assignee ? "attention.assigned" : "attention.unassigned",
    entity: { type: "attention_item", id: parsed.data.attentionId },
    metadata: {
      previous_assignee_id: currentItem.assigned_user_id,
      next_assignee_id: assignee,
      previous_status: currentItem.status,
      next_status: nextStatus,
      quote_id: currentItem.entity_type === "quote" ? currentItem.entity_id : null,
    },
  }).catch(() => {});

  revalidatePath("/app");
  revalidatePath("/app/attention");
  return { success: assignee ? "Assigné." : "Désassigné." };
}

/**
 * Reopen a RESOLVED or DISMISSED Attention item. The state-machine
 * trigger rejects reopening from other statuses (22023) as a
 * defense in depth against a race that would try to reopen an
 * already-open row.
 */
export async function reopenAttentionItemAction(
  _previousState: AttentionActionState,
  formData: FormData,
): Promise<AttentionActionState> {
  const viewer = await getViewerContext();
  if (!viewer) {
    return { error: "Votre session a expiré. Reconnectez-vous avant de continuer." };
  }
  const parsed = attentionReopenSchema.safeParse({
    attentionId: formData.get("attentionId"),
  });
  if (!parsed.success) {
    return { error: "Cette action n’est pas disponible." };
  }

  const organizationId = viewer.organization.id;
  const supabase = await createClient();
  const { data: currentItem, error: readError } = await supabase
    .from("attention_items")
    .select("id, status, entity_type, entity_id")
    .eq("organization_id", organizationId)
    .eq("id", parsed.data.attentionId)
    .maybeSingle();
  if (readError || !currentItem) {
    return { error: "Cet élément est introuvable." };
  }
  if (currentItem.status !== "RESOLVED" && currentItem.status !== "DISMISSED") {
    return { error: "Seuls les éléments clos peuvent être rouverts." };
  }

  const { data: updated, error: updateError } = await supabase
    .from("attention_items")
    .update({ status: "OPEN" })
    .eq("organization_id", organizationId)
    .eq("id", parsed.data.attentionId)
    .eq("status", currentItem.status)
    .select("id")
    .maybeSingle();
  if (updateError || !updated) {
    return { error: "La réouverture n’a pas pu être enregistrée. Actualisez puis réessayez." };
  }

  await recordAudit({
    organizationId,
    action: "attention.reopened",
    entity: { type: "attention_item", id: parsed.data.attentionId },
    metadata: {
      previous_status: currentItem.status,
      next_status: "OPEN",
      quote_id: currentItem.entity_type === "quote" ? currentItem.entity_id : null,
    },
  }).catch(() => {});

  revalidatePath("/app");
  revalidatePath("/app/attention");
  return { success: "Rouvert." };
}
