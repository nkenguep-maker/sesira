export default function SettingsLoading() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse" aria-label="Chargement des réglages">
      <div className="h-5 w-24 rounded bg-[var(--panel-soft)]" />
      <div className="mt-4 h-10 w-96 max-w-full rounded bg-[var(--panel-soft)]" />
      <div className="mt-3 h-5 w-[38rem] max-w-full rounded bg-[var(--panel-soft)]" />
      <div className="mt-8 flex gap-2 overflow-hidden">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="h-10 w-32 shrink-0 rounded-xl bg-[var(--panel-soft)]" />
        ))}
      </div>
      <div className="mt-6 space-y-6">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="h-72 rounded-2xl border border-[var(--border)] bg-[var(--panel)]" />
        ))}
      </div>
    </div>
  );
}
