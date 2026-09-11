"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Bot,
  CalendarDays,
  CircleDollarSign,
  FileText,
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

const DEMO_NAV: readonly DemoNavItem[] = [
  { href: "/demo", label: "Tableau de bord", icon: LayoutDashboard, matches: ["/demo"] },
  { href: "/demo/relances", label: "File de décisions", icon: ListTodo },
  { href: "/demo/clients", label: "Clients", icon: Users },
  { href: "/demo/devis", label: "Devis", icon: FileText },
  { href: "/demo/interventions", label: "Interventions", icon: CalendarDays },
  { href: "/demo/factures", label: "Factures", icon: CircleDollarSign },
  { href: "/demo/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/demo/obligations", label: "Obligations", icon: ShieldCheck },
  { href: "/demo/automatisations", label: "Automatisations", icon: Bot },
] as const;

export function DemoShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const active = DEMO_NAV.find((item) => isDemoNavActive(pathname, item));

  return (
    <div className="sesira-product-shell demo-product-shell">
      <aside className="sesira-product-sidebar">
        <div className="sesira-product-brand">
          <Link href="/demo" aria-label="Retour au tableau de bord de démonstration SESIRA" className="sesira-product-logo-link"><SesiraLogo /></Link>
          <div className="sesira-product-workspace"><strong>Clim & Froid Dauphiné</strong><span>Démonstration</span></div>
        </div>

        <nav className="sesira-product-nav" aria-label="Navigation de la démonstration">
          <span className="sesira-product-nav-label">Navigation</span>
          {DEMO_NAV.map((item) => <DemoNavLink key={item.href} pathname={pathname} item={item} />)}
        </nav>

        <div className="sesira-product-sidebar-footer">
          <Link className="sesira-product-help" href="/demo/equipe"><Users size={17} /><span>Équipe de démo</span></Link>
          <Link className="sesira-product-help" href="/"><LogOut size={17} /><span>Quitter la démo</span></Link>
        </div>
      </aside>

      <div className="sesira-product-body">
        <header className="sesira-product-topbar">
          <div className="sesira-product-context"><span>{active?.label ?? "SESIRA Démo"}</span><small>Données fictives · aucun envoi réel</small></div>
          <div className="sesira-product-topbar-actions">
            <span className="sesira-demo-badge">Démo</span>
            <Link className="sesira-product-search" href="/demo/clients"><Search size={17} /><span>Rechercher</span><kbd>⌘K</kbd></Link>
            <Link className="sesira-product-icon-button" href="/demo/relances" aria-label="Voir les décisions de démonstration"><Bell size={18} /></Link>
            <span className="sesira-product-avatar" aria-hidden="true">LM</span>
          </div>
        </header>
        <main className="sesira-product-main">{children}</main>
      </div>
    </div>
  );
}

function DemoNavLink({ pathname, item }: { pathname: string; item: DemoNavItem }) {
  const Icon = item.icon;
  const selected = isDemoNavActive(pathname, item);
  return <Link href={item.href} className={selected ? "active" : ""} aria-current={selected ? "page" : undefined}><Icon size={18} strokeWidth={1.9} /><span>{item.label}</span></Link>;
}

function isDemoNavActive(pathname: string, item: DemoNavItem) { return (item.matches ?? [item.href]).some((match) => routeMatches(pathname, match)); }
function routeMatches(pathname: string, prefix: string) { if (prefix === "/demo") return pathname === "/demo"; return pathname === prefix || pathname.startsWith(`${prefix}/`); }
