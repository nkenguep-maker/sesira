import { EmptyState, PageHeader, StatusPill } from "@/components/sesira/ui";
import { getQuoteList } from "@/lib/data";
import { DEMO_ORGANIZATION_ID } from "@/lib/demo/context";

export const dynamic = "force-dynamic";
const ACTIVE = new Set(["SENT", "FOLLOWING_UP", "REPLIED", "NEEDS_HUMAN"]);

export default async function DemoQuotesPage() {
  const quotes = await getQuoteList(DEMO_ORGANIZATION_ID);
  const active = quotes.filter((item) => ACTIVE.has(item.status)).length;
  return (
    <>
      <PageHeader eyebrow="DÉMO · REVENU" title="Devis" description="Devis fictifs et état commercial observé dans THERMOPRO SERVICES." />
      <section className="premium-connection-summary"><div><strong>{quotes.length}</strong><span>Total</span></div><div><strong>{active}</strong><span>En suivi</span></div><div><strong>{quotes.filter((q) => q.status === "NEEDS_HUMAN").length}</strong><span>À décider</span></div><div><strong>{quotes.filter((q) => q.status === "WON").length}</strong><span>Gagnés</span></div></section>
      {quotes.length ? <section className="premium-connection-grid">{quotes.map((quote) => (
        <article key={quote.id} className="premium-connection-card"><header><div><span className="eyebrow">{quote.reference ?? "DEVIS FICTIF"}</span><h2>{quote.title}</h2></div><StatusPill tone={quote.status === "NEEDS_HUMAN" || quote.status === "FOLLOWING_UP" ? "warning" : quote.status === "WON" || quote.status === "REPLIED" ? "good" : "neutral"}>{label(quote.status)}</StatusPill></header><div className="premium-data-list compact"><div><span>Montant</span><strong>{money(quote.amount, quote.currency)}</strong></div><div><span>Envoyé</span><strong>{quote.sentAt ? date(quote.sentAt) : "Pas encore envoyé"}</strong></div><div><span>Prochaine action</span><strong>{quote.nextActionAt ? date(quote.nextActionAt) : "Aucune planifiée"}</strong></div></div></article>
      ))}</section> : <EmptyState title="Aucun devis" description="Le tenant de démonstration est vide." />}
    </>
  );
}
function label(status: string) { return ({ DRAFT:"Brouillon", SENT:"Envoyé", FOLLOWING_UP:"Relance en cours", REPLIED:"Réponse reçue", NEEDS_HUMAN:"À décider", WON:"Gagné", LOST:"Perdu", EXPIRED:"Expiré" } as Record<string,string>)[status] ?? status; }
function money(amount: number | null, currency: string) { return amount === null ? "—" : new Intl.NumberFormat("fr-FR", { style:"currency", currency }).format(amount); }
function date(value: string) { const d = new Date(value); return Number.isNaN(d.getTime()) ? "—" : new Intl.DateTimeFormat("fr-FR", { dateStyle:"medium" }).format(d); }
