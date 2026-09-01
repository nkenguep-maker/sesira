"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SESIRA_APP_NAV, isAppNavActive } from "@/lib/navigation";
import { SesiraLogo } from "./logo";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="app-frame">
      <aside className="app-sidebar">
        <div className="sidebar-top"><SesiraLogo /></div>
        <nav className="app-nav" aria-label="Navigation principale">
          {SESIRA_APP_NAV.map(({ href, label, index }) => (
            <Link key={href} href={href} className={isAppNavActive(pathname, href) ? "active" : ""}>
              <span className="nav-index">{index}</span>
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-foot">
          <Link href="/app/onboarding" className="setup-link">
            <span className="setup-dot" />
            Reprendre la configuration
          </Link>
          <div className="account-row" aria-label="Espace de travail">
            <div className="avatar" aria-hidden="true">S</div>
            <div><strong>Espace SESIRA</strong><span>Identité fournie par le core</span></div>
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
