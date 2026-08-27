import type { ReactNode } from "react";

export type StatusTone = "violet" | "cyan" | "emerald" | "amber" | "rose" | "blue" | "neutral";

const TONE_CLASSES: Record<StatusTone, string> = {
  violet: "bg-[var(--blue-soft)] text-[var(--blue)]",
  cyan: "bg-[var(--blue-soft)] text-[var(--blue)]",
  emerald: "bg-[var(--blue-soft)] text-[var(--blue)]",
  amber: "bg-[#fff4e5] text-[var(--sand-text)]",
  rose: "bg-[var(--danger-soft)] text-[var(--danger)]",
  blue: "bg-[var(--blue-soft)] text-[var(--blue)]",
  neutral: "bg-[var(--paper)] text-[var(--ink-soft)]",
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
      className={`inline-flex px-2.5 py-1 text-[0.78125rem] leading-5 ${
        emphasis === "strong" ? "font-semibold" : "font-medium"
      } ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
