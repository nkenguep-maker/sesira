import { Search } from "lucide-react";
import type { ReactNode } from "react";

export const filterSelectClassName = "sesira-field px-4 py-2.5 text-sm text-[var(--ink)]";

export function FilterBar({
  action,
  children,
  layoutClassName = "md:grid-cols-[minmax(220px,1fr)_190px_auto]",
}: {
  action: string;
  children: ReactNode;
  layoutClassName?: string;
}) {
  return (
    <form className={`grid gap-3 border-b border-[var(--line)] bg-[var(--surface)] p-5 md:px-[1.375rem] ${layoutClassName}`} action={action}>
      {children}
    </form>
  );
}

export function SearchField({
  label,
  defaultValue,
  placeholder,
}: {
  label: string;
  defaultValue?: string;
  placeholder: string;
}) {
  return (
    <label className="relative min-w-0">
      <span className="sr-only">{label}</span>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--ink-mute)]" aria-hidden="true" />
      <input
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="sesira-field py-2.5 pl-10 pr-4 text-sm"
      />
    </label>
  );
}
