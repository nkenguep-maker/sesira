import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type MetricTone = "violet" | "cyan" | "emerald" | "amber" | "rose" | "blue" | "neutral";

const TONE_CLASSES: Record<MetricTone, string> = {
  violet: "bg-violet-400/10 text-violet-200",
  cyan: "bg-cyan-400/10 text-cyan-200",
  emerald: "bg-emerald-400/10 text-emerald-200",
  amber: "bg-amber-400/10 text-amber-200",
  rose: "bg-rose-400/10 text-rose-200",
  blue: "bg-blue-400/10 text-blue-200",
  neutral: "bg-slate-400/10 text-slate-300",
};

export function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  tone = "violet",
  layout = "compact",
}: {
  icon?: LucideIcon;
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  tone?: MetricTone;
  layout?: "compact" | "stacked";
}) {
  if (layout === "stacked") {
    return (
      <article className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <p className="text-sm text-[var(--muted)]">{label}</p>
          {Icon ? (
            <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${TONE_CLASSES[tone]}`}>
              <Icon className="size-4" aria-hidden="true" />
            </span>
          ) : null}
        </div>
        <p className="mt-4 min-w-0 [overflow-wrap:anywhere] text-3xl font-semibold tracking-tight text-[var(--foreground)]">{value}</p>
        {detail ? <div className="mt-2 text-xs leading-5 text-[var(--muted)]">{detail}</div> : null}
      </article>
    );
  }

  return (
    <article className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5">
      {Icon ? (
        <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${TONE_CLASSES[tone]}`}>
          <Icon className="size-5" aria-hidden="true" />
        </span>
      ) : null}
      <div className="min-w-0">
        <p className="[overflow-wrap:anywhere] text-2xl font-semibold tracking-tight text-[var(--foreground)]">{value}</p>
        <p className="mt-0.5 text-xs text-[var(--muted)]">{label}</p>
        {detail ? <div className="mt-1 text-xs text-[var(--muted)]">{detail}</div> : null}
      </div>
    </article>
  );
}
