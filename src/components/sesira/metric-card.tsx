import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type MetricTone = "violet" | "cyan" | "emerald" | "amber" | "rose" | "blue" | "neutral";

export function MetricCard({
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
  const decisive = tone === "blue";
  const classes = decisive
    ? "bg-[var(--ink)] text-white"
    : tone === "amber"
      ? "bg-[var(--sand)] text-[var(--ink)]"
      : "bg-[var(--surface)] text-[var(--ink)]";

  if (layout === "stacked") {
    return (
      <article className={`p-5 sm:px-6 ${classes}`}>
        <p className={`text-[0.78125rem] ${decisive ? "text-white/65" : "text-[var(--ink-mute)]"}`}>{label}</p>
        <p className="mt-2 min-w-0 [overflow-wrap:anywhere] font-[family-name:var(--font-display)] text-[2rem] font-semibold leading-none tracking-[-0.03em]">{value}</p>
        {detail ? <div className={`mt-2 text-[0.78125rem] leading-5 ${decisive ? "text-[var(--blue-light)]" : "text-[var(--ink-soft)]"}`}>{detail}</div> : null}
      </article>
    );
  }

  return (
    <article className={`flex min-h-[104px] items-center p-5 sm:px-6 ${classes}`}>
      <div className="min-w-0">
        <p className="[overflow-wrap:anywhere] font-[family-name:var(--font-display)] text-[2rem] font-semibold leading-none tracking-[-0.03em]">{value}</p>
        <p className={`mt-2 text-[0.78125rem] ${decisive ? "text-white/65" : "text-[var(--ink-mute)]"}`}>{label}</p>
        {detail ? <div className={`mt-1 text-[0.78125rem] ${decisive ? "text-[var(--blue-light)]" : "text-[var(--ink-soft)]"}`}>{detail}</div> : null}
      </div>
    </article>
  );
}
