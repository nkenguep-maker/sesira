import Link from "next/link";

import { PageHeader, StatusPill } from "@/components/sesira/ui";
import { getViewerContext } from "@/lib/auth/viewer";
import type { ObservedMetric, ResultsPeriodKey } from "@/lib/results/contracts";
import { formatResultsEstimate } from "@/lib/results/format";
import { buildResultsPeriod, parseResultsPeriod } from "@/lib/results/period";
import { createSupabaseResultsRepository } from "@/lib/results/supabase-results-repository";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ period?: string }>;

const PERIODS: Array<{ key: ResultsPeriodKey; label: string }> = [
  { key: "7d", label: "Cette semaine" },
  { key: "month", label: "Ce mois" },
  { key: "30d", label: "30 jours" },
  { key: "90d", label: "90 jours" },
  { key: "12m", label: "12 mois" },
];

export default async function ResultsPage({ searchParams }: { searchParams: SearchParams }) {
  const [viewer, params] = await Promise.all([getViewerContext(), searchParams]);
  if (!viewer) return null;

  const period = buildResultsPeriod(parseResultsPeriod(params.period));
  const repository = createSupabaseResultsRepository(await createClient());
  const summary = await repository.getSummary({ organizationId: viewer.organization.id, period });
  const available = summary.observed.filter((metric) => metric.availability === "AVAILABLE");
  const unavailable = summary.observed.filter((metric) => metric.availability === "UNAVAILABLE");
  const estimates = summary.estimated.filter((metric) => metric.estimate.value !== null);

  return (
    <>
      <PageHeader
        eyebrow="07 · RÉSULTATS"
        title="Résultats"
        description="Ce que SESIRA a observé, ce qu’il estime, et ce qu’il ne peut pas attribuer avec certitude."
      />

      <nav className="premium-period-nav" aria-label="Période des résultats">
        {PERIODS.map((item) => (
          <Link key={item.key} href={`/app/resultats?period=${item.key}`} className={item.key === summary.period.key ? "active" : ""}>
            {item.label}
          </Link>
        ))}
      </nav>

      {summary.state === "EMPTY" ? (
        <section className="premium-empty-editorial">
          <span className="eyebrow">OBSERVATION EN COURS</span>
          <h2>Pas encore assez de données.</h2>
          <p>SESIRA commence par observer vos dossiers. Les premiers résultats apparaîtront ici lorsque des événements réels auront été enregistrés.</p>
          <div>
            <strong>Ce que SESIRA ne saura jamais attribuer</strong>
            <p>L’effet exact d’une relance sur une signature, la raison réelle d’une décision client et le chiffre d’affaires généré sans preuve causale.</p>
          </div>
        </section>
      ) : (
        <>
          {(summary.state === "PARTIAL" || summary.state === "ESTIMATED_ONLY") && (
            <section className="premium-inline-notice">
              <StatusPill tone="warning">Lecture partielle</StatusPill>
              <p>Certains résultats sont temporairement indisponibles. Une donnée manquante n’est jamais remplacée par zéro.</p>
            </section>
          )}

          <section className="premium-results-section">
            <div className="premium-section-heading">
              <div><span className="eyebrow">OBSERVÉ</span><h2>Enregistré, daté, vérifiable.</h2></div>
              <span>{summary.period.label}</span>
            </div>
            {available.length ? (
              <div className="premium-observed-grid">
                {available.map((metric) => <ObservedMetricCard key={metric.key} metric={metric} />)}
              </div>
            ) : (
              <p className="premium-muted-copy">Aucune donnée observée disponible pour cette période.</p>
            )}
            {unavailable.length ? (
              <div className="premium-missing-list">
                {unavailable.map((metric) => <div key={metric.key}><span>{metric.label}</span><strong>Donnée indisponible</strong></div>)}
              </div>
            ) : null}
          </section>

          <section className="premium-results-section estimate-zone">
            <div className="premium-section-heading">
              <div><span className="eyebrow">ESTIMÉ</span><h2>Calculé à partir d’hypothèses affichées.</h2></div>
            </div>
            {estimates.length ? (
              <div className="premium-estimate-grid">
                {estimates.map((metric) => (
                  <article key={metric.key}>
                    <span>{metric.label}</span>
                    <strong>{formatResultsEstimate(metric.estimate)}</strong>
                    <p>{metric.context}</p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="premium-no-estimate"><strong>Aucune estimation disponible.</strong><p>SESIRA n’invente pas de valeur lorsqu’une méthode de calcul n’est pas suffisamment définie.</p></div>
            )}
            {summary.hypotheses.length ? <div className="premium-hypotheses"><span className="eyebrow">HYPOTHÈSES</span>{summary.hypotheses.map((item) => <p key={item}>{item}</p>)}</div> : null}
          </section>

          <section className="premium-unknown-zone">
            <span className="eyebrow">INCONNU</span>
            <h2>Ce que SESIRA ne transforme jamais en certitude.</h2>
            <div>
              <p>L’impact causal d’une relance sur une signature.</p>
              <p>La raison exacte d’une décision client.</p>
              <p>Le chiffre d’affaires généré par SESIRA sans preuve causale.</p>
            </div>
            <strong>Une estimation reste une estimation.</strong>
          </section>
        </>
      )}
    </>
  );
}

function ObservedMetricCard({ metric }: { metric: ObservedMetric }) {
  return (
    <article>
      <span>{metric.label}</span>
      <strong>{metric.value === null ? "—" : new Intl.NumberFormat("fr-FR").format(metric.value)}</strong>
      <p>{metric.context}</p>
    </article>
  );
}
