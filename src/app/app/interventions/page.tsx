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
    return (
      <>
        <PageHeader eyebrow="OPÉRATIONS" title="Interventions" description="Planification et exécution des interventions reliées aux dossiers clients." />
        <UnavailableState />
      </>
    );
  }

  const rows = result.rows;
  const toSchedule = rows.filter((row) => row.status === "PLANNED" && !row.scheduledAt).length;
  const scheduled = rows.filter((row) => ["PLANNED", "CONFIRMED"].includes(row.status) && row.scheduledAt).length;
  const inProgress = rows.filter((row) => row.status === "IN_PROGRESS").length;
  const blocked = rows.filter((row) => row.status === "NEEDS_ATTENTION").length;
  const showStats = new Set([toSchedule, scheduled, inProgress, blocked]).size > 1;

  return (
    <>
      <PageHeader
        eyebrow="OPÉRATIONS"
        title="Interventions"
        description="Ce qui doit être planifié, exécuté ou repris."
      />

      <ResultNotice result={params.result} />

      {showStats ? (
        <section className="workspace-stat-strip" aria-label="État des interventions">
          <div><strong>{toSchedule}</strong><span>À planifier</span></div>
          <div><strong>{scheduled}</strong><span>Planifiées</span></div>
          <div><strong>{inProgress}</strong><span>En cours</span></div>
          <div><strong>{blocked}</strong><span>À reprendre</span></div>
        </section>
      ) : null}

      {rows.length ? (
        <section className="workspace-list" aria-label="Interventions">
          {rows.map((row) => (
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
                {row.status === "PLANNED" ? (
                  <form action={scheduleInterventionAction} className="workspace-inline-form">
                    <input type="hidden" name="interventionId" value={row.id} />
                    <label><span>Date et heure</span><input required name="scheduledAt" type="datetime-local" /></label>
                    <label><span>Durée</span><input name="durationMinutes" type="number" min="5" max="1440" step="5" placeholder="60" /></label>
                    <button className="button primary small" type="submit">Planifier</button>
                  </form>
                ) : null}
                {["CONFIRMED", "IN_PROGRESS"].includes(row.status) ? (
                  <form action={completeInterventionAction} className="workspace-inline-form compact">
                    <input type="hidden" name="interventionId" value={row.id} />
                    <label><span>Note de fin facultative</span><input name="notes" maxLength={4000} placeholder="Travail réalisé" /></label>
                    <button className="button ghost small" type="submit">Marquer terminée</button>
                  </form>
                ) : null}
                {row.status === "NEEDS_ATTENTION" ? <p className="workspace-action-note">Cette intervention demande un arbitrage humain avant de repartir.</p> : null}
              </div>
            </article>
          ))}
        </section>
      ) : (
        <EmptyState title="Aucune intervention" description="Les interventions apparaîtront ici lorsqu’un chantier ou une visite sera créé depuis un dossier client." />
      )}
    </>
  );
}

function ResultNotice({ result }: { result?: string }) {
  if (!result) return null;
  return result === "saved"
    ? <section className="premium-inline-notice"><StatusPill tone="good">Enregistré</StatusPill><p>La modification a été enregistrée.</p></section>
    : <section className="premium-inline-notice"><StatusPill tone="warning">Non appliqué</StatusPill><p>L’état n’a pas été modifié. Vérifiez les données ou l’état actuel du dossier.</p></section>;
}

function UnavailableState() {
  return <section className="app-state-message"><strong>Interventions indisponibles</strong><p>SESIRA ne peut pas lire ce module pour le moment.</p></section>;
}

function interventionTone(status: string): "good" | "warning" | "neutral" {
  if (status === "COMPLETED") return "good";
  if (status === "NEEDS_ATTENTION") return "warning";
  return "neutral";
}

function interventionLabel(status: string) {
  return ({
    PLANNED: "À planifier",
    CONFIRMED: "Planifiée",
    IN_PROGRESS: "En cours",
    COMPLETED: "Terminée",
    CANCELLED: "Annulée",
    NEEDS_ATTENTION: "À reprendre",
  } as Record<string, string>)[status] ?? status;
}

function formatAddress(row: { addressLine1: string | null; addressPostalCode: string | null; addressCity: string | null }) {
  return [row.addressLine1, row.addressPostalCode, row.addressCity].filter(Boolean).join(" · ") || "Non renseigné";
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date inconnue" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
