"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getViewerContext } from "@/lib/auth/viewer";
import {
  canChangeRequestStatus,
  createRequestData,
  isRequestStatus,
  requestInputSchema,
  requestStatusInputSchema,
} from "@/lib/requests/schema";
import { createClient } from "@/lib/supabase/server";

export type RequestActionState = {
  error?: string;
  success?: string;
};

export async function createRequestAction(
  _previousState: RequestActionState,
  formData: FormData,
): Promise<RequestActionState> {
  const viewer = await getViewerContext();

  if (!viewer) {
    return { error: "Votre session a expiré. Reconnectez-vous avant de continuer." };
  }

  const parsed = requestInputSchema.safeParse({
    customerId: formData.get("customerId"),
    serviceCatalogItemId: formData.get("serviceCatalogItemId"),
    title: formData.get("title"),
    source: formData.get("source"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    return { error: "Vérifiez le client, le titre et les informations saisis." };
  }

  const supabase = await createClient();
  const organizationId = viewer.organization.id;
  const customerPromise = supabase
    .from("customers")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("id", parsed.data.customerId)
    .maybeSingle();
  const servicePromise = parsed.data.serviceCatalogItemId
    ? supabase
        .from("service_catalog_items")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("id", parsed.data.serviceCatalogItemId)
        .eq("active", true)
        .maybeSingle()
    : Promise.resolve({ data: null, error: null });

  const [customerResult, serviceResult] = await Promise.all([customerPromise, servicePromise]);

  if (customerResult.error || !customerResult.data) {
    return { error: "Ce client n’est pas disponible dans votre organisation." };
  }

  if (serviceResult.error || (parsed.data.serviceCatalogItemId && !serviceResult.data)) {
    return { error: "Ce type de demande n’est plus disponible." };
  }

  const { data: request, error } = await supabase
    .from("requests")
    .insert({
      organization_id: organizationId,
      customer_id: parsed.data.customerId,
      service_catalog_item_id: parsed.data.serviceCatalogItemId ?? null,
      title: parsed.data.title,
      source: parsed.data.source,
      status: "NEW",
      data: createRequestData(parsed.data.description),
    })
    .select("id")
    .single();

  if (error || !request) {
    return { error: "La demande n’a pas pu être créée. Réessayez dans un instant." };
  }

  revalidatePath("/app");
  revalidatePath("/app/requests");
  revalidatePath(`/app/customers/${parsed.data.customerId}`);
  redirect(`/app/requests/${request.id}?created=1`);
}

export async function updateRequestStatusAction(
  _previousState: RequestActionState,
  formData: FormData,
): Promise<RequestActionState> {
  const viewer = await getViewerContext();

  if (!viewer) {
    return { error: "Votre session a expiré. Reconnectez-vous avant de continuer." };
  }

  const parsed = requestStatusInputSchema.safeParse({
    requestId: formData.get("requestId"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return { error: "Ce changement de statut n’est pas disponible." };
  }

  const supabase = await createClient();
  const organizationId = viewer.organization.id;
  const { data: currentRequest, error: requestError } = await supabase
    .from("requests")
    .select("id, status, customer_id")
    .eq("organization_id", organizationId)
    .eq("id", parsed.data.requestId)
    .maybeSingle();

  if (requestError || !currentRequest || !isRequestStatus(currentRequest.status)) {
    return { error: "Cette demande est introuvable ou n’est plus disponible." };
  }

  if (!canChangeRequestStatus(currentRequest.status, parsed.data.status)) {
    return { error: "Ce passage de statut n’est pas autorisé." };
  }

  const { data: updatedRequest, error } = await supabase
    .from("requests")
    .update({ status: parsed.data.status })
    .eq("organization_id", organizationId)
    .eq("id", parsed.data.requestId)
    .eq("status", currentRequest.status)
    .select("id")
    .maybeSingle();

  if (error || !updatedRequest) {
    return { error: "Le statut n’a pas pu être mis à jour. Actualisez puis réessayez." };
  }

  revalidatePath("/app");
  revalidatePath("/app/requests");
  revalidatePath(`/app/requests/${parsed.data.requestId}`);

  if (currentRequest.customer_id) {
    revalidatePath(`/app/customers/${currentRequest.customer_id}`);
  }

  return { success: "Statut mis à jour." };
}
