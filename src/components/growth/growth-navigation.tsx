"use client";

import { CalendarDays, FileCheck2, LayoutDashboard, Lightbulb } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/app/marketing", label: "Vue d’ensemble", icon: LayoutDashboard, exact: true },
  { href: "/app/marketing/ideas", label: "Idées", icon: Lightbulb, exact: false },
  { href: "/app/marketing/content", label: "Contenus", icon: FileCheck2, exact: false },
  { href: "/app/marketing/publications", label: "Publications", icon: CalendarDays, exact: false },
] as const;

export function GrowthNavigation() {
  const pathname = usePathname();

  return (
    <nav aria-label="Navigation Marketing" className="mt-7 overflow-x-auto">
      <div className="flex min-w-max gap-px border border-[var(--line)] bg-[var(--line)]">
        {links.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 items-center gap-2 bg-[var(--surface)] px-4 py-2.5 text-sm transition ${
                active
                  ? "!bg-[var(--ink)] font-semibold text-white"
                  : "text-[var(--ink-soft)] hover:text-[var(--blue)]"
              }`}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
