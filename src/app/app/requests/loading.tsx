export default function RequestsLoading() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse" aria-label="Chargement des demandes">
      <div className="h-5 w-32 rounded bg-[var(--panel-soft)]" />
      <div className="mt-4 h-10 w-80 max-w-full rounded bg-[var(--panel-soft)]" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-24 rounded-2xl border border-[var(--border)] bg-[var(--panel)]" />
        ))}
      </div>
      <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)]">
        <div className="h-20 border-b border-[var(--border)] bg-[var(--panel-soft)]/40" />
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="h-20 border-b border-[var(--border)] last:border-b-0" />
        ))}
      </div>
    </div>
  );
}
