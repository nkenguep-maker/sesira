"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getViewerContext } from "@/lib/auth/viewer";
import { customerInputSchema } from "@/lib/customers/schema";
import { createClient } from "@/lib/supabase/server";

export type CustomerActionState = {
  error?: string;
};

export async function createCustomerAction(
  _previousState: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  const viewer = await getViewerContext();

  if (!viewer) {
    return { error: "Votre session a expiré. Reconnectez-vous avant de continuer." };
  }

  const parsed = customerInputSchema.safeParse({
    type: formData.get("type"),
    displayName: formData.get("displayName"),
    companyName: formData.get("companyName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    return { error: "Vérifiez le nom et les coordonnées saisis." };
  }

  const supabase = await createClient();
  const { data: customer, error } = await supabase
    .from("customers")
    .insert({
      organization_id: viewer.organization.id,
      type: parsed.data.type,
      display_name: parsed.data.displayName,
      company_name: parsed.data.companyName ?? null,
      email: parsed.data.email ?? null,
      phone: parsed.data.phone ?? null,
    })
    .select("id")
    .single();

  if (error || !customer) {
    return { error: "Le client n’a pas pu être créé. Réessayez dans un instant." };
  }

  revalidatePath("/app");
  revalidatePath("/app/customers");
  redirect(`/app/customers/${customer.id}?created=1`);
}
