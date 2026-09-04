import { OnboardingExperience } from "@/components/onboarding/onboarding-experience";
import type { OnboardingDraft } from "@/lib/core/ui-contracts";
import { getViewerContext } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function readSavedDraft(config: unknown): Partial<OnboardingDraft> | null {
  if (!config || typeof config !== "object" || Array.isArray(config)) return null;
  const onboarding = (config as Record<string, unknown>).onboarding;
  if (!onboarding || typeof onboarding !== "object" || Array.isArray(onboarding)) return null;

  const allowedKeys: Array<keyof OnboardingDraft> = [
    "companyName", "industry", "teamSize", "primaryRole", "primaryTool", "importFormat",
    "emailProvider", "professionalEmail", "followUpDelay", "defaultOwner", "observationPeriod", "primaryGoal",
  ];
  const source = onboarding as Record<string, unknown>;
  const draft: Partial<OnboardingDraft> = {};
  for (const key of allowedKeys) {
    if (typeof source[key] === "string") draft[key] = source[key] as string;
  }
  return draft;
}

export default async function OnboardingPage() {
  const viewer = await getViewerContext();
  if (!viewer) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("organizations")
    .select("config")
    .eq("id", viewer.organization.id)
    .maybeSingle();

  return (
    <OnboardingExperience
      initialDraft={readSavedDraft(data?.config)}
      canSave={['OWNER', 'ADMIN'].includes(viewer.role)}
    />
  );
}
