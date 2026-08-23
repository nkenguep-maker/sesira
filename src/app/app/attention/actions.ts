"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getViewerContext } from "@/lib/auth/viewer";
import {
  attentionDateToTimestamp,
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

  revalidatePath("/app");
  revalidatePath("/app/attention");

  if (currentItem.entity_type === "quote" && currentItem.entity_id) {
    revalidatePath(`/app/quotes/${currentItem.entity_id}`);
  }

  redirect(`/app/attention?view=resolved#attention-${parsed.data.attentionId}`);
}
