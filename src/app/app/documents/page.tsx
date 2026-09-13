import Link from "next/link";

import { DocumentUploadForm } from "@/components/documents/document-upload-form";
import { EmptyState, PageHeader, StatusPill } from "@/components/sesira/ui";
import { getViewerContext } from "@/lib/auth/viewer";
import { getDocumentsWorkspace } from "@/lib/data/c32-workspaces";
import { getDocumentLinksForOrganization, type DocumentLinkView } from "@/lib/data/document-links";

import { archiveDocumentAction, rejectDocumentAction, validateDocumentAction } from "../c32-actions";
import {
  confirmDocumentLinkAction,
  reanalyzeDocumentFormAction,
  rejectDocumentLinkAction,
} from "./link-actions";

export const dynamic = "force-dynamic";
type SearchParams = Promise<{ result?: string; entity?: string; entityId?: string }>;

export default async function DocumentsPage({ searchParams }: { searchParams: SearchParams }) {
  const [viewer, params] = await Promise.all([getViewerContext(), searchParams]);
  if (!viewer) return null;

  const [result, linkResult] = await Promise.all([
    getDocumentsWorkspace(viewer.organization.id),
    getDocumentLinksForOrganization(viewer.organization.id),
  ]);

  if (result.status === "ERROR") {
    return <><PageHeader eyebrow="OPÉRATIONS" title="Documents" description="Classement et validation des documents liés aux dossiers." /><section className="app-state-message"><strong>Documents indisponibles</strong><p>La lecture du registre documentaire a échoué. SESIRA ne remplace pas cet état par une liste vide.</p></section></>;
  }

  const linksByDocument = new Map<string, DocumentLinkView[]>();
  for (const link of linkResult.rows) {
    const existing = linksByDocument.get(link.documentId) ?? [];
    existing.push(link);
    linksByDocument.set(link.documentId, existing);
  }

  const filtered = Boolean(params.entity && params.entityId);
  const rows = filtered
    ? result.rows.filter((row) => {
        const links = linksByDocument.get(row.id) ?? [];
        return links.some((link) => link.status === "CONFIRMED" && link.entityType === params.entity && link.entityId === params.entityId)
          || (row.entityType === params.entity && row.entityId === params.entityId);
      })
    : result.rows;

  return (
    <div className="sesira-page--documents">
      <PageHeader
        eyebrow="OPÉRATIONS"
        title="Documents"
        description="SESIRA lit les pièces, extrait les faits utiles et les rattache aux clients et dossiers déjà présents dans la plateforme."
      />
      <ResultNotice result={params.result} />

      {filtered ? (
        <section className="premium-inline-notice">
          <StatusPill>Vue filtrée</StatusPill>
          <p>Documents rattachés à ce dossier.</p>
          <Link href="/app/documents" className="button ghost small">Voir tous les documents</Link>
        </section>
      ) : null}

      <section className="workspace-card" aria-labelledby="document-upload-title">
        <div className="workspace-row-heading">
          <div>
            <span className="eyebrow">AJOUTER UNE PIÈCE</span>
            <h2 id="document-upload-title">Déposer. SESIRA lit et classe.</h2>
          </div>
          <StatusPill>Analyse automatique</StatusPill>
        </div>
        <p className="workspace-card-copy">PDF, JPEG, PNG ou WebP · 15 Mo maximum. Vous n’avez plus à choisir le type : SESIRA reconnaît le document, extrait les références, le client, les dates, les montants ou équipements utiles, puis cherche les dossiers correspondants.</p>
        <DocumentUploadForm />
        <small className="workspace-helper">Une correspondance exacte et unique peut être confirmée automatiquement. Si plusieurs dossiers sont plausibles, SESIRA propose le rattachement et attend votre confirmation au lieu de deviner.</small>
      </section>

      {!filtered && result.rows.length ? (
        <section className="workspace-stat-strip" aria-label="État des documents">
          <div><strong>{result.rows.filter((row) => row.status === "UPLOADED").length}</strong><span>À analyser</span></div>
          <div><strong>{result.rows.filter((row) => row.status === "CLASSIFIED").length}</strong><span>Analysés</span></div>
          <div><strong>{result.rows.filter((row) => row.status === "VALIDATED").length}</strong><span>Validés</span></div>
          <div><strong>{linkResult.rows.filter((link) => link.status === "SUGGESTED").length}</strong><span>Liens à confirmer</span></div>
        </section>
      ) : null}

      {rows.length ? (
        <section className="workspace-list" aria-label="Documents">
          {rows.map((row) => {
            const links = linksByDocument.get(row.id) ?? [];
            const confirmedLinks = links.filter((link) => link.status === "CONFIRMED");
            const suggestedLinks = links.filter((link) => link.status === "SUGGESTED");
            const extraction = extractionView(row.extractedFields);
            return (
              <article className="workspace-row" key={row.id}>
                <div className="workspace-row-main">
                  <div className="workspace-row-heading">
                    <div><span className="eyebrow">{kindLabel(row.kind)}</span><h2>{row.fileName}</h2></div>
                    <StatusPill tone={documentTone(row.status, row.extractionConfidence)}>{documentLabel(row.status)}</StatusPill>
                  </div>

                  <div className="workspace-meta">
                    <span><b>Rattachements</b>{confirmedLinks.length ? `${confirmedLinks.length} confirmé${confirmedLinks.length > 1 ? "s" : ""}` : "Aucun confirmé"}</span>
                    <span><b>Taille</b>{formatBytes(row.sizeBytes)}</span>
                    <span><b>Ajouté</b>{formatDateTime(row.uploadedAt)}</span>
                    <span className="document-confidence"><b>Lecture</b>{row.extractionConfidence === null ? "En attente" : `${Math.round(row.extractionConfidence * 100)} %`}</span>
                  </div>

                  {extraction ? (
                    <div className="workspace-preview">
                      <span>Ce que SESIRA a lu</span>
                      <p>{extraction.summary ?? "Document analysé."}</p>
                      <div className="workspace-meta">
                        {extraction.customer ? <span><b>Client lu</b>{extraction.customer}</span> : null}
                        {extraction.reference ? <span><b>Référence</b>{extraction.reference}</span> : null}
                        {extraction.amount ? <span><b>Montant</b>{extraction.amount}</span> : null}
                        {extraction.date ? <span><b>Date</b>{extraction.date}</span> : null}
                      </div>
                    </div>
                  ) : null}

                  {confirmedLinks.length ? (
                    <div className="workspace-preview">
                      <span>Relié dans SESIRA</span>
                      <div className="document-link-list">
                        {confirmedLinks.map((link) => (
                          <Link key={link.id} href={entityHref(link)} className="button ghost small">
                            {link.isPrimary ? "Principal · " : ""}{link.label ?? entityLabel(link.entityType)}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {suggestedLinks.length ? (
                    <div className="workspace-gap-box">
                      <strong>Rattachement à confirmer</strong>
                      <p>SESIRA a trouvé plusieurs correspondances possibles ou une correspondance qui n’atteint pas le seuil d’auto-confirmation.</p>
                      <div className="document-link-review-list">
                        {suggestedLinks.map((link) => (
                          <div className="document-link-review" key={link.id}>
                            <div>
                              <b>{link.label ?? entityLabel(link.entityType)}</b>
                              <span>{Math.round(link.confidence * 100)} % · {link.reason ?? "Correspondance proposée"}</span>
                            </div>
                            <div className="page-actions">
                              <form action={confirmDocumentLinkAction}>
                                <input type="hidden" name="linkId" value={link.id} />
                                <button type="submit" className="button primary small">Confirmer</button>
                              </form>
                              <form action={rejectDocumentLinkAction}>
                                <input type="hidden" name="linkId" value={link.id} />
                                <button type="submit" className="button ghost small">Ignorer</button>
                              </form>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {row.status === "UPLOADED" ? (
                    <div className="workspace-gap-box">
                      <strong>Lecture automatique non terminée</strong>
                      <p>Le fichier est bien stocké, mais il n’a pas encore été classé. Vous pouvez relancer la lecture sans renvoyer le document.</p>
                      <form action={reanalyzeDocumentFormAction}>
                        <input type="hidden" name="documentId" value={row.id} />
                        <button type="submit" className="button ghost small">Relancer l’analyse</button>
                      </form>
                    </div>
                  ) : null}

                  {row.extractionConfidence !== null && row.extractionConfidence < 0.5 ? <div className="workspace-gap-box"><strong>Vérification humaine requise</strong><p>La lecture est sous 50 % de confiance. Aucun rattachement incertain ne doit être considéré comme fiable sans contrôle.</p></div> : null}
                </div>

                <div className="workspace-row-actions">
                  <Link href={`/app/documents/${row.id}/open`} className="button ghost small" target="_blank" rel="noreferrer">Ouvrir</Link>
                  {row.status === "CLASSIFIED" ? <form action={validateDocumentAction}><input type="hidden" name="documentId" value={row.id} /><button type="submit" className="button primary small">Valider la lecture</button></form> : null}
                  {["UPLOADED", "CLASSIFIED", "VALIDATED"].includes(row.status) ? (
                    <details className="sesira-action-drawer">
                      <summary>Autres actions</summary>
                      <div className="sesira-action-drawer-body">
                        <form action={rejectDocumentAction} className="workspace-inline-form compact">
                          <input type="hidden" name="documentId" value={row.id} />
                          <label><span>Motif du rejet</span><input required name="reason" maxLength={500} placeholder="Mauvaise pièce, document expiré…" /></label>
                          <button type="submit" className="button ghost small">Rejeter le document</button>
                        </form>
                        {row.status === "VALIDATED" ? <form action={archiveDocumentAction}><input type="hidden" name="documentId" value={row.id} /><button type="submit" className="button ghost small">Archiver</button></form> : null}
                      </div>
                    </details>
                  ) : null}
                </div>
              </article>
            );
          })}
        </section>
      ) : <EmptyState title={filtered ? "Aucun document lié" : "Aucun document"} description={filtered ? "Aucun document confirmé n’est encore rattaché à ce dossier." : "Ajoutez une première pièce. SESIRA la lira puis cherchera automatiquement où la rattacher."} />}
    </div>
  );
}

function ResultNotice({ result }: { result?: string }) {
  if (!result) return null;
  const messages: Record<string, { tone: "good" | "warning"; title: string; copy: string }> = {
    saved: { tone: "good", title: "Enregistré", copy: "La décision a été enregistrée." },
    "link-confirmed": { tone: "good", title: "Rattachement confirmé", copy: "Le document est maintenant relié à ce dossier dans SESIRA." },
    "link-rejected": { tone: "good", title: "Suggestion ignorée", copy: "Cette correspondance ne sera pas considérée comme un rattachement confirmé." },
    "link-not-applied": { tone: "warning", title: "Rattachement non modifié", copy: "La suggestion n’a pas pu être modifiée." },
    "analysis-completed": { tone: "good", title: "Analyse terminée", copy: "SESIRA a relu le document et recalculé ses rattachements." },
    "analysis-unavailable": { tone: "warning", title: "Analyse indisponible", copy: "Le document reste stocké. Le moteur de lecture n’est pas configuré ou disponible actuellement." },
    "analysis-failed": { tone: "warning", title: "Analyse non terminée", copy: "La lecture automatique a échoué. Le document n’a pas été supprimé." },
    "not-found": { tone: "warning", title: "Document introuvable", copy: "Ce document n’existe pas ou n’appartient pas à votre organisation." },
    "open-error": { tone: "warning", title: "Ouverture impossible", copy: "Impossible de générer un accès temporaire au fichier." },
  };
  const message = messages[result] ?? { tone: "warning" as const, title: "Non appliqué", copy: "Le document n’a pas changé d’état." };
  return <section className="premium-inline-notice"><StatusPill tone={message.tone}>{message.title}</StatusPill><p>{message.copy}</p></section>;
}

function extractionView(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const data = value as Record<string, unknown>;
  const customerRaw = data.customer && typeof data.customer === "object" && !Array.isArray(data.customer) ? data.customer as Record<string, unknown> : null;
  const refs = data.references && typeof data.references === "object" && !Array.isArray(data.references) ? data.references as Record<string, unknown> : {};
  const financial = data.financial && typeof data.financial === "object" && !Array.isArray(data.financial) ? data.financial as Record<string, unknown> : {};
  const dates = data.dates && typeof data.dates === "object" && !Array.isArray(data.dates) ? data.dates as Record<string, unknown> : {};
  const customer = customerRaw ? firstString(customerRaw.company_name, customerRaw.name, customerRaw.email) : null;
  const reference = firstString(refs.invoice_reference, refs.quote_reference, refs.contract_reference, refs.intervention_reference, refs.field_report_reference, refs.equipment_reference, refs.document_number);
  const amountValue = typeof financial.total_amount === "number" ? financial.total_amount : null;
  const currency = typeof financial.currency === "string" ? financial.currency : null;
  const amount = amountValue !== null && currency ? formatAmount(amountValue, currency) : amountValue !== null ? String(amountValue) : null;
  const date = firstString(dates.document_date, dates.service_date, dates.start_date);
  const summary = typeof data.summary === "string" ? data.summary : null;
  if (!customer && !reference && !amount && !date && !summary) return null;
  return { customer, reference, amount, date, summary };
}

function firstString(...values: unknown[]) {
  const found = values.find((value) => typeof value === "string" && value.trim().length > 0);
  return typeof found === "string" ? found : null;
}

function entityHref(link: DocumentLinkView) {
  const base = ({
    customer: "/app/clients",
    quote: "/app/devis",
    opportunity: "/app/opportunites",
    intervention: "/app/interventions",
    field_report: "/app/rapports",
    invoice: "/app/factures",
    maintenance_contract: "/app/maintenance",
    equipment: "/app/obligations/equipements",
  } as Record<string, string>)[link.entityType] ?? "/app";
  return `${base}?focus=${encodeURIComponent(link.entityId)}`;
}
function documentTone(status: string, confidence: number | null): "good" | "warning" | "neutral" { if (confidence !== null && confidence < 0.5 && status === "CLASSIFIED") return "warning"; if (status === "VALIDATED") return "good"; if (status === "REJECTED") return "warning"; return "neutral"; }
function documentLabel(status: string) { return ({ UPLOADED: "À analyser", CLASSIFIED: "Analysé", VALIDATED: "Validé", ARCHIVED: "Archivé", REJECTED: "Rejeté" } as Record<string, string>)[status] ?? status; }
function kindLabel(kind: string) { return ({ CONTRACT: "Contrat", INVOICE: "Facture", PROOF_OF_DELIVERY: "Preuve de livraison", REGULATORY: "Réglementaire", PHOTO: "Photo", REPORT: "Rapport", OTHER: "Autre" } as Record<string, string>)[kind] ?? kind; }
function entityLabel(type: string) { return ({ customer: "Client", quote: "Devis", opportunity: "Opportunité", intervention: "Intervention", field_report: "Rapport terrain", invoice: "Facture", maintenance_contract: "Contrat de maintenance", equipment: "Équipement" } as Record<string, string>)[type] ?? type; }
function formatBytes(value: number | null) { if (value === null) return "Non renseignée"; if (value < 1024) return `${value} o`; if (value < 1024 * 1024) return `${Math.round(value / 1024)} Ko`; return `${Math.round((value / (1024 * 1024)) * 10) / 10} Mo`; }
function formatDateTime(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "Date inconnue" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(date); }
function formatAmount(amount: number, currency: string) { try { return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(amount); } catch { return `${amount} ${currency}`; } }
