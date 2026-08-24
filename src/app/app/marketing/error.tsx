"use client";

import { AlertCircle } from "lucide-react";

export default function MarketingError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-rose-400/20 bg-rose-400/10 p-8 text-center">
      <AlertCircle className="mx-auto size-9 text-rose-300" />
      <h2 className="mt-5 text-xl font-semibold">Impossible de charger le Marketing.</h2>
      <p className="mt-3 text-sm leading-6 text-rose-100/70">
        Aucun contenu ne sera créé, planifié ou publié pendant cette erreur.
      </p>
      <button onClick={reset} className="mt-6 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950">
        Réessayer
      </button>
    </div>
  );
}
