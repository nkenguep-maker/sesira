"use client";

import { AlertCircle } from "lucide-react";

export default function QuotesError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-rose-400/20 bg-rose-400/10 p-8 text-center">
      <AlertCircle className="mx-auto size-8 text-rose-300" />
      <h1 className="mt-5 text-xl font-semibold">Impossible de récupérer les devis.</h1>
      <p className="mt-2 text-sm leading-6 text-rose-100/70">Vos données existantes restent disponibles. Réessayez dans quelques instants.</p>
      <button onClick={reset} className="mt-6 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950">Réessayer</button>
    </div>
  );
}
