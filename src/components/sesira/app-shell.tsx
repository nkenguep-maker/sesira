"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { switchOrganizationAction } from "@/app/app/organization-actions";
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

type WorkspaceOption = {
  id: string;
  name: string;
  role: string;
  demoMode: boolean;
};

export function AppShell({
  children,
  workspaceId,
  workspaceName,
  role,
  growthEnabled,
  demoMode,
  organizations,
}: {
  children: React.ReactNode;
  workspaceId: string;
  workspaceName: string;
  role: string;
  growthEnabled: boolean;
  demoMode: boolean;
  organizations: WorkspaceOption[];
}) {
  const pathname = usePathname();
  const technician = TECH_ROLES.has(role);
  const tabs = technician ? null : tabsForPath(pathname, growthEnabled);

  return (
    <div className={technician ? "app-frame technician-frame" : "app-frame"}>
      <aside className="app-sidebar">
        <div className="sidebar-top">
          <SesiraLogo />
          {demoMode ? <span className="demo-mode-badge">MODE DÉMO · DONNÉES FICTIVES</span> : null}
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
          <OrganizationMenu
            pathname={pathname}
            workspaceId={workspaceId}
            workspaceName={workspaceName}
            organizations={organizations}
            demoMode={demoMode}
          />
        </div>
      </aside>

      <div className="app-main-wrap">
        <header className="mobile-app-bar">
          <div className="mobile-brand-stack">
            <SesiraLogo />
            {demoMode ? <span className="demo-mode-badge compact">DÉMO · FICTIF</span> : null}
          </div>
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
              {organizations.length > 1 ? (
                <WorkspaceSwitcher workspaceId={workspaceId} organizations={organizations} mobile />
              ) : null}
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

function OrganizationMenu({
  pathname,
  workspaceId,
  workspaceName,
  organizations,
  demoMode,
}: {
  pathname: string;
  workspaceId: string;
  workspaceName: string;
  organizations: WorkspaceOption[];
  demoMode: boolean;
}) {
  const open = SESIRA_ORGANIZATION_NAV.some((item) => isAppNavActive(pathname, item));
  return (
    <details open={open}>
      <summary className="account-row" aria-label="Organisation et réglages" style={{ cursor: "pointer", listStyle: "none" }}>
        <div className="avatar" aria-hidden="true">{workspaceInitial(workspaceName)}</div>
        <div style={{ minWidth: 0 }}>
          <strong style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{workspaceName}</strong>
          <span>{demoMode ? "Mode démonstration" : "Équipe & réglages"}</span>
        </div>
      </summary>
      {organizations.length > 1 ? <WorkspaceSwitcher workspaceId={workspaceId} organizations={organizations} /> : null}
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

function WorkspaceSwitcher({
  workspaceId,
  organizations,
  mobile = false,
}: {
  workspaceId: string;
  organizations: WorkspaceOption[];
  mobile?: boolean;
}) {
  return (
    <div className={mobile ? "organization-switcher mobile" : "organization-switcher"}>
      <span>Changer d’espace</span>
      {organizations.map((organization) => (
        <form action={switchOrganizationAction} key={organization.id}>
          <input type="hidden" name="organizationId" value={organization.id} />
          <button
            type="submit"
            className={organization.id === workspaceId ? "organization-choice active" : "organization-choice"}
            disabled={organization.id === workspaceId}
          >
            <span>{organization.name}</span>
            {organization.demoMode ? <em>Démo</em> : null}
          </button>
        </form>
      ))}
    </div>
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
