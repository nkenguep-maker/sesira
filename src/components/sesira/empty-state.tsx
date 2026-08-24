import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  tone = "violet",
  contained = true,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  tone?: "violet" | "emerald" | "neutral";
  contained?: boolean;
}) {
  const iconTone = {
    violet: "text-violet-300",
    emerald: "text-emerald-300",
    neutral: "text-[var(--muted)]",
  }[tone];

  return (
    <div
      className={`${contained ? "rounded-2xl border border-[var(--border)] bg-[var(--panel)]" : ""} px-6 py-16 text-center`}
    >
      <Icon className={`mx-auto size-10 ${iconTone}`} aria-hidden="true" />
      <p className="mt-5 font-medium text-[var(--foreground)]">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">{description}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}
