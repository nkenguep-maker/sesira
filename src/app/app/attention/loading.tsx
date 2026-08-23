export default function AttentionLoading() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse" aria-label="Chargement des éléments à traiter">
      <div className="h-5 w-36 rounded bg-[var(--panel-soft)]" />
      <div className="mt-4 h-10 w-72 max-w-full rounded bg-[var(--panel-soft)]" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-24 rounded-2xl border border-[var(--border)] bg-[var(--panel)]" />
        ))}
      </div>
      <div className="mt-8 grid gap-4">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="h-72 rounded-2xl border border-[var(--border)] bg-[var(--panel)]" />
        ))}
      </div>
    </div>
  );
}
