import { EmptyState, PageHeader } from "@/components/sesira/ui";

export default function DevisPage() {
  return <><PageHeader eyebrow="03 · REVENU" title="Devis" description="Suivez les devis depuis leur création jusqu'à la décision." actions={<button className="button primary small">Nouveau devis</button>} /><EmptyState title="Aucun devis disponible" description="Les devis réels apparaîtront ici une fois le core ou votre source commerciale connecté." /></>;
}
