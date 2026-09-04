import { EmptyState, PageHeader, StatusPill } from "@/components/sesira/ui";
import { getViewerContext } from "@/lib/auth/viewer";
import { getDocumentsWorkspace } from "@/lib/data/c32-workspaces";

import { archiveDocumentAction, rejectDocumentAction, validateDocumentAction } from "../c32-actions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ result?: string }>;

export default async function DocumentsPage({ searchParams }: { searchParams: SearchParams }) {
  const [viewer, params] = await Promise.all([getViewerContext(), searchParams]);
  if (!viewer) return null;
  const result = await getDocumentsWorkspace(viewer.organization.id);

  if (result.status === "ERROR") {
    return (
      <>
        <PageHeader eyebrow="OPÉRATIONS" title="Documents" description="Classement et validation des documents liés aux dossiers." />
        <section className="app-state-message"><strong>Documents indisponibles</strong><p>La lecture du registre documentaire a échoué. SESIRA ne remplace pas cet état par une liste vide.</p></section>
      </>
    );
  }

  const rows = result.rows;
  return (
    <>
      <PageHeader
        eyebrow="OPÉRATIONS"
        title="Documents"
        description="Un registre de pièces liées aux dossiers, pas un espace de stockage généraliste. La classification automatique reste à valider."
      />
      <ResultNotice result={params.result} />

      <section className="workspace-stat-strip" aria-label="État des documents">
        <div><strong>{rows.filter((row) => row.status === "UPLOADED").length}</strong><span>À classer</span></div>
        <div><strong>{rows.filter((row) => row.status === "CLASSIFIED").length}</strong><span>À vérifier</span></div>
        <div><strong>{rows.filter((row) => row.status === "VALIDATED").length}</strong><span>Validés</span></div>
        <div><strong>{rows.filter((row) => row.extractionConfidence !== null && row.extractionConfidence < 0.5).length}</strong><span>Confiance faible</span></div>
      </section>

      {rows.length ? (
        <section className="workspace-list" aria-label="Documents">
          {rows.map((row) => (
            <article className="workspace-row" key={row.id}>
              <div className="workspace-row-main">
                <div className="workspace-row-heading">
                  <div><span className="eyebrow">{kindLabel(row.kind)}</span><h2>{row.fileName}</h2></div>
                  <StatusPill tone={documentTone(row.status, row.extractionConfidence)}>{documentLabel(row.status)}</StatusPill>
                </div>
                <div className="workspace-meta">
                  <span><b>Lié à</b>{row.entityType ? entityLabel(row.entityType) : "Non rattaché"}</span>
                  <span><b>Taille</b>{formatBytes(row.sizeBytes)}</span>
                  <span><b>Ajouté</b>{formatDateTime(row.uploadedAt)}</span>
                  <span><b>Confiance extraction</b>{row.extractionConfidence === null ? "Non mesurée" : `${Math.round(row.extractionConfidence * 100)} %`}</span>
                </div>

                {row.extractionConfidence !== null && row.extractionConfidence < 0.5 ? (
                  <div className="workspace-gap-box"><strong>Vérification humaine requise</strong><p>La classification a une confiance faible. Le type et les champs extraits doivent être contrôlés avant validation.</p></div>
                ) : null}
              </div>

              <div className="workspace-row-actions">
                {row.status === "CLASSIFIED" ? (
                  <form action={validateDocumentAction}>
                    <input type="hidden" name="documentId" value={row.id} />
                    <button type="submit" className="button primary small">Valider</button>
                  </form>
                ) : null}
                {["UPLOADED", "CLASSIFIED", "VALIDATED"].includes(row.status) ? (
                  <form action={rejectDocumentAction} className="workspace-inline-form compact">
                    <input type="hidden" name="documentId" value={row.id} />
                    <label><span>Motif du rejet</span><input required name="reason" maxLength={500} placeholder="Mauvaise pièce, document expiré…" /></label>
                    <button type="submit" className="button ghost small">Rejeter</button>
                  </form>
                ) : null}
                {row.status === "VALIDATED" ? (
                  <form action={archiveDocumentAction}>
                    <input type="hidden" name="documentId" value={row.id} />
                    <button type="submit" className="secondary-action-link">Archiver</button>
                  </form>
                ) : null}
              </div>
            </article>
          ))}
        </section>
      ) : <EmptyState title="Aucun document" description="Les pièces liées aux clients, devis, interventions et factures apparaîtront ici après leur ajout." />}
    </>
  );
}

function ResultNotice({ result }: { result?: string }) {
  if (!result) return null;
  return result === "saved"
    ? <section className="premium-inline-notice"><StatusPill tone="good">Enregistré</StatusPill><p>La décision a été enregistrée.</p></section>
    : <section className="premium-inline-notice"><StatusPill tone="warning">Non appliqué</StatusPill><p>Le document n’a pas changé d’état.</p></section>;
}

function documentTone(status: string, confidence: number | null): "good" | "warning" | "neutral" {
  if (confidence !== null && confidence < 0.5 && status === "CLASSIFIED") return "warning";
  if (status === "VALIDATED") return "good";
  if (status === "REJECTED") return "warning";
  return "neutral";
}
function documentLabel(status: string) { return ({ UPLOADED: "À classer", CLASSIFIED: "À vérifier", VALIDATED: "Validé", ARCHIVED: "Archivé", REJECTED: "Rejeté" } as Record<string, string>)[status] ?? status; }
function kindLabel(kind: string) { return ({ CONTRACT: "Contrat", INVOICE: "Facture", PROOF_OF_DELIVERY: "Preuve de livraison", REGULATORY: "Réglementaire", PHOTO: "Photo", REPORT: "Rapport", OTHER: "Autre" } as Record<string, string>)[kind] ?? kind; }
function entityLabel(type: string) { return ({ customer: "Client", quote: "Devis", opportunity: "Opportunité", intervention: "Intervention", field_report: "Rapport terrain", invoice: "Facture" } as Record<string, string>)[type] ?? type; }
function formatBytes(value: number | null) { if (value === null) return "Non renseignée"; if (value < 1024) return `${value} o`; if (value < 1024 * 1024) return `${Math.round(value / 1024)} Ko`; return `${Math.round((value / (1024 * 1024)) * 10) / 10} Mo`; }
function formatDateTime(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "Date inconnue" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(date); }
