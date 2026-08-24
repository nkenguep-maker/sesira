"use client";

import { AlertTriangle } from "lucide-react";

export function ErrorState({
  title,
  description,
  onRetry,
  retryLabel = "Réessayer",
}: {
  title: string;
  description: string;
  onRetry: () => void;
  retryLabel?: string;
}) {
  return (
    <div className="mx-auto max-w-3xl rounded-2xl border border-rose-400/20 bg-rose-400/10 px-6 py-12 text-center">
      <AlertTriangle className="mx-auto size-9 text-rose-300" aria-hidden="true" />
      <h1 className="mt-5 text-xl font-semibold text-[var(--foreground)]">{title}</h1>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-rose-100/75">{description}</p>
      <button type="button" onClick={onRetry} className="sesira-secondary-action mt-6 border-rose-300/25 hover:bg-rose-300/10">
        {retryLabel}
      </button>
    </div>
  );
}
