"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getViewerContext } from "@/lib/auth/viewer";
import {
  canChangeQuoteStatus,
  isQuoteStatus,
  quoteDateToTimestamp,
  quoteInputSchema,
  quoteMetadata,
  quoteStatusInputSchema,
} from "@/lib/quotes/schema";
import { createClient } from "@/lib/supabase/server";

export type QuoteActionState = {
  error?: string;
  success?: string;
};

export async function createQuoteAction(
  _previousState: QuoteActionState,
  formData: FormData,
): Promise<QuoteActionState> {
  const viewer = await getViewerContext();

  if (!viewer) {
    return { error: "Votre session a expiré. Reconnectez-vous avant de continuer." };
  }

  const parsed = quoteInputSchema.safeParse({
    customerId: formData.get("customerId"),
    requestId: formData.get("requestId"),
    ownerUserId: formData.get("ownerUserId"),
    title: formData.get("title"),
    reference: formData.get("reference"),
    amount: formData.get("amount"),
    expiresOn: formData.get("expiresOn"),
    nextActionOn: formData.get("nextActionOn"),
  });

  if (!parsed.success) {
    return { error: "Vérifiez le client, le montant et les dates saisis." };
  }

  const today = new Date().toISOString().slice(0, 10);

  if (
    (parsed.data.expiresOn && parsed.data.expiresOn < today) ||
    (parsed.data.nextActionOn && parsed.data.nextActionOn < today)
  ) {
    return { error: "Les prochaines dates ne peuvent pas être dans le passé." };
  }

  const supabase = await createClient();
  const organizationId = viewer.organization.id;
  const customerPromise = supabase
    .from("customers")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("id", parsed.data.customerId)
    .maybeSingle();
  const requestPromise = parsed.data.requestId
    ? supabase
        .from("requests")
        .select("id, customer_id")
        .eq("organization_id", organizationId)
        .eq("id", parsed.data.requestId)
        .maybeSingle()
    : Promise.resolve({ data: null, error: null });
  const ownerPromise = parsed.data.ownerUserId
    ? supabase
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", organizationId)
        .eq("user_id", parsed.data.ownerUserId)
        .eq("status", "ACTIVE")
        .maybeSingle()
    : Promise.resolve({ data: null, error: null });

  const [customerResult, requestResult, ownerResult] = await Promise.all([
    customerPromise,
    requestPromise,
    ownerPromise,
  ]);

  if (customerResult.error || !customerResult.data) {
    return { error: "Ce client n’est pas disponible dans votre organisation." };
  }

  if (
    requestResult.error ||
    (parsed.data.requestId &&
      (!requestResult.data || requestResult.data.customer_id !== parsed.data.customerId))
  ) {
    return { error: "Cette demande n’est pas liée au client choisi." };
  }

  if (ownerResult.error || (parsed.data.ownerUserId && !ownerResult.data)) {
    return { error: "Ce propriétaire n’est plus membre de votre organisation." };
  }

  const { data: quote, error } = await supabase
    .from("quotes")
    .insert({
      organization_id: organizationId,
      customer_id: parsed.data.customerId,
      request_id: parsed.data.requestId ?? null,
      owner_user_id: parsed.data.ownerUserId ?? null,
      title: parsed.data.title,
      reference: parsed.data.reference ?? null,
      amount: parsed.data.amount,
      currency: "EUR",
      status: "DRAFT",
      sent_at: null,
      expires_at: quoteDateToTimestamp(parsed.data.expiresOn),
      next_action_at: quoteDateToTimestamp(parsed.data.nextActionOn),
      metadata: quoteMetadata(),
    })
    .select("id")
    .single();

  if (error || !quote) {
    return { error: "Le devis n’a pas pu être créé. Réessayez dans un instant." };
  }

  revalidatePath("/app");
  revalidatePath("/app/quotes");
  revalidatePath(`/app/customers/${parsed.data.customerId}`);

  if (parsed.data.requestId) {
    revalidatePath(`/app/requests/${parsed.data.requestId}`);
  }

  redirect(`/app/quotes/${quote.id}?created=1`);
}

export async function updateQuoteStatusAction(
  _previousState: QuoteActionState,
  formData: FormData,
): Promise<QuoteActionState> {
  const viewer = await getViewerContext();

  if (!viewer) {
    return { error: "Votre session a expiré. Reconnectez-vous avant de continuer." };
  }

  const parsed = quoteStatusInputSchema.safeParse({
    quoteId: formData.get("quoteId"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return { error: "Ce changement de statut n’est pas disponible." };
  }

  const supabase = await createClient();
  const organizationId = viewer.organization.id;
  const { data: currentQuote, error: quoteError } = await supabase
    .from("quotes")
    .select("id, status, sent_at, customer_id, request_id")
    .eq("organization_id", organizationId)
    .eq("id", parsed.data.quoteId)
    .maybeSingle();

  if (quoteError || !currentQuote || !isQuoteStatus(currentQuote.status)) {
    return { error: "Ce devis est introuvable ou n’est plus disponible." };
  }

  if (!canChangeQuoteStatus(currentQuote.status, parsed.data.status)) {
    return { error: "Ce passage de statut n’est pas autorisé." };
  }

  const update = parsed.data.status === "SENT" && !currentQuote.sent_at
    ? { status: parsed.data.status, sent_at: new Date().toISOString() }
    : { status: parsed.data.status };
  const { data: updatedQuote, error } = await supabase
    .from("quotes")
    .update(update)
    .eq("organization_id", organizationId)
    .eq("id", parsed.data.quoteId)
    .eq("status", currentQuote.status)
    .select("id")
    .maybeSingle();

  if (error || !updatedQuote) {
    return { error: "Le statut n’a pas pu être mis à jour. Actualisez puis réessayez." };
  }

  revalidatePath("/app");
  revalidatePath("/app/quotes");
  revalidatePath(`/app/quotes/${parsed.data.quoteId}`);
  revalidatePath(`/app/customers/${currentQuote.customer_id}`);

  if (currentQuote.request_id) {
    revalidatePath(`/app/requests/${currentQuote.request_id}`);
  }

  return {
    success: parsed.data.status === "SENT" ? "Devis marqué comme envoyé." : "Statut mis à jour.",
  };
}
