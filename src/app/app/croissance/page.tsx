import { EmptyState, PageHeader, StatusPill } from "@/components/sesira/ui";
import { getViewerContext } from "@/lib/auth/viewer";
import { getGrowthCampaignsWorkspace, getLeadsWorkspace } from "@/lib/data/c32-workspaces";

import { disqualifyLeadAction, qualifyLeadAction } from "../c32-actions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ result?: string }>;

export default async function GrowthPage({ searchParams }: { searchParams: SearchParams }) {
  const [viewer, params] = await Promise.all([getViewerContext(), searchParams]);
  if (!viewer) return null;

  const [campaignsResult, leadsResult] = await Promise.all([
    getGrowthCampaignsWorkspace(viewer.organization.id),
    getLeadsWorkspace(viewer.organization.id),
  ]);

  if (campaignsResult.status === "ERROR" || leadsResult.status === "ERROR") {
    return (
      <>
        <PageHeader eyebrow="CROISSANCE" title="Vue croissance" description="Campagnes et leads avant leur entrée dans le pipeline commercial." />
        <section className="app-state-message"><strong>Croissance indisponible</strong><p>Une partie des données Growth n’est pas lisible. SESIRA ne calcule aucun taux à partir d’un jeu incomplet.</p></section>
      </>
    );
  }

  const campaigns = campaignsResult.rows;
  const leads = leadsResult.rows;
  const campaignNames = new Map(campaigns.map((row) => [row.id, row.name] as const));

  return (
    <>
      <PageHeader
        eyebrow="CROISSANCE"
        title="Vue croissance"
        description="Orchestrez campagnes et leads sans transformer des signaux marketing en certitudes commerciales."
      />
      <ResultNotice result={params.result} />

      <section className="workspace-stat-strip" aria-label="État de la croissance">
        <div><strong>{campaigns.filter((row) => row.status === "ACTIVE").length}</strong><span>Campagnes actives</span></div>
        <div><strong>{leads.filter((row) => row.status === "NEW").length}</strong><span>Nouveaux leads</span></div>
        <div><strong>{leads.filter((row) => row.status === "QUALIFIED").length}</strong><span>Qualifiés par l’équipe</span></div>
        <div><strong>{leads.filter((row) => row.status === "CONVERTED").length}</strong><span>Convertis</span></div>
      </section>

      <section className="workspace-boundary-note">
        <StatusPill>Contrôle humain</StatusPill>
        <p>SESIRA peut organiser et suggérer. Il ne qualifie, ne disqualifie et ne convertit jamais un lead automatiquement.</p>
      </section>

      <section className="workspace-section">
        <div className="workspace-section-heading"><div><span className="eyebrow">LEADS</span><h2>À décider</h2></div><span>{leads.length} total</span></div>
        {leads.length ? (
          <div className="workspace-list">
            {leads.map((lead) => (
              <article className="workspace-row" key={lead.id}>
                <div className="workspace-row-main">
                  <div className="workspace-row-heading">
                    <div><span className="eyebrow">{sourceLabel(lead.source)}</span><h2>{lead.contactName}</h2></div>
                    <StatusPill tone={leadTone(lead.status)}>{leadLabel(lead.status)}</StatusPill>
                  </div>
                  <div className="workspace-meta">
                    <span><b>Contact</b>{lead.contactEmail ?? lead.contactPhone ?? "Non renseigné"}</span>
                    <span><b>Campagne</b>{lead.sourceCampaignId ? campaignNames.get(lead.sourceCampaignId) ?? "Campagne liée" : "Aucune"}</span>
                    <span><b>Entré</b>{formatDate(lead.createdAt)}</span>
                    <span><b>Opportunité</b>{lead.convertedOpportunityId ? "Créée" : "Non créée"}</span>
                  </div>
                </div>

                {lead.status === "NEW" ? (
                  <div className="workspace-row-actions two-actions">
                    <form action={qualifyLeadAction} className="workspace-inline-form compact">
                      <input type="hidden" name="leadId" value={lead.id} />
                      <label><span>Note facultative</span><input name="notes" maxLength={4000} placeholder="Pourquoi ce lead est pertinent" /></label>
                      <button type="submit" className="button primary small">Qualifier</button>
                    </form>
                    <form action={disqualifyLeadAction} className="workspace-inline-form compact">
                      <input type="hidden" name="leadId" value={lead.id} />
                      <label><span>Motif requis</span><input required name="reason" maxLength={500} placeholder="Doublon, hors cible…" /></label>
                      <button type="submit" className="button ghost small">Disqualifier</button>
                    </form>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : <EmptyState title="Aucun lead" description="Les leads entrants apparaîtront ici avant leur qualification commerciale." />}
      </section>

      <section className="workspace-section">
        <div className="workspace-section-heading"><div><span className="eyebrow">CAMPAGNES</span><h2>Contexte d’acquisition</h2></div><span>{campaigns.length} total</span></div>
        {campaigns.length ? (
          <div className="workspace-list compact-list">
            {campaigns.map((campaign) => (
              <article className="workspace-row" key={campaign.id}>
                <div className="workspace-row-main">
                  <div className="workspace-row-heading"><div><span className="eyebrow">{channelLabel(campaign.channel)}</span><h2>{campaign.name}</h2></div><StatusPill tone={campaign.status === "ACTIVE" ? "good" : "neutral"}>{campaignLabel(campaign.status)}</StatusPill></div>
                  <div className="workspace-meta">
                    <span><b>Début</b>{campaign.startAt ? formatDate(campaign.startAt) : "Non démarrée"}</span>
                    <span><b>Fin prévue</b>{campaign.endAt ? formatDate(campaign.endAt) : "Non renseignée"}</span>
                    <span><b>Budget indicatif</b>{campaign.budget === null ? "Non renseigné" : formatAmount(campaign.budget, campaign.currency)}</span>
                    <span><b>Référence externe</b>{campaign.externalRef ?? "Aucune"}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : <EmptyState title="Aucune campagne" description="Les campagnes apparaîtront ici lorsqu’elles seront créées ou synchronisées." />}
      </section>
    </>
  );
}

function ResultNotice({ result }: { result?: string }) { if (!result) return null; return result === "saved" ? <section className="premium-inline-notice"><StatusPill tone="good">Enregistré</StatusPill><p>La décision humaine a été enregistrée.</p></section> : <section className="premium-inline-notice"><StatusPill tone="warning">Non appliqué</StatusPill><p>Le lead n’a pas changé d’état.</p></section>; }
function leadTone(status: string): "good" | "warning" | "neutral" { if (["QUALIFIED", "CONVERTED"].includes(status)) return "good"; if (status === "DISQUALIFIED") return "warning"; return "neutral"; }
function leadLabel(status: string) { return ({ NEW: "Nouveau", QUALIFIED: "Qualifié", CONVERTED: "Converti", DISQUALIFIED: "Disqualifié", ARCHIVED: "Archivé" } as Record<string, string>)[status] ?? status; }
function campaignLabel(status: string) { return ({ DRAFT: "Brouillon", ACTIVE: "Active", PAUSED: "En pause", ENDED: "Terminée", CANCELLED: "Annulée" } as Record<string, string>)[status] ?? status; }
function sourceLabel(source: string) { return ({ FORM: "Formulaire", EMAIL: "Email", PHONE: "Téléphone", CHAT: "Chat", REFERRAL: "Recommandation", EVENT: "Événement", WALK_IN: "Entrant", IMPORT: "Import", OTHER: "Autre" } as Record<string, string>)[source] ?? source; }
function channelLabel(channel: string) { return ({ PAID_SEARCH: "Recherche payante", ORGANIC: "Organique", REFERRAL: "Recommandation", EMAIL: "Email", EVENT: "Événement", WORD_OF_MOUTH: "Bouche à oreille", CONTENT: "Contenu", OTHER: "Autre" } as Record<string, string>)[channel] ?? channel; }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "Date inconnue" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(date); }
function formatAmount(amount: number, currency: string) { return new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount); }
