import { EmptyState, PageHeader, StatusPill } from "@/components/sesira/ui";
import { getViewerContext } from "@/lib/auth/viewer";
import { getConversationsWorkspace, getGrowthCampaignsWorkspace, getLeadsWorkspace } from "@/lib/data/c32-workspaces";

export const dynamic = "force-dynamic";

export default async function ConversationsPage() {
  const viewer = await getViewerContext();
  if (!viewer) return null;

  const [conversationsResult, campaignsResult, leadsResult] = await Promise.all([
    getConversationsWorkspace(viewer.organization.id),
    getGrowthCampaignsWorkspace(viewer.organization.id),
    getLeadsWorkspace(viewer.organization.id),
  ]);

  if (conversationsResult.status === "ERROR") {
    return (
      <>
        <PageHeader eyebrow="CROISSANCE" title="Conversations" description="Discussions entrantes avant opportunité." />
        <section className="app-state-message"><strong>Conversations indisponibles</strong><p>SESIRA ne peut pas lire les fils entrants pour le moment.</p></section>
      </>
    );
  }

  const rows = conversationsResult.rows;
  const campaigns = new Map(campaignsResult.status === "OK" ? campaignsResult.rows.map((row) => [row.id, row.name] as const) : []);
  const leads = new Map(leadsResult.status === "OK" ? leadsResult.rows.map((row) => [row.id, row.contactName] as const) : []);

  return (
    <>
      <PageHeader
        eyebrow="CROISSANCE"
        title="Conversations"
        description="Les fils entrants restent reliés à leur source. Les corps de messages vivent chez le provider ; SESIRA ne prétend pas les posséder ici."
      />

      <section className="workspace-stat-strip" aria-label="État des conversations">
        <div><strong>{rows.filter((row) => row.status === "OPEN").length}</strong><span>Ouvertes</span></div>
        <div><strong>{rows.filter((row) => row.status === "PENDING_REPLY").length}</strong><span>Réponse attendue</span></div>
        <div><strong>{rows.filter((row) => row.status === "REPLIED").length}</strong><span>Réponses enregistrées</span></div>
        <div><strong>{rows.filter((row) => row.assignedUserId === null && !["CLOSED", "ARCHIVED"].includes(row.status)).length}</strong><span>Non assignées</span></div>
      </section>

      <section className="workspace-boundary-note">
        <StatusPill>Trace de workflow</StatusPill>
        <p>Cette vue n’envoie aucun message. REPLIED signifie qu’un membre a enregistré une réponse après l’action externe ; C31 ne conserve pas de reçu provider pour le message individuel, donc cet état n’est pas présenté comme une preuve de livraison.</p>
      </section>

      {rows.length ? (
        <section className="workspace-list" aria-label="Conversations Growth">
          {rows.map((row) => (
            <article className="workspace-row" key={row.id}>
              <div className="workspace-row-main">
                <div className="workspace-row-heading">
                  <div><span className="eyebrow">{channelLabel(row.channel)}</span><h2>{row.subject ?? leads.get(row.leadId ?? "") ?? "Conversation sans objet"}</h2></div>
                  <StatusPill tone={row.status === "PENDING_REPLY" ? "warning" : row.status === "REPLIED" ? "good" : "neutral"}>{conversationLabel(row.status)}</StatusPill>
                </div>
                <div className="workspace-meta">
                  <span><b>Lead</b>{row.leadId ? leads.get(row.leadId) ?? "Lead lié" : "Aucun"}</span>
                  <span><b>Campagne</b>{row.campaignId ? campaigns.get(row.campaignId) ?? "Campagne liée" : "Aucune"}</span>
                  <span><b>Dernier entrant</b>{row.lastInboundAt ? formatDateTime(row.lastInboundAt) : "Non renseigné"}</span>
                  <span><b>Dernier sortant enregistré</b>{row.lastOutboundAt ? formatDateTime(row.lastOutboundAt) : "Non renseigné"}</span>
                </div>
                <div className="workspace-meta single-line">
                  <span><b>Assignation</b>{row.assignedUserId ? "Attribuée" : "Non assignée"}</span>
                  <span><b>Référence du fil provider</b>{row.externalThreadRef ?? "Absente"}</span>
                </div>
                {row.status === "PENDING_REPLY" ? <div className="workspace-gap-box"><strong>Action humaine</strong><p>Une réponse est attendue. Ouvrez le provider ou le canal connecté pour répondre ; SESIRA ne simule pas l’envoi depuis cette vue.</p></div> : null}
              </div>
            </article>
          ))}
        </section>
      ) : <EmptyState title="Aucune conversation" description="Les fils entrants liés à vos campagnes et leads apparaîtront ici." />}
    </>
  );
}

function conversationLabel(status: string) { return ({ OPEN: "Ouverte", PENDING_REPLY: "À répondre", REPLIED: "Réponse enregistrée", CLOSED: "Fermée", ARCHIVED: "Archivée" } as Record<string, string>)[status] ?? status; }
function channelLabel(channel: string) { return ({ EMAIL: "Email", CHAT: "Chat", SOCIAL: "Social", PHONE: "Téléphone", SMS: "SMS", WEBHOOK: "Webhook", OTHER: "Autre" } as Record<string, string>)[channel] ?? channel; }
function formatDateTime(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "Date inconnue" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(date); }
