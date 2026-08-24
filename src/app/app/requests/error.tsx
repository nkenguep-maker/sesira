"use client";

import { ErrorState } from "@/components/sesira/error-state";

export default function RequestsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorState
      title="Impossible de charger les demandes."
      description="Vos données existantes restent disponibles. Réessayez dans quelques instants."
      onRetry={reset}
    />
  );
}
