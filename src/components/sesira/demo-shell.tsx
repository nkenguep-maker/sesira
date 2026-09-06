"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SesiraLogo } from "@/components/sesira/logo";

type DemoNavItem = {
  href: string;
  label: string;
  matches: readonly string[];
};

const DEMO_NAV: readonly DemoNavItem[] = [
  { href: "/demo", label: "Tableau de bord", matches: ["/demo"] },
  { href: "/demo/relances", label: "File de décisions", matches: ["/demo/relances"] },
  {
    href: "/demo/devis",
    label: "Finances & Devis",
    matches: ["/demo/devis", "/demo/factures", "/demo/maintenance"],
  },
  {
    href: "/demo/interventions",
    label: "Interventions Terrain",
    matches: ["/demo/interventions", "/demo/documents"],
  },
  {
    href: "/demo/obligations",
    label: "Obligations & CERFA",
    matches: ["/demo/obligations"],
  },
  {
    href: "/demo/automatisations",
    label: "Automatisations",
    matches: ["/demo/automatisations"],
  },
] as const;

export function DemoShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="stitch-dashboard-frame demo-stitch-frame">
      <header className="stitch-topbar">
        <div className="stitch-topbar-inner">
          <div className="stitch-topbar-left">
            <div className="stitch-topbar-brand">
              <Link href="/demo" aria-label="Retour au tableau de bord de démonstration SESIRA">
                <SesiraLogo />
              </Link>
              <span className="stitch-brand-divider" aria-hidden="true" />
              <div className="stitch-workspace-lockup">
                <strong>Clim & Froid Dauphiné</strong>
                <span>Régie Pro HVAC · Démo</span>
              </div>
            </div>

            <nav className="stitch-topnav" aria-label="Navigation de la démonstration">
              {DEMO_NAV.map((item) => {
                const selected = isDemoNavActive(pathname, item);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={selected ? "active" : ""}
                    aria-current={selected ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="stitch-topbar-right">
            <span className="stitch-autonomy-pill"><span className="stitch-live-dot" />Validation requise</span>
            <span className="stitch-sync-label">Synchro fictive · 2 min</span>
            <Link className="stitch-search-control" href="/demo/clients">⌘K Recherche</Link>
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

function isDemoNavActive(pathname: string, item: DemoNavItem) {
  return item.matches.some((match) => routeMatches(pathname, match));
}

function routeMatches(pathname: string, prefix: string) {
  if (prefix === "/demo") return pathname === "/demo";
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}
