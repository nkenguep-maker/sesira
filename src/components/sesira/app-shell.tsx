"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  GROWTH_TABS,
  INTERVENTION_TABS,
  QUOTE_TABS,
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

type StitchNavItem = {
  href: string;
  label: string;
  matches: readonly string[];
};

const STITCH_APP_NAV: readonly StitchNavItem[] = [
  { href: "/app", label: "Tableau de bord", matches: ["/app"] },
  { href: "/app/suivi", label: "File de décisions", matches: ["/app/suivi"] },
  {
    href: "/app/devis",
    label: "Finances & Devis",
    matches: ["/app/devis", "/app/opportunites", "/app/factures"],
  },
  {
    href: "/app/interventions",
    label: "Interventions Terrain",
    matches: ["/app/interventions", "/app/terrain", "/app/rapports"],
  },
  {
    href: "/app/obligations/documents",
    label: "Obligations & CERFA",
    matches: ["/app/obligations"],
  },
  {
    href: "/app/automatisations",
    label: "Automatisations",
    matches: ["/app/automatisations", "/app/automations"],
  },
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
  const tabs = technician ? null : tabsForPath(pathname, growthEnabled);

  // Managers stay in one persistent /app/... shell across every workspace route.
  // Only the technician workspace keeps its dedicated mobile/field shell.
  if (!technician) {
    return (
      <div className="stitch-dashboard-frame stitch-app-frame">
        <StitchAppTopbar workspaceName={workspaceName} role={role} pathname={pathname} />
        <main className="stitch-dashboard-main stitch-app-main">
          {tabs ? <StitchSectionTabs pathname={pathname} items={tabs} /> : null}
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="app-frame technician-frame">
      <aside className="app-sidebar">
        <div className="sidebar-top">
          <SesiraLogo />
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", paddingBottom: 12 }}>
          <NavigationList pathname={pathname} items={TECH_ITEMS} ariaLabel="Navigation technicien" />
        </div>
      </aside>

      <div className="app-main-wrap">
        <header className="mobile-app-bar">
          <SesiraLogo />
          <details className="mobile-nav-menu">
            <summary>Menu</summary>
            <div className="mobile-nav-panel">
              <NavigationList pathname={pathname} items={TECH_ITEMS} ariaLabel="Navigation mobile technicien" mobile />
            </div>
          </details>
        </header>
        <main className="app-main">{children}</main>
      </div>
    </div>
  );
}

function StitchAppTopbar({ workspaceName, role, pathname }: { workspaceName: string; role: string; pathname: string }) {
  const workspaceRole = role === "OWNER" ? "Dirigeant" : role === "ADMIN" ? "Administration" : "Équipe";

  return (
    <header className="stitch-topbar">
      <div className="stitch-topbar-inner">
        <div className="stitch-topbar-left">
          <div className="stitch-topbar-brand">
            <Link href="/app" aria-label="Retour au tableau de bord SESIRA">
              <SesiraLogo />
            </Link>
            <span className="stitch-brand-divider" aria-hidden="true" />
            <div className="stitch-workspace-lockup">
              <strong>{workspaceName}</strong>
              <span>Régie Pro HVAC</span>
            </div>
          </div>

          <nav className="stitch-topnav" aria-label="Navigation principale SESIRA">
            {STITCH_APP_NAV.map((item) => {
              const active = isStitchNavActive(pathname, item);
              return (
                <Link key={item.href} href={item.href} className={active ? "active" : ""} aria-current={active ? "page" : undefined}>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="stitch-topbar-right">
          <Link className="stitch-autonomy-pill" href="/app/automatisations"><span className="stitch-live-dot" />Autonomie</Link>
          <Link className="stitch-search-control" href="/app/clients">⌘K Recherche</Link>
          <Link className="stitch-user-lockup" href="/app/equipe">
            <span className="stitch-user-avatar" aria-hidden="true">{workspaceInitial(workspaceName)}</span>
            <span><strong>{workspaceName}</strong><small>{workspaceRole}</small></span>
          </Link>
        </div>
      </div>
    </header>
  );
}

function StitchSectionTabs({ pathname, items }: { pathname: string; items: readonly SesiraAppNavItem[] }) {
  return (
    <nav className="stitch-section-tabs" aria-label="Navigation de section">
      {items.map((item) => {
        const active = isSectionTabActive(pathname, item.href);
        return (
          <Link key={item.href} href={item.href} className={active ? "active" : ""} aria-current={active ? "page" : undefined}>
            {item.label}
          </Link>
        );
      })}
    </nav>
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
        <Link key={item.href} href={item.href} className={isLegacyNavActive(pathname, item) ? "active" : ""}>
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

function tabsForPath(pathname: string, growthEnabled: boolean): readonly SesiraAppNavItem[] | null {
  if (["/app/devis", "/app/opportunites", "/app/suivi"].some((prefix) => routeMatches(pathname, prefix))) {
    return QUOTE_TABS;
  }
  if (["/app/interventions", "/app/rapports"].some((prefix) => routeMatches(pathname, prefix))) {
    return INTERVENTION_TABS;
  }
  if (growthEnabled && routeMatches(pathname, "/app/croissance")) {
    return GROWTH_TABS;
  }
  return null;
}

function isStitchNavActive(pathname: string, item: StitchNavItem) {
  return item.matches.some((match) => routeMatches(pathname, match));
}

function isLegacyNavActive(pathname: string, item: SesiraAppNavItem) {
  const matches = item.matches ?? [item.href];
  return matches.some((match) => routeMatches(pathname, match));
}

function isSectionTabActive(pathname: string, href: string) {
  if (href === "/app/croissance") return pathname === href;
  return routeMatches(pathname, href);
}

function routeMatches(pathname: string, prefix: string) {
  if (prefix === "/app") return pathname === "/app";
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function workspaceInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "S";
}
