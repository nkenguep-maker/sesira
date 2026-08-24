"use client";

import { ErrorState } from "@/components/sesira/error-state";

export default function ControlError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorState
      title="Impossible de charger le centre de contrôle."
      description="Aucune action n’a été lancée. Réessayez dans quelques instants."
      onRetry={reset}
    />
  );
}
