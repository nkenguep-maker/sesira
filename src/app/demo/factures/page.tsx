import { EmptyState, PageHeader, StatusPill } from "@/components/sesira/ui";
import { getInvoiceCollectionWorkspace } from "@/lib/data/invoice-collection";
import { DEMO_ORGANIZATION_ID } from "@/lib/demo/context";

export const dynamic = "force-dynamic";

export default async function DemoInvoicesPage() {
  const result = await getInvoiceCollectionWorkspace(DEMO_ORGANIZATION_ID);
  const rows = result.status === "OK" ? result.rows : [];
  return (
    <>
      <PageHeader eyebrow="DÉMO · ENCAISSEMENT" title="Factures" description="Factures fictives, échéances et situations de paiement." />
      <section className="premium-connection-summary"><div><strong>{rows.length}</strong><span>Total</span></div><div><strong>{rows.filter((r) => r.status === "OVERDUE").length}</strong><span>En retard</span></div><div><strong>{rows.filter((r) => r.status === "PAID").length}</strong><span>Payées</span></div></section>
      {rows.length ? <section className="premium-connection-grid">{rows.map((row) => (
        <article key={row.id} className="premium-connection-card"><header><div><span className="eyebrow">{row.externalRef ?? "FACTURE FICTIVE"}</span><h2>{money(row.amount,row.currency)}</h2></div><StatusPill tone={row.status === "OVERDUE" ? "warning" : row.status === "PAID" ? "good" : "neutral"}>{label(row.status)}</StatusPill></header><div className="premium-data-list compact"><div><span>Échéance</span><strong>{row.dueAt ? date(row.dueAt) : "Non renseignée"}</strong></div><div><span>Situation</span><strong>{collection(row.collectionState)}</strong></div><div><span>Retard observé</span><strong>{row.pastDueDays ? `${row.pastDueDays} jours` : "—"}</strong></div></div></article>
      ))}</section> : <EmptyState title="Aucune facture" description="Le tenant de démonstration est vide." />}
    </>
  );
}
function label(v:string){return ({DRAFT:"Brouillon",ISSUED:"Émise",OVERDUE:"En retard",PAID:"Payée",CANCELLED:"Annulée"} as Record<string,string>)[v]??v;}
function collection(v:string){return ({NORMAL:"Suivi normal",PROMISE_TO_PAY:"Promesse de paiement",DISPUTED:"Litige"} as Record<string,string>)[v]??v;}
function money(a:number,c:string){return new Intl.NumberFormat("fr-FR",{style:"currency",currency:c}).format(a);}
function date(v:string){const d=new Date(v);return Number.isNaN(d.getTime())?"—":new Intl.DateTimeFormat("fr-FR",{dateStyle:"medium"}).format(d);}
