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
  const won = quotes.filter((quote) => quote.status === "WON").length;
  const showSummary = new Set([quotes.length, active, needsHuman, won]).size > 1;

  return (
    <>
      <PageHeader
        eyebrow="REVENU"
        title="Devis"
        description="État des devis, préparation et prochaine échéance connue."
      />

      {showSummary ? (
        <section className="premium-connection-summary">
          <div><strong>{quotes.length}</strong><span>Total</span></div>
          <div><strong>{active}</strong><span>En suivi</span></div>
          <div><strong>{needsHuman}</strong><span>À décider</span></div>
          <div><strong>{won}</strong><span>Gagnés</span></div>
        </section>
      ) : null}

      {quotes.length ? (
        <section className="premium-connection-grid">
          {quotes.map((quote) => {
            const readiness = quote.status === "DRAFT" ? readinessByQuoteId.get(quote.id) : undefined;
            return (
              <article key={quote.id} className="premium-connection-card">
                <header>
                  <div>
                    <span className="eyebrow">{quote.reference ?? "DEVIS"}</span>
                    <h2>{quote.title}</h2>
                  </div>
                  <StatusPill tone={statusTone(quote.status)}>{statusLabel(quote.status)}</StatusPill>
                </header>
                <div className="premium-data-list compact">
                  <div><span>Montant</span><strong>{formatAmount(quote.amount, quote.currency)}</strong></div>
                  {quote.status === "DRAFT" ? (
                    <div><span>Préparation</span><strong>{draftReadinessLabel(readiness)}</strong></div>
                  ) : null}
                  <div><span>Envoyé</span><strong>{quote.sentAt ? formatDate(quote.sentAt) : "Pas encore envoyé"}</strong></div>
                  <div><span>Prochaine action</span><strong>{quote.nextActionAt ? formatDateTime(quote.nextActionAt) : "Aucune planifiée"}</strong></div>
                  <div><span>Dernière mise à jour</span><strong>{formatDateTime(quote.updatedAt)}</strong></div>
                </div>
                {quote.status === "DRAFT" ? (
                  <div className="premium-inline-notice">
                    <StatusPill tone={readiness?.sendEligible ? "good" : "warning"}>
                      {readiness?.sendEligible ? "Prêt à poursuivre" : "Action humaine"}
                    </StatusPill>
                    <p>{draftReadinessCopy(readiness)}</p>
                  </div>
                ) : null}
              </article>
            );
          })}
        </section>
      ) : (
        <EmptyState
          title="Aucun devis disponible"
          description="Les devis apparaîtront ici dès qu’ils seront créés, importés ou synchronisés."
        />
      )}

      <section className="premium-trust-note">
        <span className="eyebrow">RÈGLE DE PRÉPARATION</span>
        <h2>Le prix reste une décision humaine.</h2>
        <p>Un brouillon ne peut pas passer à « Envoyé » tant que son analyse de préparation n’est pas enregistrée ou qu’une information requise manque encore. SESIRA applique ce contrôle au moment de l’enregistrement.</p>
      </section>
    </>
  );
}

function draftReadinessLabel(readiness: Awaited<ReturnType<typeof getQuoteDraftReadiness>>[number] | undefined) {
  if (!readiness?.analyzedAt) return "Analyse requise";
  if (readiness.gapCount > 0) return `${readiness.gapCount} élément${readiness.gapCount > 1 ? "s" : ""} à compléter`;
  return readiness.sendEligible ? "Prêt à envoyer" : "À vérifier";
}

function draftReadinessCopy(readiness: Awaited<ReturnType<typeof getQuoteDraftReadiness>>[number] | undefined) {
  if (!readiness?.analyzedAt) return "L’analyse de préparation n’a pas encore été enregistrée. Ce brouillon ne peut pas passer à « Envoyé ».";
  if (readiness.gaps.length) {
    const fields = readiness.gaps.slice(0, 4).map((gap) => gapLabel(gap.field)).join(", ");
    return `À compléter avant envoi : ${fields}${readiness.gaps.length > 4 ? "…" : ""}.`;
  }
  return "L’analyse enregistrée ne contient plus d’information manquante. Les autres contrôles d’envoi restent applicables.";
}

function gapLabel(field: string) {
  const labels: Record<string, string> = {
    amount: "prix",
    currency: "devise",
    customer_display_name: "nom client",
    recipient_email: "email destinataire",
    customer_confirmation: "confirmation du contact",
    technical_diagnosis: "diagnostic technique",
    regulatory_documents: "documents réglementaires",
    delivery_terms: "conditions de livraison",
    warranty_terms: "garantie",
    other: "autre information",
  };
  return labels[field] ?? field;
}

function statusTone(status: string): "good" | "warning" | "neutral" {
  if (status === "WON" || status === "REPLIED") return "good";
  if (status === "NEEDS_HUMAN" || status === "FOLLOWING_UP") return "warning";
  return "neutral";
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    DRAFT: "Brouillon",
    SENT: "Envoyé",
    FOLLOWING_UP: "Relance en cours",
    REPLIED: "Réponse reçue",
    NEEDS_HUMAN: "À décider",
    WON: "Gagné",
    LOST: "Perdu",
    EXPIRED: "Expiré",
  };
  return labels[status] ?? status;
}

function formatAmount(amount: number | null, currency: string) {
  if (amount === null) return "Montant non renseigné";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(amount);
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date inconnue" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(date);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date inconnue" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
