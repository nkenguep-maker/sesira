"use client";

import { ErrorState } from "@/components/sesira/error-state";

export default function ResultsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorState
      title="Impossible de charger les résultats."
      description="Aucun chiffre incomplet ne sera affiché comme un résultat réel. Réessayez dans quelques instants."
      onRetry={reset}
    />
  );
}
