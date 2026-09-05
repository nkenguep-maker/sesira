import { EmptyState, PageHeader, StatusPill } from "@/components/sesira/ui";
import { getRegulatoryWorkspace } from "@/lib/data/c40-ui";
import { DEMO_ORGANIZATION_ID } from "@/lib/demo/context";

export const dynamic = "force-dynamic";

export default async function DemoRegulatoryPage() {
  const result = await getRegulatoryWorkspace(DEMO_ORGANIZATION_ID);
  if (result.status === "ERROR") return <EmptyState title="Données indisponibles" description="La couche obligations ne peut pas être lue dans cette démo." />;
  const { equipment, attentions, attestations } = result.data;
  return (
    <>
      <PageHeader eyebrow="DÉMO · OBLIGATIONS CVC" title="Équipements & documents" description="Données fictives. SESIRA affiche des points à vérifier, jamais un verdict réglementaire." />
      <section className="premium-connection-summary"><div><strong>{equipment.length}</strong><span>Équipements</span></div><div><strong>{attentions.length}</strong><span>Points à vérifier</span></div><div><strong>{attestations.length}</strong><span>Attestations</span></div></section>
      {attentions.length ? <section className="premium-connection-grid">{attentions.map((item)=>(<article key={item.id} className="premium-connection-card"><header><div><span className="eyebrow">POINT À VÉRIFIER</span><h2>{item.title}</h2></div><StatusPill tone={item.priority === "HIGH" || item.priority === "URGENT" ? "warning" : "neutral"}>{item.priority}</StatusPill></header><p style={{color:"var(--ink-soft)"}}>{item.explanation ?? item.suggestedAction ?? "Vérification humaine requise."}</p></article>))}</section> : null}
      <section className="premium-connection-grid">{equipment.map((item)=>(<article key={item.id} className="premium-connection-card"><header><div><span className="eyebrow">ÉQUIPEMENT FICTIF</span><h2>{item.label}</h2></div><StatusPill>{item.status}</StatusPill></header><div className="premium-data-list compact"><div><span>Fluide</span><strong>{item.fluidCode ?? "Non renseigné"}</strong></div><div><span>Charge</span><strong>{item.chargeKg === null ? "—" : `${item.chargeKg} kg`}</strong></div><div><span>Prochain contrôle</span><strong>{item.nextLeakCheck?.status === "DUE" ? date(item.nextLeakCheck.nextDueAt) : item.nextLeakCheck?.status === "OUT_OF_SCOPE" ? "Hors périmètre calculé" : "Indisponible"}</strong></div></div></article>))}</section>
    </>
  );
}
function date(v:string){const d=new Date(v);return Number.isNaN(d.getTime())?"—":new Intl.DateTimeFormat("fr-FR",{dateStyle:"medium"}).format(d);}
