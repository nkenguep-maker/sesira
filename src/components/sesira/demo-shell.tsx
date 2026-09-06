"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SesiraLogo } from "@/components/sesira/logo";

const DEMO_NAV = [
  ["/demo", "Tableau de bord"],
  ["/demo/relances", "File de décisions"],
  ["/demo/devis", "Finances & Devis"],
  ["/demo/interventions", "Interventions Terrain"],
  ["/demo/obligations", "Obligations & CERFA"],
  ["/demo/automatisations", "Automatisations"],
] as const;

export function DemoShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="stitch-dashboard-frame demo-stitch-frame">
      <header className="stitch-topbar">
        <div className="stitch-topbar-inner">
          <div className="stitch-topbar-left">
            <div className="stitch-topbar-brand">
              <SesiraLogo />
              <span className="stitch-brand-divider" aria-hidden="true" />
              <div className="stitch-workspace-lockup">
                <strong>Clim & Froid Dauphiné</strong>
                <span>Régie Pro HVAC · Démo</span>
              </div>
            </div>

            <nav className="stitch-topnav" aria-label="Navigation de la démonstration">
              {DEMO_NAV.map(([href, label], index) => {
                const selected = active(pathname, href);
                return (
                  <Link key={href} href={href} className={selected ? "active" : ""} aria-current={selected ? "page" : undefined}>
                    <span>{label}</span>
                    {index === 1 ? <span className="stitch-nav-count">5</span> : null}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="stitch-topbar-right">
            <span className="stitch-autonomy-pill"><span className="stitch-live-dot" />Validation requise</span>
            <span className="stitch-sync-label">Synchro fictive · 2 min</span>
            <Link className="stitch-search-control" href="/demo/clients">⌘K Recherche</Link>
            <span className="stitch-notification-dot" aria-label="Notifications fictives">●</span>
            <Link className="stitch-user-lockup" href="/demo/equipe">
              <span className="stitch-user-avatar" aria-hidden="true">LM</span>
              <span><strong>Laurent Martin</strong><small>Dirigeant · Démo</small></span>
            </Link>
            <Link className="stitch-exit-link" href="/">Quitter</Link>
          </div>
        </div>
      </header>
      <main className="stitch-dashboard-main demo-stitch-main">{children}</main>
    </div>
  );
}

function active(pathname: string, href: string) {
  if (href === "/demo") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
