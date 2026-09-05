"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SesiraLogo } from "@/components/sesira/logo";

const PRIMARY_NAV = [
  ["/demo", "Aujourd’hui"],
  ["/demo/clients", "Clients"],
  ["/demo/devis", "Devis"],
  ["/demo/relances", "Relances"],
  ["/demo/interventions", "Interventions"],
  ["/demo/factures", "Factures"],
  ["/demo/maintenance", "Maintenance"],
  ["/demo/documents", "Documents"],
] as const;

const SECONDARY_NAV = [
  ["/demo/automatisations", "Automatisations"],
  ["/demo/resultats", "Résultats"],
  ["/demo/obligations", "Obligations CVC"],
  ["/demo/equipe", "Équipe"],
] as const;

const CHAIN = [
  ["/demo/devis", "Devis"],
  ["/demo/automatisations", "Automatisations"],
  ["/demo/relances", "Relances"],
  ["/demo/interventions", "Interventions"],
  ["/demo/factures", "Factures"],
  ["/demo/maintenance", "Maintenance"],
] as const;

export function DemoShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="app-frame demo-frame">
      <aside className="app-sidebar demo-sidebar">
        <div className="sidebar-top">
          <SesiraLogo />
          <span className="demo-mode-badge">MODE DÉMO · DONNÉES FICTIVES</span>
        </div>
        <div className="demo-nav-scroll">
          <nav className="app-nav" aria-label="Navigation de la démonstration">
            {PRIMARY_NAV.map(([href, label]) => <DemoNavLink key={href} pathname={pathname} href={href} label={label} />)}
          </nav>
          <div className="demo-nav-separator"><span>Pilotage de la démo</span></div>
          <nav className="app-nav" aria-label="Pilotage de la démonstration">
            {SECONDARY_NAV.map(([href, label]) => <DemoNavLink key={href} pathname={pathname} href={href} label={label} />)}
          </nav>
        </div>
        <div className="sidebar-foot demo-sidebar-foot">
          <div className="account-row">
            <div className="avatar" aria-hidden="true">T</div>
            <div><strong>THERMOPRO SERVICES</strong><span>CVC · 12 collaborateurs</span></div>
          </div>
          <Link href="/" className="demo-quit-link">Quitter la démo</Link>
        </div>
      </aside>

      <div className="app-main-wrap">
        <header className="mobile-app-bar">
          <div className="demo-mobile-brand"><SesiraLogo /><span className="demo-mode-badge compact">DÉMO · FICTIF</span></div>
          <details className="mobile-nav-menu">
            <summary>Menu</summary>
            <div className="mobile-nav-panel">
              <nav className="app-nav mobile" aria-label="Navigation mobile de la démonstration">
                {[...PRIMARY_NAV, ...SECONDARY_NAV].map(([href, label]) => <DemoNavLink key={href} pathname={pathname} href={href} label={label} />)}
              </nav>
            </div>
          </details>
        </header>

        <div className="demo-chain" aria-label="Chaîne métier de la démonstration">
          <span>Le dossier circule :</span>
          {CHAIN.map(([href, label], index) => (
            <span className="demo-chain-item" key={href}>
              {index ? <i aria-hidden="true">→</i> : null}
              <Link className={active(pathname, href) ? "active" : ""} href={href}>{label}</Link>
            </span>
          ))}
        </div>
        <main className="app-main">{children}</main>
      </div>
    </div>
  );
}

function DemoNavLink({ pathname, href, label }: { pathname: string; href: string; label: string }) {
  const badge = href === "/demo/relances" ? "5" : href === "/demo/automatisations" ? "6" : null;
  return (
    <Link href={href} className={active(pathname, href) ? "active" : ""}>
      <span>{label}</span>{badge ? <em className="demo-nav-count">{badge}</em> : null}
    </Link>
  );
}

function active(pathname: string, href: string) {
  if (href === "/demo") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
