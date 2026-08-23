"use client";

import {
  Activity,
  AlertCircle,
  Bot,
  FileText,
  LayoutDashboard,
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
  { href: "/app/automations", label: "Automatisations", icon: Bot },
  { href: "/app/settings", label: "Réglages", icon: Settings },
];

export function AppNavigation() {
  const pathname = usePathname();

  return (
    <nav className="mt-6 grid gap-1 sm:grid-cols-2 lg:grid-cols-1" aria-label="Navigation principale">
      {navigation.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
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
