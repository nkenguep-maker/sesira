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
                <strong>THERMOPRO SERVICES</strong>
                <span>Régie Pro HVAC · Démo</span>
              </div>
            </div>
            <nav className="stitch-topnav" aria-label="Navigation de la démonstration">
              {DEMO_NAV.map(([href, label]) => {
                const selected = active(pathname, href);
                return (
                  <Link key={href} href={href} className={selected ? "active" : ""} aria-current={selected ? "page" : undefined}>
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="stitch-topbar-right">
            <span className="demo-mode-badge">Données fictives</span>
            <Link className="stitch-search-control" href="/demo/clients">Recherche</Link>
            <Link className="stitch-user-lockup" href="/demo/equipe">
              <span className="stitch-user-avatar" aria-hidden="true">T</span>
              <span><strong>THERMOPRO SERVICES</strong><small>Démonstration</small></span>
            </Link>
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
