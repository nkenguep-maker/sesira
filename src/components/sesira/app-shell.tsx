"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SesiraLogo } from "./logo";

const nav = [
  ["/app", "Vue d'ensemble", "01"],
  ["/app/clients", "Clients", "02"],
  ["/app/devis", "Devis", "03"],
  ["/app/suivi", "Suivi", "04"],
  ["/app/equipe", "Équipe", "05"],
  ["/app/integrations", "Intégrations", "06"],
  ["/app/parametres", "Paramètres", "07"],
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="app-frame">
      <aside className="app-sidebar">
        <div className="sidebar-top"><SesiraLogo /></div>
        <nav className="app-nav" aria-label="Navigation principale">
          {nav.map(([href, label, index]) => {
            const active = href === "/app" ? pathname === href : pathname.startsWith(href);
            return (
              <Link key={href} href={href} className={active ? "active" : ""}>
                <span className="nav-index">{index}</span>
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-foot">
          <Link href="/app/onboarding" className="setup-link">
            <span className="setup-dot" />
            Reprendre la configuration
          </Link>
          <div className="account-row">
            <div className="avatar">S</div>
            <div><strong>Mon espace</strong><span>SESIRA</span></div>
          </div>
        </div>
      </aside>
      <div className="app-main-wrap">
        <header className="mobile-app-bar">
          <SesiraLogo />
          <Link href="/app/onboarding" className="button ghost small">Configurer</Link>
        </header>
        <main className="app-main">{children}</main>
      </div>
    </div>
  );
}
