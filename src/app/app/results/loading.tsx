export default function ResultsLoading() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse" aria-label="Chargement des résultats">
      <div className="h-5 w-24 rounded bg-[var(--panel-soft)]" />
      <div className="mt-4 h-10 w-96 max-w-full rounded bg-[var(--panel-soft)]" />
      <div className="mt-3 h-5 w-[36rem] max-w-full rounded bg-[var(--panel-soft)]" />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="h-44 rounded-2xl border border-[var(--border)] bg-[var(--panel)]" />
        ))}
      </div>
      <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="h-48 rounded-2xl border border-[var(--border)] bg-[var(--panel)]" />
        ))}
      </div>
    </div>
  );
}
