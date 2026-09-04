export type SesiraAppNavItem = {
  href: string;
  label: string;
};

type SesiraAppNavGroup = {
  label: string;
  items: readonly SesiraAppNavItem[];
};

export const SESIRA_APP_NAV_GROUPS = [
  {
    label: "Commercial",
    items: [
      { href: "/app/clients", label: "Clients" },
      { href: "/app/devis", label: "Devis" },
      { href: "/app/opportunites", label: "Opportunités" },
      { href: "/app/suivi", label: "Suivi" },
      { href: "/app/appels", label: "Appels" },
    ],
  },
  {
    label: "Opérations",
    items: [
      { href: "/app/interventions", label: "Interventions" },
      { href: "/app/terrain", label: "Terrain" },
      { href: "/app/rapports", label: "Rapports terrain" },
      { href: "/app/documents", label: "Documents" },
      { href: "/app/factures", label: "Factures" },
      { href: "/app/maintenance", label: "Maintenance" },
    ],
  },
  {
    label: "Obligations CVC",
    items: [
      { href: "/app/obligations/equipements", label: "Équipements & fluides" },
      { href: "/app/obligations/documents", label: "Documents à préparer" },
    ],
  },
  {
    label: "Croissance",
    items: [
      { href: "/app/croissance", label: "Vue croissance" },
      { href: "/app/croissance/contenus", label: "Contenus" },
      { href: "/app/croissance/conversations", label: "Conversations" },
      { href: "/app/croissance/attribution", label: "Attribution" },
    ],
  },
  {
    label: "Système",
    items: [
      { href: "/app/imports", label: "Imports" },
      { href: "/app/automatisations", label: "Automatisations" },
      { href: "/app/integrations", label: "Connexions" },
    ],
  },
  {
    label: "Pilotage",
    items: [
      { href: "/app/resultats", label: "Résultats" },
      { href: "/app/etat-sesira", label: "État SESIRA" },
      { href: "/app/equipe", label: "Équipe" },
      { href: "/app/parametres", label: "Paramètres" },
    ],
  },
] as const satisfies readonly SesiraAppNavGroup[];

export const SESIRA_APP_NAV: readonly SesiraAppNavItem[] = [
  { href: "/app", label: "Aujourd’hui" },
  ...SESIRA_APP_NAV_GROUPS.flatMap((group) => [...group.items]),
];

export function isAppNavActive(pathname: string, href: string) {
  return href === "/app" ? pathname === href : pathname.startsWith(href);
}
