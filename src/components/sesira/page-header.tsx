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
    <header className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
      <div className="min-w-0">
        <p
          className={
            eyebrowStyle === "section"
              ? "text-xs font-medium uppercase tracking-[0.16em] text-[var(--accent)]"
              : "text-sm font-medium text-[var(--accent)]"
          }
        >
          {eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--foreground)] md:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0 self-start lg:self-auto">{actions}</div> : null}
    </header>
  );
}
