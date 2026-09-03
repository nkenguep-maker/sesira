export const SESIRA_APP_NAV = [
  { href: "/app", label: "Vue d'ensemble", index: "01" },
  { href: "/app/clients", label: "Clients", index: "02" },
  { href: "/app/devis", label: "Devis", index: "03" },
  { href: "/app/opportunites", label: "Opportunités", index: "04" },
  { href: "/app/suivi", label: "Suivi", index: "05" },
  { href: "/app/imports", label: "Imports", index: "06" },
  { href: "/app/automatisations", label: "Automatisations", index: "07" },
  { href: "/app/resultats", label: "Résultats", index: "08" },
  { href: "/app/equipe", label: "Équipe", index: "09" },
  { href: "/app/integrations", label: "Connexions", index: "10" },
  { href: "/app/parametres", label: "Paramètres", index: "11" },
] as const;

export function isAppNavActive(pathname: string, href: string) {
  return href === "/app" ? pathname === href : pathname.startsWith(href);
}
