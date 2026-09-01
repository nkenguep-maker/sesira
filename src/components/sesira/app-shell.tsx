"use client";

import { LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";
import { usePathname } from "next/navigation";

import type { ViewerContext } from "@/lib/auth/viewer";

import { logoutAction } from "@/app/app/logout-action";
import { AppNavigation } from "@/components/sesira/app-navigation";

export function AppShell({
  viewer,
  currentMode,
  children,
}: {
  viewer: ViewerContext;
  currentMode: string | null;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const standalone =
    pathname === "/app/onboarding" ||
    pathname.startsWith("/app/imports") ||
    pathname === "/app/automations" ||
    pathname === "/app/results" ||
    pathname === "/app/settings/integrations";
  if (standalone) return <>{children}</>;
  return (
    <div className={`sesira-app-shell min-h-screen bg-[var(--paper)] text-[var(--ink)] lg:grid ${collapsed ? "lg:grid-cols-[64px_1fr]" : "lg:grid-cols-[240px_1fr]"}`}>
      <aside className="sesira-sidebar border-b border-white/15 bg-[var(--ink)] text-white lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:border-r-white/15">
        <div className="flex h-full flex-col lg:min-h-screen">
          <div className="flex h-[64px] items-center justify-between gap-3 border-b border-white/15 px-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="min-w-0">
                <p className="sesira-brand">SESIRA<span>.</span></p>
              </div>
            </div>
            <button type="button" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? "Déplier le menu" : "Replier le menu"} className="sesira-collapse hidden lg:grid">
              {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            </button>
            <div className="flex items-center gap-2 lg:hidden">
              <Link href="/app/attention" className="inline-flex min-h-11 items-center bg-[var(--blue)] px-3 text-sm font-semibold text-white">
                À traiter
              </Link>
              <form action={logoutAction}>
                <button
                  aria-label="Se déconnecter"
                  className="grid size-11 place-items-center border border-white/25 text-white/70 transition hover:border-white hover:text-white"
                >
                  <LogOut className="size-4" />
                </button>
              </form>
            </div>
          </div>

          <AppNavigation collapsed={collapsed} />

          <div className={`${collapsed ? "hidden" : ""} mt-auto hidden border-t border-white/15 px-3 py-5 lg:block`}>
            <div className="mb-4 border-b border-white/10 px-2 pb-4">
              <p className="sesira-eyebrow !text-[var(--blue-light)]">Mode</p>
              <p className="mt-2 flex items-center gap-2 text-xs text-white/70"><span className="sesira-status-dot size-1.5 bg-[var(--blue-light)]" />{automationModeLabel(currentMode)}</p>
            </div>
            <p className="truncate px-2 text-xs text-white/50">{viewer.email}</p>
            <form action={logoutAction} className="mt-2">
              <button className="flex w-full items-center gap-3 px-3 py-2.5 text-sm text-white/65 transition hover:bg-white/5 hover:text-white">
                <LogOut className="size-4" />
                Se déconnecter
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main className="sesira-zone min-w-0">
        <AppTopbar viewer={viewer} currentMode={currentMode} />
        {viewer.organization.status === "SUSPENDED" ? <div className="sesira-global-warning" role="status"><b>Organisation suspendue</b><span>Vos dossiers restent consultables. Les actions externes sont suspendues.</span></div> : null}
        {children}
      </main>
      <MobileBottomNav />
    </div>
  );
}

function MobileBottomNav() {
  const pathname = usePathname();
  const items = [["/app/attention", "À traiter"], ["/app/quotes", "Devis"], ["/app/requests", "Demandes"], ["/app/reports", "Rapports"]] as const;
  return <nav className="sesira-mobile-nav" aria-label="Navigation mobile">{items.map(([href, label]) => { const active = pathname.startsWith(href); return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={active ? "active" : undefined}>{label}</Link>; })}</nav>;
}

function AppTopbar({ viewer, currentMode }: { viewer: ViewerContext; currentMode: string | null }) {
  return <div className="sesira-topbar"><label className="sesira-search"><span className="sr-only">Rechercher</span><input type="search" disabled placeholder="Rechercher un client, un devis, un montant" aria-label="Rechercher" title="La recherche sera disponible prochainement" /></label><div className="sesira-mode"><span>Mode</span><b>{automationModeLabel(currentMode)}</b><button type="button" disabled title="La suspension nécessite une action serveur dédiée">Suspendre</button></div><span className="sesira-activity" title="Le résumé d’activité n’est pas encore disponible">Aujourd’hui</span><span className="sesira-user">{viewer.email ?? "Utilisateur"}</span></div>;
}

function automationModeLabel(mode: string | null): string {
  return ({ OBSERVATION: "Observation", SHADOW: "Il vous montre", APPROVAL: "Validation", AUTOMATIC: "Automatisation contrôlée" } as Record<string, string>)[mode ?? ""] ?? "Mode non disponible";
}
