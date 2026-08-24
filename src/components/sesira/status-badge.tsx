import type { ReactNode } from "react";

export type StatusTone = "violet" | "cyan" | "emerald" | "amber" | "rose" | "blue" | "neutral";

const TONE_CLASSES: Record<StatusTone, string> = {
  violet: "border-violet-400/20 bg-violet-400/10 text-violet-200",
  cyan: "border-cyan-400/20 bg-cyan-400/10 text-cyan-200",
  emerald: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
  amber: "border-amber-400/20 bg-amber-400/10 text-amber-200",
  rose: "border-rose-400/20 bg-rose-400/10 text-rose-200",
  blue: "border-blue-400/20 bg-blue-400/10 text-blue-200",
  neutral: "border-slate-400/20 bg-slate-400/10 text-slate-300",
};

export function StatusBadge({
  children,
  tone = "neutral",
  emphasis = "normal",
}: {
  children: ReactNode;
  tone?: StatusTone;
  emphasis?: "normal" | "strong";
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${
        emphasis === "strong" ? "font-semibold" : "font-medium"
      } ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
