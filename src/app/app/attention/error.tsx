"use client";

import { ErrorState } from "@/components/sesira/error-state";

export default function AttentionError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorState
      title="Impossible de charger les éléments à traiter."
      description="Vos décisions existantes restent enregistrées. Réessayez dans quelques instants."
      onRetry={reset}
    />
  );
}
