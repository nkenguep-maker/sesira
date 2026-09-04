"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SESIRA_APP_NAV_GROUPS, isAppNavActive } from "@/lib/navigation";

import { SesiraLogo } from "./logo";

const TECH_ROLES = new Set(["TECH", "TECHNICIAN"]);
const TECH_ITEMS = [
  { href: "/app", label: "Ma journée" },
  { href: "/app/terrain", label: "Terrain" },
  { href: "/app/rapports", label: "Rapports" },
  { href: "/app/documents", label: "Documents" },
] as const;

export function AppShell({
  children,
  workspaceName,
  role,
}: {
  children: React.ReactNode;
  workspaceName: string;
  role: string;
}) {
  const pathname = usePathname();
  const technician = TECH_ROLES.has(role);

  return (
    <div className={technician ? "app-frame technician-frame" : "app-frame"}>
      <aside className="app-sidebar">
        <div className="sidebar-top">
          <SesiraLogo />
          <Link href="/app" className={pathname === "/app" ? "sidebar-home active" : "sidebar-home"}>
            {technician ? "Ma journée" : "Aujourd’hui"}
          </Link>
        </div>

        {technician ? <TechnicianNavigation pathname={pathname} /> : <GroupedNavigation pathname={pathname} />}

        <div className="sidebar-foot">
          <div className="account-row" aria-label="Espace de travail">
            <div className="avatar" aria-hidden="true">{workspaceInitial(workspaceName)}</div>
            <div>
              <strong>{workspaceName}</strong>
              <span>{roleLabel(role)}</span>
            </div>
          </div>
        </div>
      </aside>

      <div className="app-main-wrap">
        <header className="mobile-app-bar">
          <SesiraLogo />
          <details className="mobile-nav-menu">
            <summary>Menu</summary>
            <div className="mobile-nav-panel">
              {technician ? <TechnicianNavigation pathname={pathname} mobile /> : (
                <>
                  <Link href="/app" className={pathname === "/app" ? "active" : ""}>Aujourd’hui</Link>
                  <GroupedNavigation pathname={pathname} mobile />
                </>
              )}
            </div>
          </details>
        </header>
        <main className="app-main">{children}</main>
      </div>
    </div>
  );
}

function TechnicianNavigation({ pathname, mobile = false }: { pathname: string; mobile?: boolean }) {
  return (
    <nav className={mobile ? "app-nav mobile" : "app-nav"} aria-label={mobile ? "Navigation mobile technicien" : "Navigation technicien"}>
      <div className="app-nav-group">
        <span className="app-nav-group-label">Terrain</span>
        <div>
          {TECH_ITEMS.map(({ href, label }) => (
            <Link key={href} href={href} className={isAppNavActive(pathname, href) ? "active" : ""}>
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}

function GroupedNavigation({ pathname, mobile = false }: { pathname: string; mobile?: boolean }) {
  return (
    <nav className={mobile ? "app-nav mobile" : "app-nav"} aria-label={mobile ? "Navigation mobile" : "Navigation principale"}>
      {SESIRA_APP_NAV_GROUPS.map((group) => (
        <div className="app-nav-group" key={group.label}>
          <span className="app-nav-group-label">{group.label}</span>
          <div>
            {group.items.map(({ href, label }) => (
              <Link key={href} href={href} className={isAppNavActive(pathname, href) ? "active" : ""}>
                <span>{label}</span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function workspaceInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "S";
}

function roleLabel(role: string) {
  const labels: Record<string, string> = {
    OWNER: "Propriétaire",
    ADMIN: "Administrateur",
    MANAGER: "Responsable",
    MEMBER: "Membre",
    VIEWER: "Lecture seule",
    TECH: "Technicien",
    TECHNICIAN: "Technicien",
  };
  return labels[role] ?? "Membre de l’équipe";
}
