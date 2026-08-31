import { OnboardingExperience } from "@/components/onboarding/onboarding-experience";
import { getViewerContext } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  const [viewer, params] = await Promise.all([getViewerContext(), searchParams]);
  if (!viewer) return null;
  const supabase = await createClient();
  const [members, quotes, integrations] = await Promise.all([
    supabase.from("organization_members").select("id, user_id, role, status").eq("organization_id", viewer.organization.id),
    supabase.from("quotes").select("id", { count: "exact", head: true }).eq("organization_id", viewer.organization.id),
    supabase.from("integrations").select("id, provider, type, status").eq("organization_id", viewer.organization.id),
  ]);
  const userIds = (members.data ?? []).map((member) => member.user_id);
  const profiles = userIds.length ? await supabase.from("profiles").select("id, full_name").in("id", userIds) : { data: [], error: null };
  if (members.error || quotes.error || integrations.error || profiles.error) throw new Error("Impossible de charger la configuration de votre espace.");
  const names = new Map((profiles.data ?? []).map((profile) => [profile.id, profile.full_name]));
  const parsedStep = Number(params.step);
  const initialStep = Number.isInteger(parsedStep) && parsedStep >= 1 && parsedStep <= 6 ? parsedStep : 1;
  return <OnboardingExperience key={initialStep} initialStep={initialStep} organization={viewer.organization} members={(members.data ?? []).map((member) => ({ name: names.get(member.user_id) ?? (member.user_id === viewer.userId ? viewer.email?.split("@")[0] : null) ?? "Membre de l’équipe", role: member.role, status: member.status }))} quoteCount={quotes.count ?? 0} integrations={(integrations.data ?? []).map((integration) => ({ provider: integration.provider, type: integration.type, status: integration.status }))} />;
}
