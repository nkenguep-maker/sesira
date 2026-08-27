"use client";

import {
  Activity,
  AlertCircle,
  Bot,
  FileText,
  ChartNoAxesCombined,
  LayoutDashboard,
  Megaphone,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { href: "/app", label: "Accueil", icon: LayoutDashboard, exact: true },
  { href: "/app/attention", label: "À traiter", icon: AlertCircle },
  { href: "/app/requests", label: "Demandes", icon: FileText },
  { href: "/app/quotes", label: "Devis", icon: Activity },
  { href: "/app/customers", label: "Clients", icon: Users },
  { href: "/app/marketing", label: "Marketing", icon: Megaphone },
  { href: "/app/results", label: "Résultats", icon: ChartNoAxesCombined },
  { href: "/app/automations", label: "Automatisations", icon: Bot },
  { href: "/app/settings", label: "Réglages", icon: Settings },
];

export function AppNavigation() {
  const pathname = usePathname();

  return (
    <nav
      className="flex gap-px overflow-x-auto border-b border-white/15 bg-[var(--ink)] py-2 lg:grid lg:grid-cols-1 lg:gap-0 lg:overflow-visible lg:border-b-0 lg:py-3"
      aria-label="Navigation principale"
    >
      {navigation.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 shrink-0 items-center gap-3 px-[1.375rem] py-2.5 text-sm transition lg:shrink ${
              active
                ? "bg-[var(--blue)] font-semibold text-white"
                : "text-white/65 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Icon className={`size-4 ${active ? "text-white" : "text-white/45"}`} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
