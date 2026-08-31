"use client";

import { ErrorState } from "@/components/sesira/error-state";

export default function ConnectionsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorState title="Impossible de vérifier les connexions." description="Aucune connexion n’a été modifiée. Réessayez dans quelques instants." onRetry={reset} />;
}
