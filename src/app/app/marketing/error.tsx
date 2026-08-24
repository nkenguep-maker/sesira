"use client";

import { ErrorState } from "@/components/sesira/error-state";

export default function MarketingError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorState
      title="Impossible de charger le Marketing."
      description="Aucun contenu ne sera créé, planifié ou publié pendant cette erreur."
      onRetry={reset}
    />
  );
}
