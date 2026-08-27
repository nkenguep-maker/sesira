import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  eyebrowStyle = "product",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  eyebrowStyle?: "product" | "section";
}) {
  return (
    <header className="flex flex-col justify-between gap-5 border-b border-[var(--line)] bg-[var(--surface)] px-5 py-5 md:px-8 lg:flex-row lg:items-center">
      <div className="min-w-0">
        <p
          className={
            eyebrowStyle === "section"
              ? "sesira-eyebrow"
              : "text-[0.8125rem] font-medium text-[var(--ink-mute)]"
          }
        >
          {eyebrow}
        </p>
        <h1 className="mt-1 [overflow-wrap:anywhere] font-[family-name:var(--font-display)] text-[1.375rem] font-semibold leading-tight tracking-[-0.02em] text-[var(--ink)]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-3xl text-[0.84375rem] leading-5 text-[var(--ink-mute)]">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0 self-start lg:self-auto">{actions}</div> : null}
    </header>
  );
}
