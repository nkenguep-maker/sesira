import Link from "next/link";

/* eslint-disable react/no-unescaped-entities */

import { StandaloneHeader } from "@/components/sesira/standalone-header";
import type { ObservedMetric, ResultsPeriodKey, ResultsSummary } from "@/lib/results/contracts";
import { formatResultsEstimate } from "@/lib/results/format";

const PERIODS: Array<{ key: ResultsPeriodKey; label: string }> = [
  { key: "7d", label: "Cette semaine" },
  { key: "month", label: "Ce mois" },
  { key: "30d", label: "30 jours" },
  { key: "90d", label: "Période personnalisée" },
];

export function ResultsScreen({ summary }: { summary: ResultsSummary }) {
  return (
    <div className="standalone-page results-ref">
      <StandaloneHeader label="Résultats" />
      <main>
        <h1>Résultats</h1>
        <p className="results-ref-lede">Ce que Sesira a observé, ce qu'il estime, et ce qu'il ne peut pas attribuer avec certitude.</p>
        {summary.state === "EMPTY" ? <EmptyResults /> : <ResultsData summary={summary} />}
      </main>
    </div>
  );
}

function EmptyResults() {
  return (
    <section className="results-ref-empty" aria-live="polite">
      <h2>Pas encore assez de données.</h2>
      <p>Sesira commence par observer vos dossiers. Les premiers résultats apparaîtront ici lorsque des événements réels auront été enregistrés.</p>
      <div><b>Ce que Sesira ne saura jamais attribuer</b><p>L'effet exact d'une relance sur une signature, la raison réelle d'une décision client, et le chiffre d'affaires « généré » sans preuve. Ces limites resteront affichées, même quand les chiffres arriveront.</p></div>
    </section>
  );
}

function ResultsData({ summary }: { summary: ResultsSummary }) {
  const available = summary.observed.filter((metric) => metric.availability === "AVAILABLE");
  const unavailable = summary.observed.filter((metric) => metric.availability === "UNAVAILABLE");
  const estimate = summary.estimated.find((metric) => metric.estimate.value !== null);

  return (
    <>
      <div className="results-ref-periods">
        <nav aria-label="Période">{PERIODS.map((period) => <Link key={period.key} href={`/app/results?period=${period.key}`} aria-current={period.key === summary.period.key ? "page" : undefined}>{period.label}</Link>)}</nav>
        <span>Période : {summary.period.label}</span>
      </div>
      {summary.state === "PARTIAL" || summary.state === "ESTIMATED_ONLY" ? <div className="results-ref-partial"><b>Certains résultats sont temporairement indisponibles.</b><p>Une donnée manquante n'est jamais remplacée par zéro.</p></div> : null}
      <section className="results-ref-section observed" aria-labelledby="results-observed">
        <header><h2 id="results-observed">Observé</h2><span>enregistré, daté, vérifiable</span></header>
        {available.length ? <><div className="results-ref-heroes">{available.slice(0, 4).map((metric) => <ObservedHero key={metric.key} metric={metric} />)}</div>{available.length > 4 ? <div className="results-ref-secondary">{available.slice(4).map((metric) => <ObservedSmall key={metric.key} metric={metric} />)}</div> : null}</> : <p className="results-ref-unavailable">Aucune donnée observée disponible pour cette période.</p>}
        {unavailable.length ? <div className="results-ref-missing">{unavailable.map((metric) => <p key={metric.key}><span>{metric.label}</span><b>Donnée indisponible</b></p>)}</div> : null}
      </section>
      <section className="results-ref-section estimated" aria-labelledby="results-estimated">
        <header><h2 id="results-estimated">Estimé</h2><span>calculé à partir d'hypothèses affichées</span></header>
        {estimate ? <div className="results-ref-estimate"><strong>{formatResultsEstimate(estimate.estimate)}</strong><small>Estimation</small><p>{estimate.context}</p>{summary.hypotheses.length ? <p>Base : {summary.hypotheses.join(" · ")}</p> : null}</div> : <div className="results-ref-no-estimate"><b>Aucune estimation disponible.</b><p>Sesira affichera ici le temps potentiellement récupéré lorsqu'une méthode de calcul aura été configurée avec votre entreprise.</p></div>}
      </section>
      <UnknownResults />
      <Link className="results-ref-reports" href="/app/reports">Voir les rapports</Link>
    </>
  );
}

function ObservedHero({ metric }: { metric: ObservedMetric }) {
  return <div><strong>{metric.value ?? 0}</strong><span>{metric.label}</span></div>;
}

function ObservedSmall({ metric }: { metric: ObservedMetric }) {
  return <div><strong>{metric.value ?? 0}</strong><span>{metric.label}</span></div>;
}

function UnknownResults() {
  return (
    <section className="results-ref-section unknown" aria-labelledby="results-unknown">
      <header><h2 id="results-unknown">Inconnu</h2></header>
      <h3>Ce que Sesira ne sait pas attribuer.</h3>
      <div><p>L'impact causal d'une relance sur une signature.</p><p>La raison exacte d'une décision client.</p><p>Le chiffre d'affaires « généré » par Sesira sans preuve causale.</p></div>
      <strong>Sesira ne transforme jamais une estimation en résultat observé.</strong>
    </section>
  );
}
