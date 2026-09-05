import { EmptyState, PageHeader, StatusPill } from "@/components/sesira/ui";
import { getDocumentsWorkspace } from "@/lib/data/c32-workspaces";
import { DEMO_ORGANIZATION_ID } from "@/lib/demo/context";

export const dynamic = "force-dynamic";

export default async function DemoDocumentsPage() {
  const result = await getDocumentsWorkspace(DEMO_ORGANIZATION_ID);
  const rows = result.status === "OK" ? result.rows : [];
  return (
    <>
      <PageHeader eyebrow="DÉMO · DOCUMENTS" title="Documents" description="Références de fichiers fictifs du scénario THERMOPRO." />
      {rows.length ? <section className="premium-connection-grid">{rows.map((row)=>(<article key={row.id} className="premium-connection-card"><header><div><span className="eyebrow">{row.kind}</span><h2>{row.fileName}</h2></div><StatusPill tone={row.status === "VALIDATED" ? "good" : "neutral"}>{row.status}</StatusPill></header><div className="premium-data-list compact"><div><span>Type lié</span><strong>{row.entityType ?? "—"}</strong></div><div><span>Référence</span><strong>{row.fileReference}</strong></div><div><span>Ajouté</span><strong>{date(row.uploadedAt)}</strong></div></div></article>))}</section> : <EmptyState title="Aucun document" description="Le tenant de démonstration est vide." />}
    </>
  );
}
function date(v:string){const d=new Date(v);return Number.isNaN(d.getTime())?"—":new Intl.DateTimeFormat("fr-FR",{dateStyle:"medium"}).format(d);}
