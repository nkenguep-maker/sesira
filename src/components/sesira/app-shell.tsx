"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SESIRA_APP_NAV_GROUPS, isAppNavActive } from "@/lib/navigation";

import { SesiraLogo } from "./logo";

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

  return (
    <div className="app-frame">
      <aside className="app-sidebar">
        <div className="sidebar-top">
          <SesiraLogo />
          <Link href="/app" className={pathname === "/app" ? "sidebar-home active" : "sidebar-home"}>
            Aujourd’hui
          </Link>
        </div>

        <nav className="app-nav" aria-label="Navigation principale">
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
          <Link href="/app" className="button ghost small">Aujourd’hui</Link>
        </header>
        <main className="app-main">{children}</main>
      </div>
    </div>
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
  };
  return labels[role] ?? "Membre de l’équipe";
}
