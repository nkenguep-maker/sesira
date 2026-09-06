"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  GROWTH_TABS,
  INTERVENTION_TABS,
  QUOTE_TABS,
  SESIRA_GROWTH_NAV,
  SESIRA_ORGANIZATION_NAV,
  SESIRA_PRIMARY_NAV,
  SESIRA_SECONDARY_NAV,
  isAppNavActive,
  type SesiraAppNavItem,
} from "@/lib/navigation";

import { SesiraLogo } from "./logo";

const TECH_ROLES = new Set(["TECH", "TECHNICIAN"]);
const TECH_ITEMS: readonly SesiraAppNavItem[] = [
  { href: "/app", label: "Ma journée", matches: ["/app"] },
  { href: "/app/terrain", label: "Terrain" },
  { href: "/app/rapports", label: "Rapports" },
  { href: "/app/documents", label: "Documents" },
];

const STITCH_DASHBOARD_NAV = [
  { href: "/app", label: "Tableau de bord" },
  { href: "/app/suivi", label: "File de décisions" },
  { href: "/app/devis", label: "Finances & Devis" },
  { href: "/app/interventions", label: "Interventions Terrain" },
  { href: "/app/obligations/documents", label: "Obligations & CERFA" },
  { href: "/app/automatisations", label: "Automatisations" },
] as const;

export function AppShell({
  children,
  workspaceName,
  role,
  growthEnabled,
}: {
  children: React.ReactNode;
  workspaceName: string;
  role: string;
  growthEnabled: boolean;
}) {
  const pathname = usePathname();
  const technician = TECH_ROLES.has(role);
  const stitchDashboard = !technician && pathname === "/app";
  const tabs = technician ? null : tabsForPath(pathname, growthEnabled);

  if (stitchDashboard) {
    return (
      <div className="stitch-dashboard-frame">
        <StitchDashboardTopbar workspaceName={workspaceName} role={role} pathname={pathname} />
        <main className="stitch-dashboard-main">{children}</main>
      </div>
    );
  }

  return (
    <div className={technician ? "app-frame technician-frame" : "app-frame"}>
      <aside className="app-sidebar">
        <div className="sidebar-top">
          <SesiraLogo />
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", paddingBottom: 12 }}>
          {technician ? (
            <NavigationList pathname={pathname} items={TECH_ITEMS} ariaLabel="Navigation technicien" />
          ) : (
            <>
              <NavigationList pathname={pathname} items={SESIRA_PRIMARY_NAV} ariaLabel="Navigation principale" />
              {growthEnabled ? (
                <div style={{ marginTop: 8 }}>
                  <NavigationList pathname={pathname} items={[SESIRA_GROWTH_NAV]} ariaLabel="Module Croissance" />
                </div>
              ) : null}
              <div style={{ borderTop: "1px solid var(--line)", marginTop: 18, paddingTop: 12, opacity: 0.72 }}>
                <NavigationList pathname={pathname} items={SESIRA_SECONDARY_NAV} ariaLabel="Réglages et résultats" />
              </div>
            </>
          )}
        </div>

        <div className="sidebar-foot" style={{ marginTop: 0 }}>
          <OrganizationMenu pathname={pathname} workspaceName={workspaceName} />
        </div>
      </aside>

      <div className="app-main-wrap">
        <header className="mobile-app-bar">
          <SesiraLogo />
          <details className="mobile-nav-menu">
            <summary>Menu</summary>
            <div className="mobile-nav-panel">
              {technician ? (
                <NavigationList pathname={pathname} items={TECH_ITEMS} ariaLabel="Navigation mobile technicien" mobile />
              ) : (
                <>
                  <NavigationList pathname={pathname} items={SESIRA_PRIMARY_NAV} ariaLabel="Navigation mobile" mobile />
                  {growthEnabled ? <NavigationList pathname={pathname} items={[SESIRA_GROWTH_NAV]} ariaLabel="Croissance" mobile /> : null}
                  <div style={{ borderTop: "1px solid var(--line)", marginTop: 10, paddingTop: 8 }}>
                    <NavigationList pathname={pathname} items={SESIRA_SECONDARY_NAV} ariaLabel="Réglages et résultats" mobile />
                    <NavigationList pathname={pathname} items={SESIRA_ORGANIZATION_NAV} ariaLabel="Organisation" mobile />
                  </div>
                </>
              )}
            </div>
          </details>
        </header>
        <main className="app-main">
          {tabs ? <SectionTabs pathname={pathname} items={tabs} /> : null}
          {children}
        </main>
      </div>
    </div>
  );
}

function StitchDashboardTopbar({ workspaceName, role, pathname }: { workspaceName: string; role: string; pathname: string }) {
  const workspaceRole = role === "OWNER" ? "Dirigeant" : role === "ADMIN" ? "Administration" : "Équipe";

  return (
    <header className="stitch-topbar">
      <div className="stitch-topbar-inner">
        <div className="stitch-topbar-left">
          <div className="stitch-topbar-brand">
            <SesiraLogo />
            <span className="stitch-brand-divider" aria-hidden="true" />
            <div className="stitch-workspace-lockup">
              <strong>{workspaceName}</strong>
              <span>Régie Pro HVAC</span>
            </div>
          </div>

          <nav className="stitch-topnav" aria-label="Navigation du poste de commande">
            {STITCH_DASHBOARD_NAV.map((item, index) => {
              const active = item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href} className={active ? "active" : ""} aria-current={active ? "page" : undefined}>
                  <span>{item.label}</span>
                  {index === 1 ? <span className="stitch-nav-count">•</span> : null}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="stitch-topbar-right">
          <Link className="stitch-autonomy-pill" href="/app/automatisations"><span className="stitch-live-dot" />Autonomie</Link>
          <Link className="stitch-search-control" href="/app/clients">⌘K Recherche</Link>
          <span className="stitch-notification-dot" aria-hidden="true">●</span>
          <Link className="stitch-user-lockup" href="/app/equipe">
            <span className="stitch-user-avatar" aria-hidden="true">{workspaceInitial(workspaceName)}</span>
            <span><strong>{workspaceName}</strong><small>{workspaceRole}</small></span>
          </Link>
        </div>
      </div>
    </header>
  );
}

function NavigationList({
  pathname,
  items,
  ariaLabel,
  mobile = false,
}: {
  pathname: string;
  items: readonly SesiraAppNavItem[];
  ariaLabel: string;
  mobile?: boolean;
}) {
  return (
    <nav className={mobile ? "app-nav mobile" : "app-nav"} aria-label={ariaLabel}>
      {items.map((item) => (
        <Link key={item.href} href={item.href} className={isAppNavActive(pathname, item) ? "active" : ""}>
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

function OrganizationMenu({ pathname, workspaceName }: { pathname: string; workspaceName: string }) {
  const open = SESIRA_ORGANIZATION_NAV.some((item) => isAppNavActive(pathname, item));
  return (
    <details open={open}>
      <summary className="account-row" aria-label="Organisation et réglages" style={{ cursor: "pointer", listStyle: "none" }}>
        <div className="avatar" aria-hidden="true">{workspaceInitial(workspaceName)}</div>
        <div style={{ minWidth: 0 }}>
          <strong style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{workspaceName}</strong>
          <span>Équipe & réglages</span>
        </div>
      </summary>
      <nav className="app-nav" aria-label="Organisation" style={{ paddingTop: 10 }}>
        {SESIRA_ORGANIZATION_NAV.map((item) => (
          <Link key={item.href} href={item.href} className={isAppNavActive(pathname, item) ? "active" : ""}>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </details>
  );
}

function SectionTabs({ pathname, items }: { pathname: string; items: readonly SesiraAppNavItem[] }) {
  return (
    <nav
      aria-label="Navigation de section"
      style={{
        display: "flex",
        gap: 6,
        overflowX: "auto",
        borderBottom: "1px solid var(--line)",
        marginBottom: 28,
        paddingBottom: 8,
      }}
    >
      {items.map((item) => {
        const active = isSectionTabActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            style={{
              flex: "none",
              borderRadius: 999,
              padding: "9px 13px",
              fontSize: 13,
              fontWeight: 700,
              background: active ? "var(--ink)" : "transparent",
              color: active ? "white" : "var(--ink-soft)",
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function tabsForPath(pathname: string, growthEnabled: boolean): readonly SesiraAppNavItem[] | null {
  if (["/app/devis", "/app/opportunites", "/app/suivi"].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return QUOTE_TABS;
  }
  if (["/app/interventions", "/app/rapports"].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return INTERVENTION_TABS;
  }
  if (growthEnabled && (pathname === "/app/croissance" || pathname.startsWith("/app/croissance/"))) {
    return GROWTH_TABS;
  }
  return null;
}

function isSectionTabActive(pathname: string, href: string) {
  if (href === "/app/croissance") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function workspaceInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "S";
}
