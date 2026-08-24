export default function AutomationsLoading() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse" aria-label="Chargement des automatisations">
      <div className="h-5 w-32 rounded bg-[var(--panel-soft)]" />
      <div className="mt-4 h-10 w-[38rem] max-w-full rounded bg-[var(--panel-soft)]" />
      <div className="mt-3 h-5 w-[42rem] max-w-full rounded bg-[var(--panel-soft)]" />
      <div className="mt-8 h-28 rounded-2xl border border-[var(--border)] bg-[var(--panel)]" />
      <div className="mt-8 grid gap-5 xl:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-[34rem] rounded-2xl border border-[var(--border)] bg-[var(--panel)]" />
        ))}
      </div>
    </div>
  );
}
