import Link from "next/link";

import { EmptyState, PageHeader, StatusPill } from "@/components/sesira/ui";
import { getViewerContext } from "@/lib/auth/viewer";
import { getCustomerList } from "@/lib/data";
import { getInterventionsWorkspace } from "@/lib/data/c32-workspaces";

import { completeInterventionAction, scheduleInterventionAction } from "../c32-actions";

export const dynamic = "force-dynamic";
type SearchParams = Promise<{ result?: string }>;

export default async function InterventionsPage({ searchParams }: { searchParams: SearchParams }) {
  const [viewer, params] = await Promise.all([getViewerContext(), searchParams]);
  if (!viewer) return null;

  const [result, customers] = await Promise.all([
    getInterventionsWorkspace(viewer.organization.id),
    getCustomerList(viewer.organization.id, { limit: 500 }),
  ]);
  const customerNames = new Map(customers.map((customer) => [customer.id, customer.displayName] as const));

  if (result.status === "ERROR") {
    return <><PageHeader eyebrow="TERRAIN" title="Interventions" description="Planning, exécution et reprises terrain." /><UnavailableState /></>;
  }

  const rows = result.rows;
  const toSchedule = rows.filter((row) => row.status === "PLANNED" && !row.scheduledAt).length;
  const scheduled = rows.filter((row) => ["PLANNED", "CONFIRMED"].includes(row.status) && row.scheduledAt).length;
  const inProgress = rows.filter((row) => row.status === "IN_PROGRESS").length;
  const blocked = rows.filter((row) => row.status === "NEEDS_ATTENTION").length;

  return (
    <>
      <PageHeader
        eyebrow="TERRAIN"
        title="Interventions"
        description="Voyez ce qui doit être planifié, ce qui se passe aujourd’hui et ce qui demande une reprise."
        actions={<Link className="button ghost" href="/app/rapports">Rapports terrain</Link>}
      />

      <ResultNotice result={params.result} />

      {rows.length ? (
        <section className="workspace-stat-strip" aria-label="État des interventions">
          <div><strong>{toSchedule}</strong><span>À planifier</span></div>
          <div><strong>{scheduled}</strong><span>Planifiées</span></div>
          <div><strong>{inProgress}</strong><span>En cours</span></div>
          <div><strong>{blocked}</strong><span>À reprendre</span></div>
        </section>
      ) : null}

      {rows.length ? (
        <section className="workspace-list" aria-label="Interventions">
          {rows.map((row) => {
            const actionable = row.status === "PLANNED" || ["CONFIRMED", "IN_PROGRESS"].includes(row.status);
            return (
              <article className="workspace-row" key={row.id}>
                <div className="workspace-row-main">
                  <div className="workspace-row-heading">
                    <div>
                      <span className="eyebrow">{customerNames.get(row.customerId) ?? "Client"}</span>
                      <h2>{row.title}</h2>
                    </div>
                    <StatusPill tone={interventionTone(row.status)}>{interventionLabel(row.status)}</StatusPill>
                  </div>

                  <div className="workspace-meta">
                    <span><b>Quand</b>{row.scheduledAt ? formatDateTime(row.scheduledAt) : "À planifier"}</span>
                    <span><b>Durée</b>{row.durationMinutes ? `${row.durationMinutes} min` : "Non renseignée"}</span>
                    <span><b>Lieu</b>{formatAddress(row)}</span>
                    <span><b>Assignation</b>{row.assignedUserId ? "Technicien assigné" : "Non assignée"}</span>
                  </div>
                  {row.description ? <p className="workspace-description">{row.description}</p> : null}
                </div>

                <div className="workspace-row-actions">
                  <div className="workspace-preview"><span>Prochaine étape</span><p>{nextStepCopy(row.status, Boolean(row.scheduledAt), Boolean(row.assignedUserId))}</p></div>
                  {actionable ? (
                    <details className="sesira-action-drawer">
                      <summary>{row.status === "PLANNED" ? "Planifier l’intervention" : "Mettre à jour"}</summary>
                      <div className="sesira-action-drawer-body">
                        {row.status === "PLANNED" ? <form action={scheduleInterventionAction} className="workspace-inline-form"><input type="hidden" name="interventionId" value={row.id} /><label><span>Date et heure</span><input required name="scheduledAt" type="datetime-local" /></label><label><span>Durée</span><input name="durationMinutes" type="number" min="5" max="1440" step="5" placeholder="60" /></label><button className="button primary small" type="submit">Enregistrer le planning</button></form> : null}
                        {["CONFIRMED", "IN_PROGRESS"].includes(row.status) ? <form action={completeInterventionAction} className="workspace-inline-form compact"><input type="hidden" name="interventionId" value={row.id} /><label><span>Note de fin facultative</span><input name="notes" maxLength={4000} placeholder="Travail réalisé" /></label><button className="button primary small" type="submit">Marquer terminée</button></form> : null}
                      </div>
                    </details>
                  ) : null}
                  {row.status === "NEEDS_ATTENTION" ? <p className="workspace-action-note">Cette intervention demande un arbitrage humain avant de repartir.</p> : null}
                </div>
              </article>
            );
          })}
        </section>
      ) : <EmptyState title="Aucune intervention" description="Les chantiers et visites apparaîtront ici lorsqu’ils seront créés depuis vos dossiers clients." action={<Link className="button primary" href="/app/clients">Voir les clients</Link>} />}
    </>
  );
}

function nextStepCopy(status: string, scheduled: boolean, assigned: boolean) { if (status === "PLANNED" && !scheduled) return "Choisissez une date, une heure et une durée."; if (status === "PLANNED" && !assigned) return "Le créneau existe mais aucun technicien n’est assigné."; if (status === "CONFIRMED") return "L’intervention est planifiée et peut être exécutée sur le terrain."; if (status === "IN_PROGRESS") return "L’intervention est en cours. Clôturez-la quand le travail terrain est terminé."; if (status === "NEEDS_ATTENTION") return "Un point bloque la suite et doit être arbitré par l’équipe."; if (status === "COMPLETED") return "Intervention terminée."; return "Aucune action immédiate."; }
function ResultNotice({ result }: { result?: string }) { if (!result) return null; return result === "saved" ? <section className="premium-inline-notice"><StatusPill tone="good">Enregistré</StatusPill><p>La modification a été enregistrée.</p></section> : <section className="premium-inline-notice"><StatusPill tone="warning">Non appliqué</StatusPill><p>L’état n’a pas été modifié. Vérifiez les données ou l’état actuel du dossier.</p></section>; }
function UnavailableState() { return <section className="app-state-message"><strong>Interventions indisponibles</strong><p>SESIRA ne peut pas lire ce module pour le moment.</p></section>; }
function interventionTone(status: string): "good" | "warning" | "neutral" { if (status === "COMPLETED") return "good"; if (status === "NEEDS_ATTENTION") return "warning"; return "neutral"; }
function interventionLabel(status: string) { return ({ PLANNED: "À planifier", CONFIRMED: "Planifiée", IN_PROGRESS: "En cours", COMPLETED: "Terminée", CANCELLED: "Annulée", NEEDS_ATTENTION: "À reprendre" } as Record<string, string>)[status] ?? status; }
function formatAddress(row: { addressLine1: string | null; addressPostalCode: string | null; addressCity: string | null }) { return [row.addressLine1, row.addressPostalCode, row.addressCity].filter(Boolean).join(" · ") || "Non renseigné"; }
function formatDateTime(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "Date inconnue" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(date); }
