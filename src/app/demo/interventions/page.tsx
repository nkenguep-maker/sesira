import { EmptyState, PageHeader, StatusPill } from "@/components/sesira/ui";
import { getInterventionsWorkspace, getFieldReportsWorkspace } from "@/lib/data/c32-workspaces";
import { DEMO_ORGANIZATION_ID } from "@/lib/demo/context";

export const dynamic = "force-dynamic";

export default async function DemoInterventionsPage() {
  const [interventions, reports] = await Promise.all([getInterventionsWorkspace(DEMO_ORGANIZATION_ID), getFieldReportsWorkspace(DEMO_ORGANIZATION_ID)]);
  const rows = interventions.status === "OK" ? interventions.rows : [];
  const reportByIntervention = new Map((reports.status === "OK" ? reports.rows : []).map((r) => [r.interventionId, r] as const));
  return (
    <>
      <PageHeader eyebrow="DÉMO · TERRAIN" title="Interventions" description="Planning et comptes rendus fictifs de THERMOPRO SERVICES." />
      <section className="premium-connection-summary"><div><strong>{rows.length}</strong><span>Total</span></div><div><strong>{rows.filter((r) => r.status === "PLANNED" || r.status === "CONFIRMED").length}</strong><span>Planifiées</span></div><div><strong>{rows.filter((r) => r.status === "COMPLETED").length}</strong><span>Terminées</span></div></section>
      {rows.length ? <section className="premium-connection-grid">{rows.map((row) => { const report = reportByIntervention.get(row.id); return (
        <article key={row.id} className="premium-connection-card"><header><div><span className="eyebrow">INTERVENTION FICTIVE</span><h2>{row.title}</h2></div><StatusPill tone={row.status === "COMPLETED" ? "good" : row.status === "IN_PROGRESS" ? "warning" : "neutral"}>{status(row.status)}</StatusPill></header><div className="premium-data-list compact"><div><span>Date</span><strong>{row.scheduledAt ? dateTime(row.scheduledAt) : "Non planifiée"}</strong></div><div><span>Adresse</span><strong>{[row.addressLine1,row.addressPostalCode,row.addressCity].filter(Boolean).join(" · ") || "Non renseignée"}</strong></div><div><span>Rapport</span><strong>{report ? status(report.status) : "Aucun"}</strong></div></div></article>
      );})}</section> : <EmptyState title="Aucune intervention" description="Le tenant de démonstration est vide." />}
    </>
  );
}
function status(value: string) { return ({ PLANNED:"Planifiée", CONFIRMED:"Confirmée", IN_PROGRESS:"En cours", COMPLETED:"Terminée", CANCELLED:"Annulée", NEEDS_ATTENTION:"À vérifier", DRAFT:"Brouillon", REVIEWED:"À valider", APPROVED:"Validé", SENT:"Envoyé" } as Record<string,string>)[value] ?? value; }
function dateTime(value: string) { const d = new Date(value); return Number.isNaN(d.getTime()) ? "—" : new Intl.DateTimeFormat("fr-FR", { dateStyle:"medium", timeStyle:"short" }).format(d); }
