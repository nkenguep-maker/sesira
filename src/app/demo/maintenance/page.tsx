import { EmptyState, PageHeader, StatusPill } from "@/components/sesira/ui";
import { getMaintenanceWorkspace } from "@/lib/data/c32-workspaces";
import { DEMO_ORGANIZATION_ID } from "@/lib/demo/context";

export const dynamic = "force-dynamic";

export default async function DemoMaintenancePage() {
  const result = await getMaintenanceWorkspace(DEMO_ORGANIZATION_ID);
  const rows = result.status === "OK" ? result.rows : [];
  return (
    <>
      <PageHeader eyebrow="DÉMO · ENTRETIEN" title="Maintenance" description="Contrats d’entretien fictifs et prochaines échéances." />
      <section className="premium-connection-summary"><div><strong>{rows.length}</strong><span>Contrats</span></div><div><strong>{rows.filter((r)=>r.status === "ACTIVE").length}</strong><span>Actifs</span></div></section>
      {rows.length ? <section className="premium-connection-grid">{rows.map((row) => (
        <article key={row.id} className="premium-connection-card"><header><div><span className="eyebrow">{row.externalRef ?? "CONTRAT FICTIF"}</span><h2>{row.title}</h2></div><StatusPill tone={row.status === "ACTIVE" ? "good" : row.status === "EXPIRING_SOON" ? "warning" : "neutral"}>{label(row.status)}</StatusPill></header><div className="premium-data-list compact"><div><span>Montant</span><strong>{row.amount === null ? "—" : new Intl.NumberFormat("fr-FR",{style:"currency",currency:row.currency}).format(row.amount)}</strong></div><div><span>Prochaine visite</span><strong>{row.nextVisitDueAt ? date(row.nextVisitDueAt) : "Non planifiée"}</strong></div><div><span>Fin du contrat</span><strong>{row.endDate ? date(row.endDate) : "Non renseignée"}</strong></div></div></article>
      ))}</section> : <EmptyState title="Aucun contrat" description="Le tenant de démonstration est vide." />}
    </>
  );
}
function label(v:string){return ({DRAFT:"Brouillon",ACTIVE:"Actif",EXPIRING_SOON:"Échéance proche",EXPIRED:"Expiré",CANCELLED:"Annulé"} as Record<string,string>)[v]??v;}
function date(v:string){const d=new Date(v);return Number.isNaN(d.getTime())?"—":new Intl.DateTimeFormat("fr-FR",{dateStyle:"medium"}).format(d);}
