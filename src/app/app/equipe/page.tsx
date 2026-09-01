import { EmptyState, PageHeader } from "@/components/sesira/ui";

export default function TeamPage() {
  return <><PageHeader eyebrow="05 · ORGANISATION" title="Équipe" description="Les membres, leurs rôles et leur périmètre de travail." actions={<button className="button primary small">Inviter</button>} /><EmptyState title="Aucun membre chargé" description="Les membres réels de l'organisation seront affichés ici lorsque la source d'équipe sera connectée." /></>;
}
