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
    <div className="sesira-page--opportunities">
      <PageHeader
        eyebrow="COMMERCIAL"
        title="Opportunités"
        description="Les dossiers à faire avancer, leur valeur connue et les décisions commerciales en cours."
      />

      {opportunities.length ? (
        <section className="workspace-stat-strip" aria-label="Résumé du pipeline">
          <div><strong>{open.length}</strong><span>Ouvertes</span></div>
          <div><strong>{pipelineLabel}</strong><span>Valeur ouverte</span></div>
          <div><strong>{reactivationCandidates.length}</strong><span>À relire</span></div>
          <div><strong>{won.length}</strong><span>Gagnées</span></div>
        </section>
      ) : null}

      {openCurrencies.length > 1 ? (
        <section className="premium-inline-notice">
          <StatusPill>Devises distinctes</StatusPill>
          <p>Les opportunités ouvertes utilisent plusieurs devises. SESIRA ne les additionne pas sans règle de conversion explicite.</p>
        </section>
      ) : null}

      {reactivationCandidates.length ? (
        <section className="sesira-reactivation-strip" aria-label="Dossiers à relire">
          <div className="sesira-reactivation-head">
            <div><span className="eyebrow">RÉACTIVATION</span><h2>Dossiers sans activité récente</h2></div>
            <StatusPill tone="warning">{reactivationCandidates.length} à relire</StatusPill>
          </div>
          <p className="sesira-reactivation-copy">Cette vue utilise une fenêtre de travail de {REACTIVATION_WINDOW_DAYS} jours. Ce délai n’est pas présenté comme un benchmark. Les dossiers avec opt out ou plainte sont exclus et aucune relance ne part depuis cette vue.</p>
          <div className="sesira-reactivation-list">
            {reactivationCandidates.slice(0, 6).map((candidate) => (
              <Link key={candidate.opportunityId} href={`/app/opportunites/${candidate.opportunityId}`} className="sesira-reactivation-item">
                <strong>{customerById.get(candidate.customerId) ?? "Client non disponible"}</strong>
                <span>{formatAmount(candidate.estimatedValue, candidate.currency)}</span>
                <span>{candidate.dormantDays} j sans activité</span>
                <StatusPill>{stateLabel(candidate.commercialState)}</StatusPill>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {opportunities.length ? (
        <section aria-label="Pipeline commercial">
          <div className="premium-section-heading">
            <div><span className="eyebrow">PIPELINE</span><h2>Tous les dossiers</h2></div>
            <span>{opportunities.length}</span>
          </div>
          <div className="sesira-pipeline-list">
            {opportunities.map((opportunity) => (
              <Link key={opportunity.id} href={`/app/opportunites/${opportunity.id}`} className="sesira-pipeline-row">
                <div className="sesira-pipeline-customer">
                  <span>Client</span>
                  <strong>{customerById.get(opportunity.customerId) ?? "Client non disponible"}</strong>
                </div>
                <div className="sesira-pipeline-cell"><span>Valeur</span><strong>{formatAmount(opportunity.estimatedValue, opportunity.currency)}</strong></div>
                <div className="sesira-pipeline-cell"><span>Devis</span><strong>{opportunity.variantCount} variante{opportunity.variantCount === 1 ? "" : "s"}</strong></div>
                <div className="sesira-pipeline-cell"><span>Clôture prévue</span><strong>{opportunity.expectedCloseDate ? formatDate(opportunity.expectedCloseDate) : "Non renseignée"}</strong></div>
                <StatusPill tone={stateTone(opportunity.commercialState)}>{stateLabel(opportunity.commercialState)}</StatusPill>
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <EmptyState
          title="Aucune opportunité"
          description="Les opportunités apparaîtront ici lorsqu’un dossier commercial sera créé ou importé."
        />
      )}
    </div>
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
