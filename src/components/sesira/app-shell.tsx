import {
  Activity,
  AlertCircle,
  Bot,
  Building2,
  FileText,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import type { ViewerContext } from "@/lib/auth/viewer";

import { logoutAction } from "@/app/app/logout-action";

const navigation = [
  { href: "/app", label: "Accueil", icon: LayoutDashboard },
  { href: "/app/attention", label: "À traiter", icon: AlertCircle },
  { href: "/app/requests", label: "Demandes", icon: FileText },
  { href: "/app/quotes", label: "Devis", icon: Activity },
  { href: "/app/customers", label: "Clients", icon: Users },
  { href: "/app/automations", label: "Automatisations", icon: Bot },
  { href: "/app/settings", label: "Réglages", icon: Settings },
];

export function AppShell({
  viewer,
  children,
}: {
  viewer: ViewerContext;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--background)] text-white lg:grid lg:grid-cols-[272px_1fr]">
      <aside className="border-b border-[var(--border)] bg-[#090d17] lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
        <div className="flex h-full flex-col p-5">
          <div className="flex items-center gap-3 px-2 py-3">
            <span className="grid size-9 place-items-center rounded-xl bg-[var(--brand)] font-bold">S</span>
            <div>
              <p className="font-semibold tracking-wide">SESIRA</p>
              <p className="text-xs text-[var(--muted)]">Operational system</p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4">
            <div className="flex items-start gap-3">
              <Building2 className="mt-0.5 size-4 text-[var(--accent)]" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{viewer.organization.name}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">{viewer.organization.status}</p>
              </div>
            </div>
          </div>

          <nav className="mt-6 grid gap-1 sm:grid-cols-2 lg:grid-cols-1" aria-label="Navigation principale">
            {navigation.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[var(--muted)] transition hover:bg-[var(--panel-soft)] hover:text-white"
              >
                <Icon className="size-4" />
                {label}
              </Link>
            ))}
          </nav>

          <div className="mt-auto hidden border-t border-[var(--border)] pt-5 lg:block">
            <p className="truncate px-2 text-xs text-[var(--muted)]">{viewer.email}</p>
            <form action={logoutAction} className="mt-2">
              <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[var(--muted)] transition hover:bg-[var(--panel-soft)] hover:text-white">
                <LogOut className="size-4" />
                Se déconnecter
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main className="min-w-0 px-5 py-8 md:px-8 lg:px-12 lg:py-10">{children}</main>
    </div>
  );
}
