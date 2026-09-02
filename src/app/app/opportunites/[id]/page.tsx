import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader, StatusPill } from "@/components/sesira/ui";
import { getViewerContext } from "@/lib/auth/viewer";
import { getCustomerList, getOpportunityDetail, getOpportunityOperationalState, getSoldNotScheduledPolicy } from "@/lib/data";
import { OPPORTUNITY_STATES, canTransitionOpportunity, isOpportunityState, isTerminalOpportunityState } from "@/lib/opportunities/schema";

import { setOperationalNextStepAction, transitionOpportunityAction } from "../actions";

export const dynamic = "force-dynamic";
type PageProps = { params: Promise<{ id: string }> };

export default async function OpportunityDetailPage({ params }: PageProps) {
  const [viewer, route] = await Promise.all([getViewerContext(), params]);
  if (!viewer) return null;
  const organizationId = viewer.organization.id;
  const [opportunity, customers, operational, valuePolicy] = await Promise.all([
    getOpportunityDetail(organizationId, route.id),
    getCustomerList(organizationId, { limit: 500 }),
    getOpportunityOperationalState(organizationId, route.id),
    getSoldNotScheduledPolicy(organizationId),
  ]);
  if (!opportunity) notFound();

  const customerName = customers.find((customer) => customer.id === opportunity.customerId)?.displayName ?? "Client non disponible";
  const currentState = isOpportunityState(opportunity.commercialState) ? opportunity.commercialState : null;
  const allowedTransitions = currentState ? OPPORTUNITY_STATES.filter((state) => canTransitionOpportunity(currentState, state)) : [];
  const terminal = currentState ? isTerminalOpportunityState(currentState) : false;

  return (
    <>
      <PageHeader eyebrow="04 · OPPORTUNITÉ" title={customerName} description="Variantes, révisions, options et décisions autorisées pour ce dossier commercial." actions={<Link href="/app/opportunites" className="button ghost small">Retour aux opportunités</Link>} />
      <section className="premium-connection-summary"><div><strong>{stateLabel(opportunity.commercialState)}</strong><span>État commercial</span></div><div><strong>{formatAmount(opportunity.estimatedValue, opportunity.currency)}</strong><span>Valeur estimée</span></div><div><strong>{opportunity.variants.length}</strong><span>Variantes</span></div><div><strong>{opportunity.options.length}</strong><span>Options</span></div></section>

      <section className="panel">
        <div className="panel-head"><div><span className="eyebrow">DÉCISION</span><h2>Transitions autorisées</h2></div><StatusPill tone={terminal ? "neutral" : currentState === "ACTIVE" ? "warning" : "good"}>{stateLabel(opportunity.commercialState)}</StatusPill></div>
        {!currentState ? <p className="panel-copy">L’état actuel n’appartient pas au vocabulaire C18. Aucune transition n’est proposée.</p> : terminal ? <p className="panel-copy">Ce dossier est dans un état terminal. Le Core n’autorise plus aucune transition depuis cet état.</p> : allowedTransitions.length ? <div className="premium-focus-actions">{allowedTransitions.map((target) => <form action={transitionOpportunityAction} key={target}><input type="hidden" name="opportunityId" value={opportunity.id} /><input type="hidden" name="newState" value={target} /><button type="submit" className="button ghost small">{transitionActionLabel(target)}</button></form>)}</div> : <p className="panel-copy">Aucune transition supplémentaire n’est autorisée.</p>}
        <p className="premium-muted-copy">La base reste autoritaire. Une action devenue illégale entre l’affichage et le clic sera refusée côté serveur.</p>
      </section>

      {currentState === "WON" ? (
        <section className="panel">
          <div className="panel-head"><div><span className="eyebrow">PROCHAIN PAS OPÉRATIONNEL</span><h2>{operational?.nextStepAt ? "Un prochain pas est enregistré." : "Cette vente doit être reprise opérationnellement."}</h2></div><StatusPill tone={operational?.nextStepAt ? "good" : valuePolicy.enabled ? "warning" : "neutral"}>{operational?.nextStepAt ? "Planifiée" : valuePolicy.enabled ? "Sous politique" : "Non planifiée"}</StatusPill></div>
          {operational?.nextStepAt ? (
            <>
              <div className="premium-data-list"><div><span>Date</span><strong>{formatDate(operational.nextStepAt)}</strong></div><div><span>Type</span><strong>{operational.nextStepKind ?? "Non précisé"}</strong></div><div><span>Source</span><strong>{operational.nextStepSource ?? "Inconnue"}</strong></div></div>
              <form action={setOperationalNextStepAction}><input type="hidden" name="opportunityId" value={opportunity.id} /><input type="hidden" name="clear" value="1" /><button className="button ghost small" type="submit">Retirer ce prochain pas</button></form>
            </>
          ) : (
            <form action={setOperationalNextStepAction} className="settings-stack">
              <input type="hidden" name="opportunityId" value={opportunity.id} />
              <label className="panel"><span className="eyebrow">DATE CIBLE</span><input type="date" name="nextStepDate" required /></label>
              <label className="panel"><span className="eyebrow">TYPE DE PROCHAIN PAS</span><select name="nextStepKind" defaultValue="Intervention à planifier"><option>Intervention à planifier</option><option>Rendez vous client</option><option>Préparation administrative</option><option>Autre action opérationnelle</option></select></label>
              <button type="submit" className="button primary">Enregistrer le prochain pas</button>
            </form>
          )}
          <p className="premium-muted-copy">{valuePolicy.enabled ? `Politique active : Attention après ${valuePolicy.graceHours ?? "délai non disponible"} h sans prochain pas.` : "La politique vendu mais non planifié n’est pas active pour cette organisation."} <Link href="/app/parametres/politiques">Voir la règle</Link></p>
        </section>
      ) : null}

      <section className="premium-results-section"><div className="premium-section-heading"><div><span className="eyebrow">VARIANTES</span><h2>Versions commerciales du dossier.</h2></div></div>{opportunity.variants.length ? <div className="premium-connection-grid">{opportunity.variants.map((variant) => <article key={variant.variantKey} className="premium-connection-card"><header><div><span className="eyebrow">VARIANTE</span><h2>{variant.variantKey}</h2></div><StatusPill>{variant.revisions.length} révision{variant.revisions.length > 1 ? "s" : ""}</StatusPill></header><div className="premium-data-list compact">{variant.revisions.map((revision) => <div key={revision.quoteId}><span>Révision {revision.revision}{revision.isCurrent ? " · courante" : ""}</span><strong>{formatRevision(revision.amount, opportunity.currency, revision.status)}</strong></div>)}</div></article>)}</div> : <p className="premium-muted-copy">Aucune variante de devis n’est enregistrée pour cette opportunité.</p>}</section>

      <section className="premium-results-section"><div className="premium-section-heading"><div><span className="eyebrow">OPTIONS</span><h2>Choix rattachés aux devis.</h2></div></div>{opportunity.options.length ? <div className="premium-connection-grid">{opportunity.options.map((option) => <article key={option.id} className="premium-connection-card"><header><div><span className="eyebrow">{option.optionKey}</span><h2>{option.name}</h2></div><StatusPill tone={option.status === "INCLUDED" ? "good" : option.status === "REJECTED" ? "warning" : "neutral"}>{optionStatusLabel(option.status)}</StatusPill></header><div className="premium-data-list compact"><div><span>Montant</span><strong>{formatAmount(option.amount, option.currency)}</strong></div><div><span>Ordre</span><strong>{option.ordinal}</strong></div><div><span>Devis</span><strong>{shortId(option.quoteId)}</strong></div></div></article>)}</div> : <p className="premium-muted-copy">Aucune option n’est enregistrée pour les devis de cette opportunité.</p>}</section>
    </>
  );
}

function stateLabel(state: string) { const labels: Record<string, string> = { NEW: "Nouvelle", QUALIFYING: "Qualification", ACTIVE: "Active", WON: "Gagnée", LOST: "Perdue", CANCELLED: "Annulée" }; return labels[state] ?? state; }
function transitionActionLabel(state: string) { const labels: Record<string, string> = { QUALIFYING: "Passer en qualification", ACTIVE: "Activer", WON: "Marquer gagnée", LOST: "Marquer perdue", CANCELLED: "Annuler" }; return labels[state] ?? stateLabel(state); }
function optionStatusLabel(status: string) { const labels: Record<string, string> = { PROPOSED: "Proposée", INCLUDED: "Incluse", EXCLUDED: "Exclue", REJECTED: "Rejetée" }; return labels[status] ?? status; }
function formatAmount(amount: number | null, currency: string) { if (amount === null) return "Non renseigné"; return new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount); }
function formatRevision(amount: number | null, currency: string, status: string) { return `${formatAmount(amount, currency)} · ${status}`; }
function shortId(value: string) { return value.length > 12 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value; }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "Date inconnue" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(date); }
