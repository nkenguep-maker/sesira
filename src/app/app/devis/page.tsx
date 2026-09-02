import { EmptyState, PageHeader, StatusPill } from "@/components/sesira/ui";
import { getViewerContext } from "@/lib/auth/viewer";
import { getQuoteList } from "@/lib/data";

export const dynamic = "force-dynamic";

const ACTIVE_STATUSES = new Set(["SENT", "FOLLOWING_UP", "REPLIED", "NEEDS_HUMAN"]);

export default async function DevisPage() {
  const viewer = await getViewerContext();
  if (!viewer) return null;

  const quotes = await getQuoteList(viewer.organization.id);
  const active = quotes.filter((quote) => ACTIVE_STATUSES.has(quote.status)).length;
  const needsHuman = quotes.filter((quote) => quote.status === "NEEDS_HUMAN").length;
  const won = quotes.filter((quote) => quote.status === "WON").length;

  return (
    <>
      <PageHeader
        eyebrow="03 · REVENU"
        title="Devis"
        description="Les devis réels de votre organisation, leur état actuel et la prochaine échéance connue."
      />

      <section className="premium-connection-summary">
        <div><strong>{quotes.length}</strong><span>Devis enregistrés</span></div>
        <div><strong>{active}</strong><span>En suivi</span></div>
        <div><strong>{needsHuman}</strong><span>Décision humaine</span></div>
        <div><strong>{won}</strong><span>Gagnés</span></div>
      </section>

      {quotes.length ? (
        <section className="premium-connection-grid">
          {quotes.map((quote) => (
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
                <div><span>Envoyé</span><strong>{quote.sentAt ? formatDate(quote.sentAt) : "Pas encore envoyé"}</strong></div>
                <div><span>Prochaine action</span><strong>{quote.nextActionAt ? formatDateTime(quote.nextActionAt) : "Aucune planifiée"}</strong></div>
                <div><span>Dernière mise à jour</span><strong>{formatDateTime(quote.updatedAt)}</strong></div>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <EmptyState
          title="Aucun devis disponible"
          description="Les devis apparaîtront ici dès qu’ils seront créés, importés ou synchronisés avec une source réelle."
        />
      )}
    </>
  );
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
