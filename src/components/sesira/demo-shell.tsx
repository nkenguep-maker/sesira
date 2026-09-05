"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SesiraLogo } from "@/components/sesira/logo";

const DEMO_NAV = [
  ["/demo", "Aujourd’hui"],
  ["/demo/clients", "Clients"],
  ["/demo/devis", "Devis"],
  ["/demo/interventions", "Interventions"],
  ["/demo/factures", "Factures"],
  ["/demo/maintenance", "Maintenance"],
  ["/demo/obligations", "Obligations CVC"],
  ["/demo/documents", "Documents"],
  ["/demo/equipe", "Équipe"],
  ["/demo/resultats", "Résultats"],
] as const;

export function DemoShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="app-frame">
      <aside className="app-sidebar">
        <div className="sidebar-top">
          <SesiraLogo />
          <span style={badgeStyle}>MODE DÉMO · DONNÉES FICTIVES</span>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", paddingBottom: 12 }}>
          <nav className="app-nav" aria-label="Navigation de la démonstration">
            {DEMO_NAV.map(([href, label]) => (
              <Link key={href} href={href} className={active(pathname, href) ? "active" : ""}>
                <span>{label}</span>
              </Link>
            ))}
          </nav>
        </div>
        <div className="sidebar-foot" style={{ marginTop: 0 }}>
          <div className="account-row">
            <div className="avatar" aria-hidden="true">T</div>
            <div style={{ minWidth: 0 }}>
              <strong>THERMOPRO SERVICES</strong>
              <span>Scénario fictif · CVC</span>
            </div>
          </div>
          <Link href="/" style={{ display: "inline-block", marginTop: 10, fontSize: 12, color: "var(--ink-soft)" }}>Quitter la démo</Link>
        </div>
      </aside>

      <div className="app-main-wrap">
        <header className="mobile-app-bar">
          <div style={{ display: "grid", gap: 3 }}><SesiraLogo /><span style={{ ...badgeStyle, marginTop: 0 }}>DÉMO · FICTIF</span></div>
          <details className="mobile-nav-menu">
            <summary>Menu</summary>
            <div className="mobile-nav-panel">
              <nav className="app-nav mobile" aria-label="Navigation mobile de la démonstration">
                {DEMO_NAV.map(([href, label]) => (
                  <Link key={href} href={href} className={active(pathname, href) ? "active" : ""}><span>{label}</span></Link>
                ))}
              </nav>
            </div>
          </details>
        </header>
        <main className="app-main">{children}</main>
      </div>
    </div>
  );
}

function active(pathname: string, href: string) {
  if (href === "/demo") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

const badgeStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", width: "fit-content", marginTop: 12,
  border: "1px solid rgba(168,67,39,.24)", borderRadius: 999, background: "rgba(168,67,39,.08)",
  color: "#a84327", padding: "5px 8px", fontSize: 9, fontWeight: 800, letterSpacing: ".08em", lineHeight: 1,
};
