import { EmptyState, PageHeader, StatusPill } from "@/components/sesira/ui";
import { getViewerContext } from "@/lib/auth/viewer";
import { getFieldReportsWorkspace, getInterventionsWorkspace } from "@/lib/data/c32-workspaces";
import { getFieldReportDeliveryEvidence } from "@/lib/data/field-report-delivery";

import { transitionFieldReportAction } from "../c32-actions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ result?: string }>;

export default async function ReportsPage({ searchParams }: { searchParams: SearchParams }) {
  const [viewer, params] = await Promise.all([getViewerContext(), searchParams]);
  if (!viewer) return null;

  const [reportsResult, interventionsResult, deliveryResult] = await Promise.all([
    getFieldReportsWorkspace(viewer.organization.id),
    getInterventionsWorkspace(viewer.organization.id),
    getFieldReportDeliveryEvidence(viewer.organization.id),
  ]);

  if (reportsResult.status === "ERROR" || deliveryResult.status === "ERROR") {
    return (
      <>
        <PageHeader eyebrow="OPÉRATIONS" title="Rapports terrain" description="Relecture, validation et préparation des comptes rendus d’intervention." />
        <section className="app-state-message"><strong>Rapports indisponibles</strong><p>SESIRA ne peut pas lire le rapport et sa preuve de livraison de manière fiable. Aucun état de remplacement n’est inventé.</p></section>
      </>
    );
  }

  const interventionNames = new Map(
    interventionsResult.status === "OK"
      ? interventionsResult.rows.map((row) => [row.id, row.title] as const)
      : [],
  );
  const deliveryByReport = new Map(deliveryResult.rows.map((row) => [row.reportId, row] as const));
  const rows = reportsResult.rows;

  return (
    <>
      <PageHeader eyebrow="OPÉRATIONS" title="Rapports terrain" description="Un rapport peut être structuré par SESIRA, mais les observations, le diagnostic et la validation restent humains." />
      <ResultNotice result={params.result} />

      <section className="workspace-stat-strip" aria-label="État des rapports">
        <div><strong>{rows.filter((row) => row.status === "DRAFT").length}</strong><span>Brouillons</span></div>
        <div><strong>{rows.filter((row) => row.status === "REVIEWED").length}</strong><span>Relus</span></div>
        <div><strong>{rows.filter((row) => row.status === "APPROVED").length}</strong><span>Approuvés</span></div>
        <div><strong>{rows.filter((row) => row.reportGaps.length > 0).length}</strong><span>Informations manquantes</span></div>
      </section>

      <section className="workspace-boundary-note">
        <StatusPill tone="warning">Preuve de livraison provider</StatusPill>
        <p>Cette page ne déclenche aucun envoi. Un rapport en statut SENT n’est présenté comme livré que si le Core a enregistré le provider et sa référence externe après une livraison confirmée.</p>
      </section>

      {rows.length ? (
        <section className="workspace-list" aria-label="Rapports terrain">
          {rows.map((row) => {
            const hasGaps = row.reportGaps.length > 0;
            const delivery = deliveryByReport.get(row.id);
            const providerProof = row.status === "SENT" && Boolean(delivery?.provider && delivery?.externalRef);

            return (
              <article className="workspace-row" key={row.id}>
                <div className="workspace-row-main">
                  <div className="workspace-row-heading">
                    <div>
                      <span className="eyebrow">{interventionNames.get(row.interventionId) ?? "Intervention"}</span>
                      <h2>{row.summary ? truncate(row.summary, 88) : "Compte rendu à compléter"}</h2>
                    </div>
                    <StatusPill tone={reportTone(row.status, hasGaps, providerProof)}>{reportLabel(row.status, hasGaps, providerProof)}</StatusPill>
                  </div>

                  <div className="workspace-meta">
                    <span><b>Informations manquantes</b>{hasGaps ? String(row.reportGaps.length) : "Aucune signalée"}</span>
                    <span><b>Pièces jointes</b>{String(row.attachments.length)}</span>
                    <span><b>Relu</b>{row.reviewedAt ? formatDateTime(row.reviewedAt) : "Non"}</span>
                    <span><b>Approuvé</b>{row.approvedAt ? formatDateTime(row.approvedAt) : "Non"}</span>
                  </div>

                  {row.customerFacingSummary ? <div className="workspace-preview"><span>Résumé client</span><p>{row.customerFacingSummary}</p></div> : null}
                  {hasGaps ? <div className="workspace-gap-box"><strong>À compléter avant relecture</strong><p>{gapSummary(row.reportGaps)}</p></div> : null}
                  {row.status === "SENT" && providerProof ? (
                    <div className="workspace-preview"><span>Livraison confirmée</span><p>{row.sentAt ? formatDateTime(row.sentAt) : "Date inconnue"} · provider {delivery?.provider} · référence {delivery?.externalRef}</p></div>
                  ) : null}
                  {row.status === "SENT" && !providerProof ? (
                    <div className="workspace-gap-box"><strong>État de livraison incohérent</strong><p>Le rapport est marqué SENT mais la preuve provider attendue est absente. SESIRA ne présente pas cet état comme une livraison confirmée.</p></div>
                  ) : null}
                </div>

                <div className="workspace-row-actions">
                  {row.status === "DRAFT" && !hasGaps ? (
                    <form action={transitionFieldReportAction}>
                      <input type="hidden" name="reportId" value={row.id} />
                      <input type="hidden" name="nextStatus" value="REVIEWED" />
                      <button type="submit" className="button primary small">Marquer relu</button>
                    </form>
                  ) : null}
                  {row.status === "REVIEWED" ? (
                    <form action={transitionFieldReportAction}>
                      <input type="hidden" name="reportId" value={row.id} />
                      <input type="hidden" name="nextStatus" value="APPROVED" />
                      <button type="submit" className="button primary small">Approuver</button>
                    </form>
                  ) : null}
                  {row.status === "APPROVED" ? <p className="workspace-action-note">Prêt pour un envoi via un provider connecté. Aucun envoi n’est déclenché depuis cette page.</p> : null}
                </div>
              </article>
            );
          })}
        </section>
      ) : <EmptyState title="Aucun rapport terrain" description="Les comptes rendus apparaîtront ici lorsqu’une intervention disposera d’un rapport." />}
    </>
  );
}

function ResultNotice({ result }: { result?: string }) {
  if (!result) return null;
  return result === "saved"
    ? <section className="premium-inline-notice"><StatusPill tone="good">Enregistré</StatusPill><p>La transition a été confirmée.</p></section>
    : <section className="premium-inline-notice"><StatusPill tone="warning">Non appliqué</StatusPill><p>Le rapport n’a pas changé d’état. Vérifiez son état actuel et les informations manquantes.</p></section>;
}

function reportTone(status: string, hasGaps: boolean, providerProof: boolean): "good" | "warning" | "neutral" {
  if (hasGaps) return "warning";
  if (status === "SENT") return providerProof ? "good" : "warning";
  if (status === "APPROVED") return "good";
  return "neutral";
}

function reportLabel(status: string, hasGaps: boolean, providerProof: boolean) {
  if (hasGaps && status === "DRAFT") return "À compléter";
  if (status === "SENT") return providerProof ? "Livré" : "À vérifier";
  return ({ DRAFT: "Brouillon", REVIEWED: "Relu", APPROVED: "Approuvé", ARCHIVED: "Archivé" } as Record<string, string>)[status] ?? status;
}

function gapSummary(gaps: unknown[]) {
  return gaps.slice(0, 4).map((gap) => {
    if (typeof gap === "string") return gap;
    if (gap && typeof gap === "object" && "reason" in gap) return String((gap as { reason?: unknown }).reason ?? "Information manquante");
    return "Information manquante";
  }).join(" · ");
}

function truncate(value: string, max: number) { return value.length <= max ? value : `${value.slice(0, max - 1)}…`; }
function formatDateTime(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "Date inconnue" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(date); }
