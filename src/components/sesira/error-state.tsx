"use client";

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
    <div className="mx-auto max-w-3xl border border-[var(--danger)] bg-[var(--danger-soft)] px-6 py-12 text-center">
      <h1 className="font-[family-name:var(--font-display)] text-base font-semibold text-[var(--ink)]">{title}</h1>
      <p className="mx-auto mt-2 max-w-lg text-[0.84375rem] leading-6 text-[var(--ink-soft)]">{description}</p>
      <button type="button" onClick={onRetry} className="sesira-secondary-action mt-6 border-[var(--danger)] text-[var(--danger)]">
        {retryLabel}
      </button>
    </div>
  );
}
