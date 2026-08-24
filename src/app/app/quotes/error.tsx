"use client";

import { ErrorState } from "@/components/sesira/error-state";

export default function QuotesError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorState
      title="Impossible de récupérer les devis."
      description="Vos données existantes restent disponibles. Réessayez dans quelques instants."
      onRetry={reset}
    />
  );
}
