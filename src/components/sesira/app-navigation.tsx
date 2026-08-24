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
      className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:mt-6 lg:grid lg:grid-cols-1 lg:gap-1 lg:overflow-visible lg:pb-0"
      aria-label="Navigation principale"
    >
      {navigation.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition lg:shrink ${
              active
                ? "bg-violet-400/10 font-medium text-violet-100"
                : "text-[var(--muted)] hover:bg-[var(--panel-soft)] hover:text-white"
            }`}
          >
            <Icon className={`size-4 ${active ? "text-violet-300" : ""}`} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
