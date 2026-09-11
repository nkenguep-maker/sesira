import Link from "next/link";

import { EmptyState, PageHeader, StatusPill } from "@/components/sesira/ui";
import { getViewerContext } from "@/lib/auth/viewer";
import { getAttentionInbox, getAutomationReadiness, getOpenIncidents, getPendingApprovals } from "@/lib/data";

import { approveFollowupAction, rejectFollowupAction } from "./actions";

export const dynamic = "force-dynamic";
type SearchParams = Promise<{ approval?: string }>;

export default async function SuiviPage({ searchParams }: { searchParams: SearchParams }) {
  const [viewer, params] = await Promise.all([getViewerContext(), searchParams]);
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
        eyebrow="AUJOURD’HUI"
        title="File de décisions"
        description="Tout ce qui attend une décision, une validation ou une vérification humaine."
        actions={<Link className="button ghost" href="/app/automatisations">Voir les automatisations</Link>}
      />
      <ApprovalNotice status={params.approval} />

      {totalToReview ? (
        <section className="workspace-stat-strip" aria-label="Résumé des décisions">
          <div><strong>{totalToReview}</strong><span>À regarder</span></div>
          <div><strong>{attention.length}</strong><span>Attentions</span></div>
          <div><strong>{approvals.length}</strong><span>Validations</span></div>
          <div><strong>{incidents.length}</strong><span>Problèmes</span></div>
        </section>
      ) : null}

      <section className="premium-inline-notice">
        <StatusPill tone={automation.actionableCount > 0 ? "good" : automation.observationOnlyCount > 0 ? "warning" : "neutral"}>
          {automation.actionableCount > 0 ? `${automation.actionableCount} règle${automation.actionableCount > 1 ? "s" : ""} active${automation.actionableCount > 1 ? "s" : ""}` : automation.observationOnlyCount > 0 ? "Observation" : "Non configuré"}
        </StatusPill>
        <p>SESIRA sépare les faits à regarder des actions qui exigent explicitement votre validation.</p>
      </section>

      <section className="premium-results-section">
        <div className="premium-section-heading"><div><span className="eyebrow">PRIORITÉS</span><h2>À examiner</h2></div></div>
        {attention.length ? <div className="premium-connection-grid">{attention.map((item) => (
          <article key={item.id} className="premium-connection-card"><header><div><span className="eyebrow">{item.category}</span><h2>{item.title}</h2></div><StatusPill tone={priorityTone(item.priority)}>{priorityLabel(item.priority)}</StatusPill></header><p>{item.explanation ?? "Cette situation demande votre vérification avant de poursuivre."}</p><div className="premium-data-list compact"><div><span>Raison</span><strong>{reasonLabel(item.reason)}</strong></div><div><span>Action suggérée</span><strong>{item.suggestedAction ?? "À décider"}</strong></div><div><span>Créé</span><strong>{formatDateTime(item.createdAt)}</strong></div></div>{item.entityType === "opportunity" && item.entityId ? <Link className="button ghost small" href={`/app/opportunites/${item.entityId}`}>Ouvrir le dossier</Link> : null}</article>
        ))}</div> : <EmptyState title="Rien à examiner" description="Aucun élément arrivé à échéance ne demande votre attention." />}
      </section>

      <section className="premium-results-section">
        <div className="premium-section-heading"><div><span className="eyebrow">VALIDATIONS</span><h2>En attente de votre accord</h2></div></div>
        {approvals.length ? <div className="premium-connection-grid">{approvals.map((approval) => (
          <article key={approval.runId} className="premium-connection-card"><header><div><span className="eyebrow">RELANCE · ÉTAPE {approval.step}</span><h2>{approval.subject}</h2></div><StatusPill tone="warning">À valider</StatusPill></header><p>{approval.bodyPreview}</p><div className="premium-data-list compact"><div><span>Destinataire</span><strong>{approval.recipientEmail}</strong></div><div><span>Prévu</span><strong>{approval.scheduledFor ? formatDateTime(approval.scheduledFor) : "Non planifié"}</strong></div><div><span>Modèle</span><strong>{approval.templateKey}</strong></div></div><details className="sesira-action-drawer"><summary>Prendre une décision</summary><div className="sesira-action-drawer-body"><form action={approveFollowupAction} className="workspace-inline-form compact"><input type="hidden" name="runId" value={approval.runId} /><label><span>Note facultative</span><input name="comment" maxLength={1000} placeholder="Contexte de votre décision" /></label><button className="button primary small" type="submit">Valider et envoyer</button></form><form action={rejectFollowupAction} className="workspace-inline-form compact"><input type="hidden" name="runId" value={approval.runId} /><label><span>Motif facultatif</span><input name="comment" maxLength={1000} placeholder="Pourquoi ne pas envoyer" /></label><button className="button ghost small" type="submit">Refuser</button></form></div></details><p className="premium-muted-copy">L’envoi n’est tenté qu’après votre validation et seulement si la connexion de production est réellement disponible.</p></article>
        ))}</div> : <EmptyState title="Aucune validation" description="Aucune action n’attend actuellement votre feu vert." />}
      </section>

      <section className="premium-results-section">
        <div className="premium-section-heading"><div><span className="eyebrow">SYSTÈME</span><h2>Problèmes encore ouverts</h2></div></div>
        {incidents.length ? <div className="premium-connection-grid">{incidents.map((incident) => (
          <article key={incident.id} className="premium-connection-card"><header><div><span className="eyebrow">{incident.category}</span><h2>{incident.title}</h2></div><StatusPill tone={incident.severity === "P1" || incident.severity === "P2" ? "warning" : "neutral"}>{incident.severity}</StatusPill></header><p>{incident.description ?? "Aucun détail supplémentaire enregistré."}</p><div className="premium-data-list compact"><div><span>État</span><strong>{incident.status}</strong></div><div><span>Récurrence</span><strong>{incident.recurrenceCount}</strong></div><div><span>Dernière occurrence</span><strong>{incident.lastSeenAt ? formatDateTime(incident.lastSeenAt) : "Date inconnue"}</strong></div></div></article>
        ))}</div> : <EmptyState title="Aucun problème ouvert" description="Aucune anomalie ouverte ou en investigation n’est enregistrée." />}
      </section>
    </>
  );
}

function ApprovalNotice({ status }: { status?: string }) { if (!status) return null; const states: Record<string, { tone: "good" | "warning"; title: string; copy: string }> = { sent: { tone: "good", title: "Envoyé", copy: "Votre validation a été enregistrée et l’envoi a été confirmé par le service d’envoi." }, rejected: { tone: "good", title: "Refus enregistré", copy: "La relance a été annulée sans envoi externe." }, "send-unavailable": { tone: "warning", title: "Envoi indisponible", copy: "La validation n’a pas été enregistrée : la connexion d’envoi production n’est pas disponible." }, "send-failed": { tone: "warning", title: "Envoi non confirmé", copy: "La validation a été enregistrée mais l’envoi n’a pas été confirmé. Consultez l’état technique avant une nouvelle action." }, stale: { tone: "warning", title: "Déjà traité", copy: "Cette validation n’était plus en attente au moment de votre décision." }, invalid: { tone: "warning", title: "Action invalide", copy: "La validation demandée ne peut pas être identifiée." }, error: { tone: "warning", title: "Action non appliquée", copy: "SESIRA n’a pas pu confirmer cette décision." } }; const state = states[status]; if (!state) return null; return <section className="premium-inline-notice"><StatusPill tone={state.tone}>{state.title}</StatusPill><p>{state.copy}</p></section>; }
function priorityTone(priority: string): "good" | "warning" | "neutral" { return priority === "URGENT" || priority === "HIGH" ? "warning" : "neutral"; }
function priorityLabel(priority: string) { const labels: Record<string, string> = { URGENT: "Urgent", HIGH: "Haute", NORMAL: "Normale", LOW: "Basse" }; return labels[priority] ?? priority; }
function reasonLabel(reason: string) { return ({ SOLD_NOT_SCHEDULED: "Vendu mais non planifié", SPEED_TO_LEAD_OVERDUE: "Prise en charge en retard", FOLLOWUP_DUE: "Relance arrivée à échéance" } as Record<string, string>)[reason] ?? "Situation à vérifier"; }
function formatDateTime(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "Date inconnue" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(date); }
