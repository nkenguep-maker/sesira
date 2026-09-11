"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  Bot,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  ClipboardCheck,
  FileText,
  FolderOpen,
  Gauge,
  LayoutDashboard,
  LifeBuoy,
  ListTodo,
  Search,
  Settings,
  ShieldCheck,
  TrendingUp,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import {
  GROWTH_TABS,
  INTERVENTION_TABS,
  QUOTE_TABS,
  type SesiraAppNavItem,
} from "@/lib/navigation";

import { SesiraLogo } from "./logo";

const TECH_ROLES = new Set(["TECH", "TECHNICIAN"]);

type ProductNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  matches?: readonly string[];
};

const MANAGER_PRIMARY: readonly ProductNavItem[] = [
  { href: "/app", label: "Tableau de bord", icon: LayoutDashboard, matches: ["/app"] },
  { href: "/app/suivi", label: "File de décisions", icon: ListTodo },
  { href: "/app/clients", label: "Clients", icon: Users },
  { href: "/app/devis", label: "Devis", icon: FileText, matches: ["/app/devis", "/app/opportunites"] },
  { href: "/app/interventions", label: "Interventions", icon: CalendarDays, matches: ["/app/interventions", "/app/terrain", "/app/rapports"] },
  { href: "/app/factures", label: "Factures", icon: CircleDollarSign },
  { href: "/app/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/app/obligations/documents", label: "Obligations", icon: ShieldCheck, matches: ["/app/obligations"] },
] as const;

const MANAGER_PILOTING: readonly ProductNavItem[] = [
  { href: "/app/automatisations", label: "Automatisations", icon: Bot, matches: ["/app/automatisations", "/app/automations"] },
  { href: "/app/resultats", label: "Résultats", icon: BarChart3, matches: ["/app/resultats", "/app/results"] },
  { href: "/app/documents", label: "Documents", icon: FolderOpen },
] as const;

const TECH_PRIMARY: readonly ProductNavItem[] = [
  { href: "/app", label: "Ma journée", icon: LayoutDashboard, matches: ["/app"] },
  { href: "/app/terrain", label: "Terrain", icon: Wrench },
  { href: "/app/rapports", label: "Rapports", icon: ClipboardCheck },
  { href: "/app/documents", label: "Documents", icon: FileText },
] as const;

const ORGANIZATION_NAV: readonly ProductNavItem[] = [
  { href: "/app/equipe", label: "Équipe", icon: Users },
  { href: "/app/imports", label: "Imports", icon: BriefcaseBusiness },
  { href: "/app/integrations", label: "Connexions", icon: Gauge },
  { href: "/app/parametres", label: "Paramètres", icon: Settings },
] as const;

const SYSTEM_NAV: readonly ProductNavItem[] = [
  { href: "/app/etat-sesira", label: "État de SESIRA", icon: LifeBuoy },
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
  const primary = technician ? TECH_PRIMARY : MANAGER_PRIMARY;
  const piloting = technician
    ? []
    : growthEnabled
      ? [...MANAGER_PILOTING, { href: "/app/croissance", label: "Croissance", icon: TrendingUp, matches: ["/app/croissance"] } satisfies ProductNavItem]
      : MANAGER_PILOTING;
  const tabs = technician ? null : tabsForPath(pathname, growthEnabled);

  return (
    <div className="sesira-product-shell">
      <aside className="sesira-product-sidebar">
        <div className="sesira-product-brand">
          <Link href="/app" aria-label="Retour à l'accueil SESIRA" className="sesira-product-logo-link">
            <SesiraLogo />
          </Link>
          <div className="sesira-product-workspace">
            <strong>{workspaceName}</strong>
            <span>{workspaceRole(role)}</span>
          </div>
        </div>

        <div className="sesira-product-nav-scroll">
          <nav className="sesira-product-nav" aria-label={technician ? "Navigation technicien" : "Navigation principale SESIRA"}>
            <span className="sesira-product-nav-label">Navigation</span>
            {primary.map((item) => <ProductNavLink key={item.href} pathname={pathname} item={item} />)}
          </nav>

          {!technician ? (
            <nav className="sesira-product-nav sesira-product-nav-secondary" aria-label="Pilotage SESIRA">
              <span className="sesira-product-nav-label">Pilotage</span>
              {piloting.map((item) => <ProductNavLink key={item.href} pathname={pathname} item={item} />)}
            </nav>
          ) : null}
        </div>

        <div className="sesira-product-sidebar-footer">
          {!technician ? (
            <OrganizationMenu workspaceName={workspaceName} role={role} pathname={pathname} />
          ) : null}
          <Link className="sesira-product-help" href="/app/etat-sesira"><LifeBuoy size={17} /><span>État de SESIRA</span></Link>
        </div>
      </aside>

      <div className="sesira-product-body">
        <header className="sesira-product-topbar">
          <div className="sesira-product-context">
            <span>{currentSectionLabel(pathname, technician, growthEnabled)}</span>
            <small>{workspaceName}</small>
          </div>
          <div className="sesira-product-topbar-actions">
            {!technician ? <Link className="sesira-product-autonomy" href="/app/automatisations"><span />Autonomie</Link> : null}
            <Link className="sesira-product-search" href="/app/clients" aria-label="Rechercher un client"><Search size={17} /><span>Rechercher un client</span></Link>
            <Link className="sesira-product-icon-button" href="/app/suivi" aria-label="Voir la file de décisions"><Bell size={18} /></Link>
            <Link className="sesira-product-avatar" href="/app/parametres" aria-label="Ouvrir les paramètres de l'organisation">{workspaceInitial(workspaceName)}</Link>
          </div>
        </header>

        <main className="sesira-product-main">
          {tabs ? <ProductSectionTabs pathname={pathname} items={tabs} /> : null}
          {children}
        </main>
      </div>
    </div>
  );
}

function ProductNavLink({ pathname, item }: { pathname: string; item: ProductNavItem }) {
  const Icon = item.icon;
  const active = isProductNavActive(pathname, item);
  return (
    <Link href={item.href} className={active ? "active" : ""} aria-current={active ? "page" : undefined}>
      <Icon size={18} strokeWidth={1.9} />
      <span>{item.label}</span>
    </Link>
  );
}

function OrganizationMenu({ workspaceName, role, pathname }: { workspaceName: string; role: string; pathname: string }) {
  const open = ORGANIZATION_NAV.some((item) => isProductNavActive(pathname, item));
  return (
    <details className="sesira-product-org" open={open}>
      <summary>
        <span className="sesira-product-org-icon"><Building2 size={17} /></span>
        <span className="sesira-product-org-copy"><strong>Organisation</strong><small>{workspaceName}</small></span>
        <ChevronDown className="sesira-product-org-chevron" size={16} />
      </summary>
      <div className="sesira-product-org-menu">
        {ORGANIZATION_NAV.map((item) => <ProductNavLink key={item.href} pathname={pathname} item={item} />)}
      </div>
      <span className="sesira-product-role-note">{workspaceRole(role)}</span>
    </details>
  );
}

function ProductSectionTabs({ pathname, items }: { pathname: string; items: readonly SesiraAppNavItem[] }) {
  return (
    <nav className="sesira-product-tabs" aria-label="Navigation de section">
      {items.map((item) => {
        const active = isSectionTabActive(pathname, item.href);
        return <Link key={item.href} href={item.href} className={active ? "active" : ""} aria-current={active ? "page" : undefined}>{item.label}</Link>;
      })}
    </nav>
  );
}

function tabsForPath(pathname: string, growthEnabled: boolean): readonly SesiraAppNavItem[] | null {
  if (["/app/devis", "/app/opportunites"].some((prefix) => routeMatches(pathname, prefix))) return QUOTE_TABS;
  if (["/app/interventions", "/app/rapports"].some((prefix) => routeMatches(pathname, prefix))) return INTERVENTION_TABS;
  if (growthEnabled && routeMatches(pathname, "/app/croissance")) return GROWTH_TABS;
  return null;
}

function isProductNavActive(pathname: string, item: ProductNavItem) {
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

function currentSectionLabel(pathname: string, technician: boolean, growthEnabled: boolean) {
  const items: ProductNavItem[] = [
    ...(technician ? TECH_PRIMARY : MANAGER_PRIMARY),
    ...(!technician ? MANAGER_PILOTING : []),
    ...(!technician ? ORGANIZATION_NAV : []),
    ...SYSTEM_NAV,
  ];
  if (!technician && growthEnabled) items.push({ href: "/app/croissance", label: "Croissance", icon: TrendingUp, matches: ["/app/croissance"] });
  const active = items.find((item) => isProductNavActive(pathname, item));
  return active?.label ?? "SESIRA";
}

function workspaceRole(role: string) {
  if (role === "OWNER") return "Dirigeant";
  if (role === "ADMIN") return "Administration";
  if (TECH_ROLES.has(role)) return "Technicien";
  return "Équipe";
}

function workspaceInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "S";
}
