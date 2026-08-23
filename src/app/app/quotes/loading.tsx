export default function QuotesLoading() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse" aria-label="Chargement des devis">
      <div className="h-4 w-32 rounded bg-slate-800" />
      <div className="mt-4 h-10 w-52 rounded bg-slate-800" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-24 rounded-2xl bg-[var(--panel)]" />)}
      </div>
      <div className="mt-6 h-[420px] rounded-2xl border border-[var(--border)] bg-[var(--panel)]" />
    </div>
  );
}
