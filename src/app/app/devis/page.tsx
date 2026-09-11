import Link from "next/link";

import { EmptyState, PageHeader, StatusPill } from "@/components/sesira/ui";
import { getViewerContext } from "@/lib/auth/viewer";
import { getQuoteDraftReadiness, getQuoteList } from "@/lib/data";

export const dynamic = "force-dynamic";

const ACTIVE_STATUSES = new Set(["SENT", "FOLLOWING_UP", "REPLIED", "NEEDS_HUMAN"]);

export default async function DevisPage() {
  const viewer = await getViewerContext();
  if (!viewer) return null;

  const organizationId = viewer.organization.id;
  const [quotes, draftReadiness] = await Promise.all([
    getQuoteList(organizationId),
    getQuoteDraftReadiness(organizationId),
  ]);
  const readinessByQuoteId = new Map(draftReadiness.map((item) => [item.quoteId, item] as const));
  const active = quotes.filter((quote) => ACTIVE_STATUSES.has(quote.status)).length;
  const needsHuman = quotes.filter((quote) => quote.status === "NEEDS_HUMAN").length;
  const totalValue = sumKnownAmounts(quotes);

  return (
    <>
      <PageHeader
        eyebrow="VENTES"
        title="Devis"
        description="Retrouvez les devis qui avancent, ceux qui attendent une décision et les prochaines actions à mener."
        actions={<><Link className="button ghost" href="/app/imports">Importer</Link><Link className="button primary" href="/app/clients">Voir les clients</Link></>}
      />

      {quotes.length ? (
        <section className="workspace-stat-strip" aria-label="Résumé des devis">
          <div><strong>{quotes.length}</strong><span>Devis suivis</span></div>
          <div><strong>{active}</strong><span>En cours</span></div>
          <div><strong>{needsHuman}</strong><span>À décider</span></div>
          <div><strong>{totalValue}</strong><span>Valeur connue</span></div>
        </section>
      ) : null}

      {quotes.length ? (
        <section className="workspace-list" aria-label="Devis">
          {quotes.map((quote) => {
            const readiness = quote.status === "DRAFT" ? readinessByQuoteId.get(quote.id) : undefined;
            return (
              <article key={quote.id} className="workspace-row">
                <div className="workspace-row-main">
                  <div className="workspace-row-heading">
                    <div><span className="eyebrow">{quote.reference ?? "DEVIS"}</span><h2>{quote.title}</h2></div>
                    <StatusPill tone={statusTone(quote.status)}>{statusLabel(quote.status)}</StatusPill>
                  </div>
                  <div className="workspace-meta">
                    <span><b>Montant</b>{formatAmount(quote.amount, quote.currency)}</span>
                    <span><b>Prochaine action</b>{quote.nextActionAt ? formatDateTime(quote.nextActionAt) : "Aucune planifiée"}</span>
                    <span><b>Dernière mise à jour</b>{formatDateTime(quote.updatedAt)}</span>
                    <span><b>Envoi</b>{quote.sentAt ? formatDate(quote.sentAt) : "Pas encore envoyé"}</span>
                  </div>
                  {quote.status === "DRAFT" ? <div className="premium-inline-notice"><StatusPill tone={readiness?.sendEligible ? "good" : "warning"}>{draftReadinessLabel(readiness)}</StatusPill><p>{draftReadinessCopy(readiness)}</p></div> : null}
                </div>
                <div className="workspace-row-actions"><div className="workspace-preview"><span>État du dossier</span><p>{quote.status === "DRAFT" ? draftReadinessCopy(readiness) : nextStepCopy(quote.status)}</p></div></div>
              </article>
            );
          })}
        </section>
      ) : (
        <EmptyState title="Aucun devis pour le moment" description="Importez vos données ou ouvrez un client pour commencer à alimenter le suivi commercial." action={<div className="page-actions"><Link className="button ghost" href="/app/imports">Importer des données</Link><Link className="button primary" href="/app/clients">Ouvrir les clients</Link></div>} />
      )}

      {quotes.length ? <section className="premium-trust-note"><span className="eyebrow">GARDE-FOU</span><h2>Le prix reste une décision humaine.</h2><p>SESIRA applique ce contrôle au moment de l’enregistrement. Il peut signaler les informations manquantes et structurer le suivi, mais le prix, les conditions commerciales et l’envoi final restent sous le contrôle de votre équipe.</p></section> : null}
    </>
  );
}

function sumKnownAmounts(quotes: Awaited<ReturnType<typeof getQuoteList>>) {
  const currencies = new Set(quotes.filter((quote) => quote.amount !== null).map((quote) => quote.currency));
  if (!currencies.size) return "—";
  if (currencies.size > 1) return `${currencies.size} devises`;
  const currency = [...currencies][0];
  const amount = quotes.reduce((sum, quote) => sum + (quote.amount ?? 0), 0);
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}
function draftReadinessLabel(readiness: Awaited<ReturnType<typeof getQuoteDraftReadiness>>[number] | undefined) { if (!readiness?.analyzedAt) return "Analyse requise"; if (readiness.gapCount > 0) return `${readiness.gapCount} élément${readiness.gapCount > 1 ? "s" : ""} à compléter`; return readiness.sendEligible ? "Prêt à poursuivre" : "À vérifier"; }
function draftReadinessCopy(readiness: Awaited<ReturnType<typeof getQuoteDraftReadiness>>[number] | undefined) { if (!readiness?.analyzedAt) return "La préparation de ce brouillon doit encore être analysée avant de poursuivre."; if (readiness.gaps.length) { const fields = readiness.gaps.slice(0, 4).map((gap) => gapLabel(gap.field)).join(", "); return `À compléter : ${fields}${readiness.gaps.length > 4 ? "…" : ""}.`; } return "Les informations requises connues sont présentes. Les autres contrôles d’envoi restent applicables."; }
function nextStepCopy(status: string) { const copy: Record<string, string> = { SENT: "Le devis a été envoyé. Surveillez la prochaine échéance ou la réponse du client.", FOLLOWING_UP: "Une relance est en cours. La prochaine action connue reste visible dans le dossier.", REPLIED: "Une réponse client a été enregistrée et peut demander une décision commerciale.", NEEDS_HUMAN: "Une décision humaine est attendue avant la suite du traitement.", WON: "Le devis est gagné. La suite opérationnelle peut être préparée.", LOST: "Le devis est perdu. Aucune action automatique n’est engagée.", EXPIRED: "Le devis a expiré. Vérifiez le dossier avant toute nouvelle proposition." }; return copy[status] ?? "Consultez le dossier pour connaître la prochaine action."; }
function gapLabel(field: string) { const labels: Record<string, string> = { amount: "prix", currency: "devise", customer_display_name: "nom client", recipient_email: "email destinataire", customer_confirmation: "confirmation du contact", technical_diagnosis: "diagnostic technique", regulatory_documents: "documents réglementaires", delivery_terms: "conditions de livraison", warranty_terms: "garantie", other: "autre information" }; return labels[field] ?? field; }
function statusTone(status: string): "good" | "warning" | "neutral" { if (status === "WON" || status === "REPLIED") return "good"; if (status === "NEEDS_HUMAN" || status === "FOLLOWING_UP") return "warning"; return "neutral"; }
function statusLabel(status: string) { return ({ DRAFT: "Brouillon", SENT: "Envoyé", FOLLOWING_UP: "Relance en cours", REPLIED: "Réponse reçue", NEEDS_HUMAN: "À décider", WON: "Gagné", LOST: "Perdu", EXPIRED: "Expiré" } as Record<string, string>)[status] ?? status; }
function formatAmount(amount: number | null, currency: string) { return amount === null ? "Non renseigné" : new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(amount); }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "Date inconnue" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(date); }
function formatDateTime(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "Date inconnue" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(date); }
