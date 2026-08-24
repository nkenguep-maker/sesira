"use client";

import { ErrorState } from "@/components/sesira/error-state";

export default function AutomationsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorState
      title="Impossible de charger les automatisations."
      description="Aucun état incomplet ne sera présenté comme une activité réelle. Réessayez dans quelques instants."
      onRetry={reset}
    />
  );
}
