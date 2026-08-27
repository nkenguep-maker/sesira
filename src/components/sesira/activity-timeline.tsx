export type ActivityTimelineItem = {
  id: string;
  title: string;
  date: string;
  detail?: string | null;
  meta?: string | null;
  actor?: string;
  source?: string;
  entity?: { label: string; href?: string };
  metadata?: string[];
  tone?: "violet" | "cyan" | "emerald" | "amber" | "slate";
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
    <ol className={`border-t border-[var(--line-soft)] ${className}`}>
      {items.map((item) => {
        const stopped = /arrêt|attention|décision/i.test(`${item.title} ${item.detail ?? ""}`);
        return (
        <li key={item.id} className="grid gap-2 border-b border-[var(--line-soft)] py-4 sm:grid-cols-[96px_minmax(0,1fr)] sm:gap-5">
          <time className="text-[0.75rem] leading-5 text-[var(--ink-mute)]">{item.date}</time>
          <div className="min-w-0">
            <p className={`text-sm ${stopped ? "font-semibold text-[var(--blue)]" : "font-medium text-[var(--ink)]"}`}>{item.title}</p>
            {item.detail ? <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.detail}</p> : null}
            {item.meta ? <p className="mt-2 text-xs text-[var(--muted)]">{item.meta}</p> : null}
            {item.actor || item.source || item.entity ? (
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--muted)]">
                {item.actor ? <span>Par {item.actor}</span> : item.source ? <span>{item.source}</span> : null}
                {(item.actor || item.source) && item.entity ? <span aria-hidden="true">·</span> : null}
                {item.entity?.href ? (
                  <a className="max-w-full truncate font-medium text-[var(--blue)] transition hover:underline" href={item.entity.href}>
                    {item.entity.label}
                  </a>
                ) : item.entity ? (
                  <span className="max-w-full truncate">{item.entity.label}</span>
                ) : null}
              </div>
            ) : null}
            {item.metadata?.length ? (
              <ul className="mt-3 flex flex-wrap gap-2" aria-label="Informations liées">
                {item.metadata.map((metadata) => (
                  <li key={metadata} className="border border-[var(--line)] bg-[var(--paper)] px-2.5 py-1 text-xs text-[var(--ink-soft)]">
                    {metadata}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </li>
      )})}
    </ol>
  );
}
