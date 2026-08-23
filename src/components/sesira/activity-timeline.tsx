export type ActivityTimelineItem = {
  id: string;
  title: string;
  date: string;
  detail?: string | null;
  meta?: string | null;
  tone?: "violet" | "cyan" | "emerald" | "amber" | "slate";
};

const toneClasses = {
  violet: "bg-violet-400 ring-violet-400/15",
  cyan: "bg-cyan-400 ring-cyan-400/15",
  emerald: "bg-emerald-400 ring-emerald-400/15",
  amber: "bg-amber-400 ring-amber-400/15",
  slate: "bg-slate-500 ring-slate-500/15",
};

export function ActivityTimeline({
  items,
  empty,
  className = "",
}: {
  items: ActivityTimelineItem[];
  empty: string;
  className?: string;
}) {
  if (!items.length) {
    return <p className={`text-sm leading-6 text-[var(--muted)] ${className}`}>{empty}</p>;
  }

  return (
    <ol className={`space-y-0 ${className}`}>
      {items.map((item, index) => (
        <li key={item.id} className="relative flex gap-4 pb-6 last:pb-0">
          {index < items.length - 1 ? (
            <span className="absolute left-[5px] top-3 h-full w-px bg-[var(--border)]" aria-hidden="true" />
          ) : null}
          <span
            className={`relative mt-1.5 size-2.5 shrink-0 rounded-full ring-4 ${toneClasses[item.tone ?? "violet"]}`}
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <p className="text-sm font-medium text-slate-100">{item.title}</p>
              <time className="shrink-0 text-xs text-[var(--muted)]">{item.date}</time>
            </div>
            {item.detail ? <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.detail}</p> : null}
            {item.meta ? <p className="mt-2 text-xs text-slate-500">{item.meta}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
