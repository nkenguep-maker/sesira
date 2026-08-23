"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export type AuthActionState = {
  error?: string;
  success?: string;
};

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

const signupSchema = loginSchema.extend({
  fullName: z.string().trim().min(2).max(120),
  organizationName: z.string().trim().min(2).max(160),
});

export async function loginAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Vérifiez votre email et votre mot de passe." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: "Connexion impossible. Vérifiez vos identifiants." };
  }

  redirect("/app");
}

export async function signupAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    fullName: formData.get("fullName"),
    organizationName: formData.get("organizationName"),
  });

  if (!parsed.success) {
    return { error: "Complétez tous les champs. Le mot de passe doit contenir au moins 8 caractères." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
        organization_name: parsed.data.organizationName,
      },
    },
  });

  if (error) {
    return { error: "Création du compte impossible pour le moment." };
  }

  if (!data.session) {
    return { success: "Compte créé. Confirmez votre adresse email avant de vous connecter." };
  }

  redirect("/app");
}
