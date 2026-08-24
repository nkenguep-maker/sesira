"use client";

import { ErrorState } from "@/components/sesira/error-state";

export default function SettingsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorState
      title="Impossible de charger les réglages."
      description="Aucune modification n’a été appliquée. Réessayez dans quelques instants."
      onRetry={reset}
    />
  );
}
