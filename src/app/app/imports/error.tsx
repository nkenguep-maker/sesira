"use client";

import { ErrorState } from "@/components/sesira/error-state";

export default function ImportsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="imports-content"><ErrorState title="Impossible de charger les imports." description="Aucun fichier n’a été envoyé ni modifié. Réessayez dans quelques instants." onRetry={reset} /></main>;
}
