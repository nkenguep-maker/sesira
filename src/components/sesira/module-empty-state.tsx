import type { LucideIcon } from "lucide-react";

export function ModuleEmptyState({
  icon: Icon,
  eyebrow,
  title,
  description,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-7xl">
      <p className="text-sm font-medium text-[var(--accent)]">{eyebrow}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
      <section className="mt-10 rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-6 py-16 text-center">
        <Icon className="mx-auto size-9 text-violet-300" />
        <p className="mt-5 font-medium">Aucune donnée pour le moment.</p>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[var(--muted)]">{description}</p>
      </section>
    </div>
  );
}
