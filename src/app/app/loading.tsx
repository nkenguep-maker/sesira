export default function AppLoading() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse">
      <div className="h-5 w-24 rounded bg-[var(--panel-soft)]" />
      <div className="mt-4 h-10 w-80 max-w-full rounded bg-[var(--panel-soft)]" />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-32 rounded-2xl border border-[var(--border)] bg-[var(--panel)]" />
        ))}
      </div>
    </div>
  );
}
