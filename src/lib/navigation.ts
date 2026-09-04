export type SesiraAppNavItem = {
  href: string;
  label: string;
  matches?: readonly string[];
};

export const SESIRA_PRIMARY_NAV = [
  { href: "/app", label: "Aujourd’hui", matches: ["/app"] },
  { href: "/app/clients", label: "Clients" },
  { href: "/app/devis", label: "Devis", matches: ["/app/devis", "/app/opportunites", "/app/suivi"] },
  { href: "/app/interventions", label: "Interventions", matches: ["/app/interventions", "/app/rapports"] },
  { href: "/app/factures", label: "Factures" },
  { href: "/app/maintenance", label: "Maintenance" },
  { href: "/app/documents", label: "Documents" },
] as const satisfies readonly SesiraAppNavItem[];

export const SESIRA_SECONDARY_NAV = [
  { href: "/app/automatisations", label: "Automatisations" },
  { href: "/app/resultats", label: "Résultats" },
] as const satisfies readonly SesiraAppNavItem[];

export const SESIRA_ORGANIZATION_NAV = [
  { href: "/app/equipe", label: "Équipe" },
  { href: "/app/imports", label: "Imports" },
  { href: "/app/integrations", label: "Connexions" },
  { href: "/app/parametres", label: "Paramètres" },
] as const satisfies readonly SesiraAppNavItem[];

export const SESIRA_GROWTH_NAV = {
  href: "/app/croissance",
  label: "Croissance",
  matches: ["/app/croissance"],
} as const satisfies SesiraAppNavItem;

export const QUOTE_TABS = [
  { href: "/app/devis", label: "Tous" },
  { href: "/app/opportunites", label: "Opportunités" },
  { href: "/app/suivi", label: "Relances" },
] as const satisfies readonly SesiraAppNavItem[];

export const INTERVENTION_TABS = [
  { href: "/app/interventions", label: "Interventions" },
  { href: "/app/rapports", label: "Rapports terrain" },
] as const satisfies readonly SesiraAppNavItem[];

export const GROWTH_TABS = [
  { href: "/app/croissance", label: "Vue d’ensemble" },
  { href: "/app/croissance/contenus", label: "Contenus" },
  { href: "/app/croissance/conversations", label: "Conversations" },
  { href: "/app/croissance/attribution", label: "Attribution" },
] as const satisfies readonly SesiraAppNavItem[];

export function isAppNavActive(pathname: string, item: SesiraAppNavItem) {
  const matches = item.matches ?? [item.href];
  return matches.some((match) => {
    if (match === "/app") return pathname === "/app";
    return pathname === match || pathname.startsWith(`${match}/`);
  });
}
