import { EmptyState, PageHeader, StatusPill } from "@/components/sesira/ui";
import { getViewerContext } from "@/lib/auth/viewer";
import {
  getAttentionInbox,
  getAutomationReadiness,
  getOpenIncidents,
  getPendingApprovals,
} from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function SuiviPage() {
  const viewer = await getViewerContext();
  if (!viewer) return null;

  const organizationId = viewer.organization.id;
  const [attention, approvals, incidents, automation] = await Promise.all([
    getAttentionInbox(organizationId, { limit: 50 }),
    getPendingApprovals(organizationId, { limit: 30 }),
    getOpenIncidents(organizationId, { limit: 30 }),
    getAutomationReadiness(organizationId),
  ]);

  const totalToReview = attention.length + approvals.length + incidents.length;

  return (
    <>
      <PageHeader
        eyebrow="04 · EXÉCUTION"
        title="Suivi"
        description="Ce qui demande réellement une action humaine, une validation ou une vérification dans votre organisation."
      />

      <section className="premium-connection-summary">
        <div><strong>{totalToReview}</strong><span>Éléments à regarder</span></div>
        <div><strong>{attention.length}</strong><span>Attentions ouvertes</span></div>
        <div><strong>{approvals.length}</strong><span>Validations en attente</span></div>
        <div><strong>{incidents.length}</strong><span>Incidents ouverts</span></div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div><span className="eyebrow">RÈGLES</span><h2>État de l’automatisation</h2></div>
          <StatusPill tone={automation.actionableCount > 0 ? "good" : automation.observationOnlyCount > 0 ? "warning" : "neutral"}>
            {automation.actionableCount > 0 ? `${automation.actionableCount} actionnable${automation.actionableCount > 1 ? "s" : ""}` : automation.observationOnlyCount > 0 ? "Observation" : "Non configuré"}
          </StatusPill>
        </div>
        <p className="panel-copy">SESIRA n’affiche ici que les éléments enregistrés par le Core. Une absence de donnée n’est pas transformée en tâche fictive.</p>
      </section>

      <section className="premium-results-section">
        <div className="premium-section-heading"><div><span className="eyebrow">ATTENTION</span><h2>Ce qui mérite votre regard.</h2></div></div>
        {attention.length ? (
          <div className="premium-connection-grid">
            {attention.map((item) => (
              <article key={item.id} className="premium-connection-card">
                <header>
                  <div><span className="eyebrow">{item.category}</span><h2>{item.title}</h2></div>
                  <StatusPill tone={priorityTone(item.priority)}>{priorityLabel(item.priority)}</StatusPill>
                </header>
                <p>{item.explanation ?? "Cette situation demande votre vérification avant de poursuivre."}</p>
                <div className="premium-data-list compact">
                  <div><span>Raison</span><strong>{item.reason}</strong></div>
                  <div><span>Action suggérée</span><strong>{item.suggestedAction ?? "À décider"}</strong></div>
                  <div><span>Créé</span><strong>{formatDateTime(item.createdAt)}</strong></div>
                </div>
              </article>
            ))}
          </div>
        ) : <EmptyState title="Aucune attention ouverte" description="Aucun élément ouvert n’est actuellement remonté par le Core." />}
      </section>

      <section className="premium-results-section">
        <div className="premium-section-heading"><div><span className="eyebrow">VALIDATION</span><h2>Rien ne part sans votre décision.</h2></div></div>
        {approvals.length ? (
          <div className="premium-connection-grid">
            {approvals.map((approval) => (
              <article key={approval.runId} className="premium-connection-card">
                <header>
                  <div><span className="eyebrow">RELANCE · ÉTAPE {approval.step}</span><h2>{approval.subject}</h2></div>
                  <StatusPill tone="warning">À valider</StatusPill>
                </header>
                <p>{approval.bodyPreview}</p>
                <div className="premium-data-list compact">
                  <div><span>Destinataire</span><strong>{approval.recipientEmail}</strong></div>
                  <div><span>Prévu</span><strong>{approval.scheduledFor ? formatDateTime(approval.scheduledFor) : "Non planifié"}</strong></div>
                  <div><span>Modèle</span><strong>{approval.templateKey}</strong></div>
                </div>
                <p className="premium-muted-copy">La décision d’envoi n’est pas simulée dans cet écran tant que le contrôle opérateur n’est pas câblé à l’action serveur.</p>
              </article>
            ))}
          </div>
        ) : <EmptyState title="Aucune validation en attente" description="Aucune relance n’attend actuellement votre feu vert." />}
      </section>

      <section className="premium-results-section">
        <div className="premium-section-heading"><div><span className="eyebrow">INCIDENTS</span><h2>Les anomalies encore ouvertes.</h2></div></div>
        {incidents.length ? (
          <div className="premium-connection-grid">
            {incidents.map((incident) => (
              <article key={incident.id} className="premium-connection-card">
                <header>
                  <div><span className="eyebrow">{incident.category}</span><h2>{incident.title}</h2></div>
                  <StatusPill tone={incident.severity === "P1" || incident.severity === "P2" ? "warning" : "neutral"}>{incident.severity}</StatusPill>
                </header>
                <p>{incident.description ?? "Aucun détail supplémentaire enregistré."}</p>
                <div className="premium-data-list compact">
                  <div><span>État</span><strong>{incident.status}</strong></div>
                  <div><span>Récurrence</span><strong>{incident.recurrenceCount}</strong></div>
                  <div><span>Dernière occurrence</span><strong>{incident.lastSeenAt ? formatDateTime(incident.lastSeenAt) : "Date inconnue"}</strong></div>
                </div>
              </article>
            ))}
          </div>
        ) : <EmptyState title="Aucun incident ouvert" description="Aucune anomalie ouverte ou en investigation n’est enregistrée." />}
      </section>
    </>
  );
}

function priorityTone(priority: string): "good" | "warning" | "neutral" {
  if (priority === "URGENT" || priority === "HIGH") return "warning";
  return "neutral";
}

function priorityLabel(priority: string) {
  const labels: Record<string, string> = { URGENT: "Urgent", HIGH: "Haute", NORMAL: "Normale", LOW: "Basse" };
  return labels[priority] ?? priority;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date inconnue" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
