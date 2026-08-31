"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { href: "/app/attention", label: "À traiter", exact: false, section: "" },
  { href: "/app/quotes", label: "Devis", exact: false, section: "" },
  { href: "/app/requests", label: "Demandes", exact: false, section: "" },
  { href: "/app/customers", label: "Clients", exact: false, section: "" },
  { href: "/app/marketing", label: "E-mails", exact: false, section: "preview" },
  { href: "/app/marketing", label: "Factures", exact: false, section: "preview" },
  { href: "/app/marketing", label: "Documents", exact: false, section: "preview" },
  { href: "/app/marketing", label: "Interventions", exact: false, section: "preview" },
  { href: "/app/results", label: "Résultats", exact: false, section: "" },
  { href: "/app/reports", label: "Rapports", exact: false, section: "" },
  { href: "/app/automations", label: "Automatisations", exact: false, section: "" },
  { href: "/app/settings", label: "Réglages", exact: false, section: "" },
];

export function AppNavigation({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname();

  return (
    <nav
      className="hidden border-b border-white/15 bg-[var(--ink)] lg:grid lg:grid-cols-1 lg:gap-0 lg:border-b-0 lg:py-3"
      aria-label="Navigation principale"
    >
      {navigation.map(({ href, label, exact, section }, index) => {
        const preview = section === "preview";
        const active = !preview && (exact ? pathname === href : pathname.startsWith(href));

        return (
          <Link key={`${label}-${index}`} href={preview ? "/app/marketing" : href}
            aria-current={active ? "page" : undefined}
            title={collapsed ? label : undefined}
            className={`sesira-nav-item flex min-h-10 shrink-0 items-center gap-3 px-[1.375rem] py-2.5 text-sm transition lg:shrink ${collapsed ? "lg:justify-center lg:px-2" : ""} ${
              active
                ? "active"
                : preview ? "preview" : "text-white/65 hover:bg-white/5 hover:text-white"
            }`}
          ><span className="sesira-nav-mark" aria-hidden="true">{active ? "•" : "·"}</span>{collapsed ? <span className="sr-only">{label}</span> : <><span className="mono">{label}</span>{preview ? <small>APERÇU</small> : null}</>}</Link>
        );
      })}
    </nav>
  );
}
