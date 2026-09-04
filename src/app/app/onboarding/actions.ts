"use server";

import type { OnboardingDraft } from "@/lib/core/ui-contracts";
import { getViewerContext } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

export type SaveOnboardingResult =
  | { ok: true; savedAt: string }
  | { ok: false; error: string };

const MAX_FIELD_LENGTH = 240;

function sanitizeDraft(input: OnboardingDraft): OnboardingDraft | null {
  const entries = Object.entries(input).map(([key, value]) => [key, typeof value === "string" ? value.trim().slice(0, MAX_FIELD_LENGTH) : ""]);
  const draft = Object.fromEntries(entries) as OnboardingDraft;
  return draft.companyName ? draft : null;
}

export async function saveOnboardingDraftAction(input: OnboardingDraft): Promise<SaveOnboardingResult> {
  const viewer = await getViewerContext();
  if (!viewer) return { ok: false, error: "Session introuvable. Reconnectez-vous puis réessayez." };
  if (!['OWNER', 'ADMIN'].includes(viewer.role)) {
    return { ok: false, error: "Seuls un propriétaire ou un administrateur peut modifier la configuration de l’entreprise." };
  }

  const draft = sanitizeDraft(input);
  if (!draft) return { ok: false, error: "Le nom de l’entreprise est requis." };

  const supabase = await createClient();
  const { data: organization, error: readError } = await supabase
    .from("organizations")
    .select("config")
    .eq("id", viewer.organization.id)
    .single();

  if (readError || !organization) {
    console.error("[onboarding] unable to read organization config:", readError?.message);
    return { ok: false, error: "Impossible de charger la configuration actuelle." };
  }

  const currentConfig = organization.config && typeof organization.config === "object" && !Array.isArray(organization.config)
    ? organization.config as Record<string, Json | undefined>
    : {};
  const savedAt = new Date().toISOString();
  const nextConfig: Json = {
    ...currentConfig,
    onboarding: draft as unknown as Json,
    onboarding_saved_at: savedAt,
  };

  const { error: updateError } = await supabase
    .from("organizations")
    .update({
      name: draft.companyName,
      config: nextConfig,
      updated_at: savedAt,
    })
    .eq("id", viewer.organization.id);

  if (updateError) {
    console.error("[onboarding] unable to save organization config:", updateError.message);
    return { ok: false, error: "La sauvegarde a échoué. Aucune connexion ni automatisation n’a été modifiée." };
  }

  return { ok: true, savedAt };
}
