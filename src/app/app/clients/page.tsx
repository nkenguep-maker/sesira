import { EmptyState, PageHeader } from "@/components/sesira/ui";

export default function ClientsPage() {
  return <><PageHeader eyebrow="02 · RELATIONS" title="Clients" description="Tous les comptes et contacts reliés au travail réel." actions={<button className="button primary small">Ajouter un client</button>} /><EmptyState title="Aucun client connecté" description="Importez ou créez votre premier client. SESIRA n'affiche pas de contacts fictifs." action={<button className="button ghost">Préparer un import</button>} /></>;
}
