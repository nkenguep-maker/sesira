"use server";

import { revalidatePath } from "next/cache";

import { getViewerContext } from "@/lib/auth/viewer";
import { organizationSettingsSchema } from "@/lib/settings/schema";
import { canManageOrganization } from "@/lib/settings/view-model";
import { createClient } from "@/lib/supabase/server";

export type OrganizationSettingsActionState = {
  status?: "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<"name" | "timezone" | "currency", string>>;
  revision: number;
};

export async function updateOrganizationSettingsAction(
  previousState: OrganizationSettingsActionState,
  formData: FormData,
): Promise<OrganizationSettingsActionState> {
  const viewer = await getViewerContext();
  const revision = previousState.revision + 1;

  if (!viewer) {
    return {
      status: "error",
      message: "Votre session a expiré. Reconnectez-vous avant de continuer.",
      revision,
    };
  }

  if (!canManageOrganization(viewer.role)) {
    return {
      status: "error",
      message: "Seuls le propriétaire et les administrateurs peuvent modifier l’entreprise.",
      revision,
    };
  }

  const parsed = organizationSettingsSchema.safeParse({
    name: formData.get("name"),
    timezone: formData.get("timezone"),
    currency: formData.get("currency"),
  });

  if (!parsed.success) {
    const fields = parsed.error.flatten().fieldErrors;
    return {
      status: "error",
      message: "Vérifiez les informations indiquées.",
      fieldErrors: {
        name: fields.name?.[0],
        timezone: fields.timezone?.[0],
        currency: fields.currency?.[0],
      },
      revision,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .update({
      name: parsed.data.name,
      timezone: parsed.data.timezone,
      currency: parsed.data.currency,
    })
    .eq("id", viewer.organization.id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return {
      status: "error",
      message: "Les réglages n’ont pas pu être enregistrés. Réessayez dans un instant.",
      revision,
    };
  }

  revalidatePath("/app");
  revalidatePath("/app/settings");

  return {
    status: "success",
    message: "Les informations de l’entreprise sont enregistrées.",
    revision,
  };
}
