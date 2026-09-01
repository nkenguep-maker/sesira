"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export type UpdatePasswordState = {
  error?: string;
};

const passwordSchema = z.object({
  password: z.string().min(8),
  confirmation: z.string().min(8),
}).refine((value) => value.password === value.confirmation, {
  message: "Les mots de passe ne correspondent pas.",
  path: ["confirmation"],
});

export async function updatePasswordAction(
  _previousState: UpdatePasswordState,
  formData: FormData,
): Promise<UpdatePasswordState> {
  const parsed = passwordSchema.safeParse({
    password: formData.get("password"),
    confirmation: formData.get("confirmation"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Vérifiez le nouveau mot de passe." };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return { error: "Ce lien a expiré ou n’est plus valide. Demandez un nouveau lien depuis la page de connexion." };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    console.error("[auth:password-recovery] update failed", {
      code: error.code,
      status: error.status,
    });
    return { error: "Impossible de modifier le mot de passe pour le moment." };
  }

  redirect("/app");
}
