"use client";

import { ErrorState } from "@/components/sesira/error-state";

export default function OnboardingError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="onboarding-content"><ErrorState title="Impossible de charger la configuration." description="Aucun réglage n’a été enregistré ou modifié. Réessayez dans quelques instants." onRetry={reset} /></main>;
}
