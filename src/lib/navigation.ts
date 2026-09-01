export const SESIRA_APP_NAV = [
  { href: "/app", label: "Vue d'ensemble", index: "01" },
  { href: "/app/clients", label: "Clients", index: "02" },
  { href: "/app/devis", label: "Devis", index: "03" },
  { href: "/app/suivi", label: "Suivi", index: "04" },
  { href: "/app/equipe", label: "Équipe", index: "05" },
  { href: "/app/integrations", label: "Intégrations", index: "06" },
  { href: "/app/parametres", label: "Paramètres", index: "07" },
] as const;

export function isAppNavActive(pathname: string, href: string) {
  return href === "/app" ? pathname === href : pathname.startsWith(href);
}
