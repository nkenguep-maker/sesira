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
  void Icon;
  void tone;

  return (
    <div
      className={`${contained ? "border border-[var(--line)] bg-[var(--surface)]" : ""} px-6 py-14 text-center`}
    >
      <p className="font-[family-name:var(--font-display)] text-base font-semibold text-[var(--ink)]">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-[0.84375rem] leading-6 text-[var(--ink-soft)]">{description}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}
