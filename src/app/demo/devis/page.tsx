import { EmptyState, PageHeader, StatusPill } from "@/components/sesira/ui";
import { getQuoteList } from "@/lib/data";
import { DEMO_ORGANIZATION_ID } from "@/lib/demo/context";

export const dynamic = "force-dynamic";

const ACTIVE = new Set(["SENT", "FOLLOWING_UP", "REPLIED", "NEEDS_HUMAN"]);
const PROPOSAL_EXAMPLE = [
  { name: "Essentiel", detail: "Remise en service et remplacement nécessaire", tone: "neutral" as const },
  { name: "Recommandé", detail: "Solution complète avec prévention", tone: "good" as const },
  { name: "Premium", detail: "Solution complète avec confort et suivi renforcé", tone: "neutral" as const },
];

export default async function DemoQuotesPage() {
  const quotes = await getQuoteList(DEMO_ORGANIZATION_ID);
  const active = quotes.filter((item) => ACTIVE.has(item.status)).length;

  return (
    <>
      <PageHeader
        eyebrow="DÉMO · REVENU"
        title="Devis"
        description="Les devis à suivre restent visibles. Un même dossier peut aussi garder plusieurs variantes et options."
      />

      <section className="premium-connection-summary">
        <div><strong>{quotes.length}</strong><span>Total</span></div>
        <div><strong>{active}</strong><span>En suivi</span></div>
        <div><strong>{quotes.filter((quote) => quote.status === "NEEDS_HUMAN").length}</strong><span>À décider</span></div>
        <div><strong>{quotes.filter((quote) => quote.status === "WON").length}</strong><span>Gagnés</span></div>
      </section>

      <section className="premium-results-section">
        <div className="premium-section-heading">
          <div>
            <span className="eyebrow">EXEMPLE FICTIF · 3 OPTIONS</span>
            <h2>Un besoin. Trois façons de le traiter.</h2>
            <p className="premium-muted-copy">Le client compare plus facilement. Le dossier garde les variantes, les révisions et les choix au même endroit.</p>
          </div>
        </div>
        <div className="premium-connection-grid">
          {PROPOSAL_EXAMPLE.map((proposal) => (
            <article className="premium-connection-card" key={proposal.name}>
              <header>
                <div><span className="eyebrow">PROPOSITION</span><h2>{proposal.name}</h2></div>
                <StatusPill tone={proposal.tone}>{proposal.name === "Recommandé" ? "À mettre en avant" : "Option"}</StatusPill>
              </header>
              <p className="premium-muted-copy">{proposal.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="premium-results-section">
        <div className="premium-section-heading"><div><span className="eyebrow">SUIVI</span><h2>Les devis qui demandent une action.</h2></div></div>
        {quotes.length ? (
          <section className="premium-connection-grid">
            {quotes.map((quote) => (
              <article key={quote.id} className="premium-connection-card">
                <header>
                  <div><span className="eyebrow">{quote.reference ?? "DEVIS FICTIF"}</span><h2>{quote.title}</h2></div>
                  <StatusPill tone={quote.status === "NEEDS_HUMAN" || quote.status === "FOLLOWING_UP" ? "warning" : quote.status === "WON" || quote.status === "REPLIED" ? "good" : "neutral"}>{label(quote.status)}</StatusPill>
                </header>
                <div className="premium-data-list compact">
                  <div><span>Montant</span><strong>{money(quote.amount, quote.currency)}</strong></div>
                  <div><span>Envoyé</span><strong>{quote.sentAt ? date(quote.sentAt) : "Pas encore envoyé"}</strong></div>
                  <div><span>Prochaine action</span><strong>{quote.nextActionAt ? date(quote.nextActionAt) : "Aucune planifiée"}</strong></div>
                </div>
              </article>
            ))}
          </section>
        ) : <EmptyState title="Aucun devis" description="Le tenant de démonstration est vide." />}
      </section>
    </>
  );
}

function label(status: string) {
  return ({
    DRAFT: "Brouillon",
    SENT: "Envoyé",
    FOLLOWING_UP: "Relance en cours",
    REPLIED: "Réponse reçue",
    NEEDS_HUMAN: "À décider",
    WON: "Gagné",
    LOST: "Perdu",
    EXPIRED: "Expiré",
  } as Record<string, string>)[status] ?? status;
}

function money(amount: number | null, currency: string) {
  return amount === null ? "—" : new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(amount);
}

function date(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "—" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(parsed);
}
