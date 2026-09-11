"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  Bot,
  Building2,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  FileText,
  FolderOpen,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Search,
  ShieldCheck,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { SesiraLogo } from "@/components/sesira/logo";

type DemoNavItem = { href: string; label: string; icon: LucideIcon; matches?: readonly string[] };

const PRIMARY: readonly DemoNavItem[] = [
  { href: "/demo", label: "Tableau de bord", icon: LayoutDashboard, matches: ["/demo"] },
  { href: "/demo/relances", label: "File de décisions", icon: ListTodo },
  { href: "/demo/clients", label: "Clients", icon: Users },
  { href: "/demo/devis", label: "Devis", icon: FileText },
  { href: "/demo/interventions", label: "Interventions", icon: CalendarDays },
  { href: "/demo/factures", label: "Factures", icon: CircleDollarSign },
  { href: "/demo/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/demo/obligations", label: "Obligations", icon: ShieldCheck },
] as const;

const PILOTING: readonly DemoNavItem[] = [
  { href: "/demo/automatisations", label: "Automatisations", icon: Bot },
  { href: "/demo/resultats", label: "Résultats", icon: BarChart3 },
  { href: "/demo/documents", label: "Documents", icon: FolderOpen },
] as const;

export function DemoShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const items = [...PRIMARY, ...PILOTING];
  const active = items.find((item) => isActive(pathname, item));

  return (
    <div className="sesira-product-shell">
      <aside className="sesira-product-sidebar">
        <div className="sesira-product-brand">
          <Link href="/demo" aria-label="Retour au tableau de bord de démonstration SESIRA" className="sesira-product-logo-link"><SesiraLogo /></Link>
          <div className="sesira-product-workspace"><strong>THERMOPRO SERVICES</strong><span>Dirigeant · Démo</span></div>
        </div>

        <div className="sesira-product-nav-scroll">
          <nav className="sesira-product-nav" aria-label="Navigation principale de la démonstration">
            <span className="sesira-product-nav-label">Navigation</span>
            {PRIMARY.map((item) => <DemoNavLink key={item.href} pathname={pathname} item={item} />)}
          </nav>
          <nav className="sesira-product-nav sesira-product-nav-secondary" aria-label="Pilotage de la démonstration">
            <span className="sesira-product-nav-label">Pilotage</span>
            {PILOTING.map((item) => <DemoNavLink key={item.href} pathname={pathname} item={item} />)}
          </nav>
        </div>

        <div className="sesira-product-sidebar-footer">
          <details className="sesira-product-org">
            <summary>
              <span className="sesira-product-org-icon"><Building2 size={17} /></span>
              <span className="sesira-product-org-copy"><strong>Organisation</strong><small>THERMOPRO SERVICES</small></span>
              <ChevronDown className="sesira-product-org-chevron" size={16} />
            </summary>
            <div className="sesira-product-org-menu">
              <Link href="/demo/equipe"><Users size={18} /><span>Équipe</span></Link>
            </div>
            <span className="sesira-product-role-note">Données fictives</span>
          </details>
          <Link className="sesira-product-help" href="/"><LogOut size={17} /><span>Quitter la démo</span></Link>
        </div>
      </aside>

      <div className="sesira-product-body">
        <header className="sesira-product-topbar">
          <div className="sesira-product-context"><span>{active?.label ?? "SESIRA"}</span><small>THERMOPRO SERVICES</small></div>
          <div className="sesira-product-topbar-actions">
            <Link className="sesira-product-autonomy" href="/demo/automatisations"><span />Autonomie</Link>
            <Link className="sesira-product-search" href="/demo/clients" aria-label="Rechercher un client fictif"><Search size={17} /><span>Rechercher un client</span></Link>
            <Link className="sesira-product-icon-button" href="/demo/relances" aria-label="Voir la file de décisions"><Bell size={18} /></Link>
            <span className="sesira-product-avatar" aria-label="Mode démonstration">T</span>
          </div>
        </header>
        <main className="sesira-product-main">{children}</main>
      </div>
    </div>
  );
}

function DemoNavLink({ pathname, item }: { pathname: string; item: DemoNavItem }) {
  const Icon = item.icon;
  const selected = isActive(pathname, item);
  return <Link href={item.href} className={selected ? "active" : ""} aria-current={selected ? "page" : undefined}><Icon size={18} strokeWidth={1.9} /><span>{item.label}</span></Link>;
}

function isActive(pathname: string, item: DemoNavItem) {
  return (item.matches ?? [item.href]).some((prefix) => prefix === "/demo" ? pathname === "/demo" : pathname === prefix || pathname.startsWith(`${prefix}/`));
}
