import Link from "next/link";

import { EmptyState, PageHeader, StatusPill } from "@/components/sesira/ui";
import { getViewerContext } from "@/lib/auth/viewer";
import { getCustomerList, getOpportunitiesFeed, getReactivationCandidates } from "@/lib/data";

export const dynamic = "force-dynamic";

const REACTIVATION_WINDOW_DAYS = 60;

export default async function OpportunitiesPage() {
  const viewer = await getViewerContext();
  if (!viewer) return null;

  const organizationId = viewer.organization.id;
  const [opportunities, customers, reactivationCandidates] = await Promise.all([
    getOpportunitiesFeed(organizationId, { limit: 100, includeTerminal: true }),
    getCustomerList(organizationId, { limit: 500 }),
    getReactivationCandidates(organizationId, { dormantSinceDays: REACTIVATION_WINDOW_DAYS }),
  ]);
  const customerById = new Map(customers.map((customer) => [customer.id, customer.displayName] as const));
  const open = opportunities.filter((opportunity) => !["WON", "LOST", "CANCELLED"].includes(opportunity.commercialState));
  const won = opportunities.filter((opportunity) => opportunity.commercialState === "WON");
  const openCurrencies = [...new Set(open.filter((opportunity) => opportunity.estimatedValue !== null).map((opportunity) => opportunity.currency))];
  const pipelineValue = openCurrencies.length === 1
    ? open.reduce((sum, opportunity) => sum + (opportunity.estimatedValue ?? 0), 0)
    : null;
  const pipelineLabel = openCurrencies.length > 1
    ? "Plusieurs devises"
    : openCurrencies.length === 1
      ? formatAmount(pipelineValue, openCurrencies[0])
      : "Non renseignée";

  return (
    <>
      <PageHeader
        eyebrow="COMMERCIAL"
        title="Opportunités"
        description="Dossiers commerciaux, variantes de devis et décisions en cours."
      />

      <section className="premium-connection-summary">
        <div><strong>{opportunities.length}</strong><span>Total</span></div>
        <div><strong>{open.length}</strong><span>Ouvertes</span></div>
        <div><strong>{won.length}</strong><span>Gagnées</span></div>
        <div><strong>{pipelineLabel}</strong><span>Valeur ouverte</span></div>
      </section>
      {openCurrencies.length > 1 ? (
        <p className="premium-muted-copy">Les opportunités ouvertes utilisent plusieurs devises. SESIRA ne les additionne pas sans règle de conversion explicite.</p>
      ) : null}

      <section className="premium-results-section">
        <div className="premium-section-heading">
          <div><span className="eyebrow">RÉACTIVATION</span><h2>Dossiers sans activité récente</h2></div>
          <StatusPill tone={reactivationCandidates.length ? "warning" : "neutral"}>À relire</StatusPill>
        </div>
        <p className="premium-muted-copy">Cette vue utilise une fenêtre de travail de {REACTIVATION_WINDOW_DAYS} jours. Ce délai n’est pas présenté comme un benchmark. Les dossiers avec opt out ou plainte sont exclus et aucune relance ne part depuis cette vue.</p>
        {reactivationCandidates.length ? (
          <div className="premium-connection-grid">
            {reactivationCandidates.slice(0, 6).map((candidate) => (
              <article key={candidate.opportunityId} className="premium-connection-card">
                <header>
                  <div><span className="eyebrow">À RELIRE</span><h2>{customerById.get(candidate.customerId) ?? "Client non disponible"}</h2></div>
                  <StatusPill>{candidate.dormantDays} jours</StatusPill>
                </header>
                <div className="premium-data-list compact">
                  <div><span>Dernière activité</span><strong>{formatDate(candidate.lastActivityAt)}</strong></div>
                  <div><span>Valeur estimée</span><strong>{formatAmount(candidate.estimatedValue, candidate.currency)}</strong></div>
                  <div><span>État</span><strong>{stateLabel(candidate.commercialState)}</strong></div>
                </div>
                <Link href={`/app/opportunites/${candidate.opportunityId}`} className="button ghost small full">Relire le dossier</Link>
              </article>
            ))}
          </div>
        ) : <p className="premium-muted-copy">Aucun dossier ne correspond actuellement à cette fenêtre de travail.</p>}
      </section>

      {opportunities.length ? (
        <section className="premium-connection-grid">
          {opportunities.map((opportunity) => (
            <article key={opportunity.id} className="premium-connection-card">
              <header>
                <div>
                  <span className="eyebrow">OPPORTUNITÉ</span>
                  <h2>{customerById.get(opportunity.customerId) ?? "Client non disponible"}</h2>
                </div>
                <StatusPill tone={stateTone(opportunity.commercialState)}>{stateLabel(opportunity.commercialState)}</StatusPill>
              </header>
              <div className="premium-data-list compact">
                <div><span>Valeur estimée</span><strong>{formatAmount(opportunity.estimatedValue, opportunity.currency)}</strong></div>
                <div><span>Variantes</span><strong>{opportunity.variantCount}</strong></div>
                <div><span>Révisions courantes</span><strong>{opportunity.currentRevisionQuoteIds.length}</strong></div>
                <div><span>Ouverte</span><strong>{formatDate(opportunity.openedAt)}</strong></div>
                <div><span>Clôture prévue</span><strong>{opportunity.expectedCloseDate ? formatDate(opportunity.expectedCloseDate) : "Non renseignée"}</strong></div>
              </div>
              <Link href={`/app/opportunites/${opportunity.id}`} className="button ghost small full">Voir le dossier</Link>
            </article>
          ))}
        </section>
      ) : (
        <EmptyState
          title="Aucune opportunité"
          description="Les opportunités apparaîtront ici lorsqu’un dossier commercial sera créé ou importé."
        />
      )}
    </>
  );
}

function stateTone(state: string): "good" | "warning" | "neutral" {
  if (state === "WON") return "good";
  if (state === "ACTIVE" || state === "QUALIFYING") return "warning";
  return "neutral";
}

function stateLabel(state: string) {
  const labels: Record<string, string> = {
    NEW: "Nouvelle",
    QUALIFYING: "Qualification",
    ACTIVE: "Active",
    WON: "Gagnée",
    LOST: "Perdue",
    CANCELLED: "Annulée",
  };
  return labels[state] ?? state;
}

function formatAmount(amount: number | null, currency: string) {
  if (amount === null) return "Non renseignée";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date inconnue" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(date);
}
