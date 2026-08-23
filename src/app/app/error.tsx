"use client";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-rose-400/20 bg-rose-400/10 p-8">
      <h2 className="text-xl font-semibold">Impossible de charger les dernières données.</h2>
      <p className="mt-3 text-sm text-rose-100/70">Vos données existantes restent disponibles. Réessayez dans quelques instants.</p>
      <button onClick={reset} className="mt-6 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950">
        Réessayer
      </button>
    </div>
  );
}
