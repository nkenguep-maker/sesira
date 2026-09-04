import { EmptyState, PageHeader, StatusPill } from "@/components/sesira/ui";
import { getViewerContext } from "@/lib/auth/viewer";
import { getContentWorkspace, getPublicationsWorkspace } from "@/lib/data/c32-workspaces";

import { approveContentAction, submitContentForReviewAction } from "../../c32-actions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ result?: string }>;

export default async function ContentPage({ searchParams }: { searchParams: SearchParams }) {
  const [viewer, params] = await Promise.all([getViewerContext(), searchParams]);
  if (!viewer) return null;

  const [contentResult, publicationsResult] = await Promise.all([
    getContentWorkspace(viewer.organization.id),
    getPublicationsWorkspace(viewer.organization.id),
  ]);

  if (contentResult.status === "ERROR" || publicationsResult.status === "ERROR") {
    return (
      <>
        <PageHeader eyebrow="CROISSANCE" title="Contenus" description="Brouillons, relecture, approbation et publications." />
        <section className="app-state-message"><strong>Contenus indisponibles</strong><p>SESIRA ne peut pas lire l’ensemble du workflow de contenu. Aucun état de publication n’est déduit.</p></section>
      </>
    );
  }

  const contents = contentResult.rows;
  const publications = publicationsResult.rows;
  const titleById = new Map(contents.map((content) => [content.id, content.title] as const));

  return (
    <>
      <PageHeader
        eyebrow="CROISSANCE"
        title="Contenus"
        description="L’IA peut préparer un brouillon. La relecture, l’approbation et toute publication externe restent sous contrôle humain."
      />
      <ResultNotice result={params.result} />

      <section className="workspace-stat-strip" aria-label="État des contenus">
        <div><strong>{contents.filter((row) => row.status === "DRAFT").length}</strong><span>Brouillons</span></div>
        <div><strong>{contents.filter((row) => row.status === "REVIEW").length}</strong><span>À relire</span></div>
        <div><strong>{contents.filter((row) => row.status === "APPROVED").length}</strong><span>Approuvés</span></div>
        <div><strong>{publications.filter((row) => row.status === "SCHEDULED").length}</strong><span>Publications prévues</span></div>
      </section>

      <section className="workspace-boundary-note">
        <StatusPill tone="warning">Publication provider requise</StatusPill>
        <p>Cette interface ne possède aucun bouton qui transforme un contenu en « publié ». Une publication n’est crédible que si le provider externe a réussi et qu’une référence externe est enregistrée.</p>
      </section>

      <section className="workspace-section">
        <div className="workspace-section-heading"><div><span className="eyebrow">CONTENU</span><h2>Production et validation</h2></div><span>{contents.length} éléments</span></div>
        {contents.length ? (
          <div className="workspace-list">
            {contents.map((content) => (
              <article className="workspace-row" key={content.id}>
                <div className="workspace-row-main">
                  <div className="workspace-row-heading"><div><span className="eyebrow">{kindLabel(content.kind)}{content.language ? ` · ${content.language.toUpperCase()}` : ""}</span><h2>{content.title}</h2></div><StatusPill tone={content.status === "APPROVED" ? "good" : "neutral"}>{contentLabel(content.status)}</StatusPill></div>
                  <div className="workspace-meta">
                    <span><b>Dernière mise à jour</b>{formatDateTime(content.updatedAt)}</span>
                    <span><b>Approbation</b>{content.approvedAt ? formatDateTime(content.approvedAt) : "Non"}</span>
                    <span><b>Publication enregistrée</b>{content.publishedAt ? formatDateTime(content.publishedAt) : "Non"}</span>
                    <span><b>Origine</b>{provenanceLabel(content.provenance)}</span>
                  </div>
                  {content.bodyDraft ? <div className="workspace-preview"><span>Aperçu</span><p>{truncate(content.bodyDraft, 360)}</p></div> : null}
                </div>
                <div className="workspace-row-actions">
                  {content.status === "DRAFT" ? (
                    <form action={submitContentForReviewAction}><input type="hidden" name="contentId" value={content.id} /><button type="submit" className="button primary small">Envoyer en relecture</button></form>
                  ) : null}
                  {content.status === "REVIEW" ? (
                    <form action={approveContentAction}><input type="hidden" name="contentId" value={content.id} /><button type="submit" className="button primary small">Approuver</button></form>
                  ) : null}
                  {content.status === "APPROVED" ? <p className="workspace-action-note">Contenu approuvé. La publication doit passer par l’intégration provider avant tout état « publié ».</p> : null}
                </div>
              </article>
            ))}
          </div>
        ) : <EmptyState title="Aucun contenu" description="Les brouillons et contenus à valider apparaîtront ici." />}
      </section>

      <section className="workspace-section">
        <div className="workspace-section-heading"><div><span className="eyebrow">PUBLICATIONS</span><h2>État provider</h2></div><span>{publications.length} événements</span></div>
        {publications.length ? (
          <div className="workspace-list compact-list">
            {publications.map((publication) => {
              const providerProof = publication.status === "PUBLISHED" && Boolean(publication.externalRef);
              return (
                <article className="workspace-row" key={publication.id}>
                  <div className="workspace-row-main">
                    <div className="workspace-row-heading"><div><span className="eyebrow">{channelLabel(publication.channel)}</span><h2>{titleById.get(publication.contentPieceId) ?? "Contenu lié"}</h2></div><StatusPill tone={providerProof ? "good" : publication.status === "PUBLISHED" ? "warning" : "neutral"}>{publicationLabel(publication.status, providerProof)}</StatusPill></div>
                    <div className="workspace-meta">
                      <span><b>Prévue</b>{publication.scheduledFor ? formatDateTime(publication.scheduledFor) : "Sans horaire"}</span>
                      <span><b>Publication enregistrée</b>{publication.publishedAt ? formatDateTime(publication.publishedAt) : "Non"}</span>
                      <span><b>Référence externe</b>{publication.externalRef ?? "Absente"}</span>
                      <span><b>Preuve exploitable</b>{providerProof ? "Oui" : "Non"}</span>
                    </div>
                    {publication.status === "PUBLISHED" && !providerProof ? <div className="workspace-gap-box"><strong>État incohérent</strong><p>Un statut « publié » sans référence externe n’est pas présenté comme une publication confirmée.</p></div> : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : <EmptyState title="Aucune publication" description="Les publications planifiées et confirmées par un provider apparaîtront ici." />}
      </section>
    </>
  );
}

function ResultNotice({ result }: { result?: string }) { if (!result) return null; return result === "saved" ? <section className="premium-inline-notice"><StatusPill tone="good">Enregistré</StatusPill><p>Le changement a été confirmé.</p></section> : <section className="premium-inline-notice"><StatusPill tone="warning">Non appliqué</StatusPill><p>Le contenu n’a pas changé d’état.</p></section>; }
function contentLabel(status: string) { return ({ DRAFT: "Brouillon", REVIEW: "À relire", APPROVED: "Approuvé", PUBLISHED: "Publication enregistrée", ARCHIVED: "Archivé" } as Record<string, string>)[status] ?? status; }
function publicationLabel(status: string, proof: boolean) { if (status === "PUBLISHED") return proof ? "Confirmée" : "À vérifier"; return ({ SCHEDULED: "Planifiée", CANCELLED: "Annulée" } as Record<string, string>)[status] ?? status; }
function kindLabel(kind: string) { return ({ ARTICLE: "Article", SOCIAL_POST: "Post social", VIDEO: "Vidéo", EMAIL_TEMPLATE: "Email", ADS_COPY: "Publicité", CASE_STUDY: "Cas client", OTHER: "Autre" } as Record<string, string>)[kind] ?? kind; }
function channelLabel(channel: string) { return ({ PAID_SEARCH: "Recherche payante", ORGANIC: "Organique", REFERRAL: "Recommandation", EMAIL: "Email", EVENT: "Événement", WORD_OF_MOUTH: "Bouche à oreille", CONTENT: "Contenu", OTHER: "Autre" } as Record<string, string>)[channel] ?? channel; }
function provenanceLabel(value: unknown) { if (!value || typeof value !== "object") return "Non renseignée"; const record = value as Record<string, unknown>; const source = record.source ?? record.origin ?? record.generated_by; return source ? String(source) : "Traçabilité enregistrée"; }
function truncate(value: string, max: number) { return value.length <= max ? value : `${value.slice(0, max - 1)}…`; }
function formatDateTime(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "Date inconnue" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(date); }
