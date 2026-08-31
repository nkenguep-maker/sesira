import { ArrowRight, CircleHelp, Info } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/sesira/page-header";
import type {
  ObservedMetric,
  ResultsPeriodKey,
  ResultsSummary,
} from "@/lib/results/contracts";
import { formatResultsEstimate } from "@/lib/results/format";

const PERIODS: Array<{ key: ResultsPeriodKey; label: string }> = [
  { key: "7d", label: "Cette semaine" },
  { key: "month", label: "Ce mois" },
  { key: "30d", label: "30 jours" },
  { key: "90d", label: "90 jours" },
];

const STATE_MESSAGES = {
  EMPTY: {
    title: "Aucune activité observée sur cette période.",
    description: "Les premiers résultats apparaîtront dès que votre équipe utilisera Sesira.",
  },
  PARTIAL: {
    title: "Certains résultats sont temporairement indisponibles.",
    description: "Une donnée manquante n’est jamais remplacée par zéro.",
  },
  ESTIMATED_ONLY: {
    title: "Estimations disponibles, observation en attente.",
    description: "Ces projections restent séparées des résultats réellement enregistrés.",
  },
} as const;

export function ResultsScreen({ summary }: { summary: ResultsSummary }) {
  const stateMessage = summary.state === "READY" ? null : STATE_MESSAGES[summary.state];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Résultats"
        title="Résultats"
        description="Ce que Sesira a observé, ce qu’il estime, et ce qu’il ne peut pas attribuer avec certitude."
        actions={
          <nav aria-label="Période des résultats" className="inline-flex  border border-[var(--border)] bg-[var(--panel)] p-1">
            {PERIODS.map((period) => {
              const active = period.key === summary.period.key;

              return (
                <Link
                  key={period.key}
                  href={`/app/results?period=${period.key}`}
                  aria-current={active ? "page" : undefined}
                  className={` px-3 py-2 text-sm transition sm:px-4 ${
                    active
                      ? "bg-[var(--blue-soft)] font-medium text-[var(--blue)]"
                      : "text-[var(--muted)] hover:text-[var(--blue)]"
                  }`}
                >
                  {period.label}
                </Link>
              );
            })}
          </nav>
        }
      />

      {stateMessage ? (
        <section
          className="mt-8 flex items-start gap-3  border border-[var(--blue)] bg-[var(--blue-soft)] p-5"
          aria-live="polite"
        >
          <Info className="mt-0.5 size-5 shrink-0 text-[var(--blue)]" />
          <div>
            <h2 className="font-medium">{stateMessage.title}</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{stateMessage.description}</p>
          </div>
        </section>
      ) : null}

      <section className="results-observed mt-10" aria-labelledby="observed-title">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="sesira-eyebrow">OBSERVÉ</p>
            <h2 id="observed-title" className="mt-2 text-xl font-semibold">
              Activité réelle
            </h2>
            <p className="mt-1 text-[0.84375rem] text-[var(--ink-soft)]">Compté dans le système, pas estimé.</p>
          </div>
          <p className="text-sm text-[var(--muted)]">Période : {summary.period.label}</p>
        </div>

        <div className="results-metric-grid mt-5 grid gap-px border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2 xl:grid-cols-5">
          {summary.observed.map((metric) => (
            <ObservedCard key={metric.key} metric={metric} />
          ))}
        </div>
      </section>

      <section className="results-estimated mt-10 border border-[var(--sand-line)] bg-[var(--sand)] p-5 md:p-7" aria-labelledby="estimated-title">
        <div className="max-w-3xl">
          <p className="sesira-eyebrow !text-[var(--sand-text)]">ESTIMATION</p>
          <h2 id="estimated-title" className="mt-2 text-xl font-semibold">
            Estimations séparées des résultats
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Ces valeurs projettent un potentiel à partir de l’activité observée. Ce ne sont pas des
            revenus générés.
          </p>
        </div>

        <div className="mt-5 grid gap-px border border-[var(--sand-line)] bg-[var(--sand-line)] md:grid-cols-2 xl:grid-cols-5">
          {summary.estimated.map((metric) => (
            <article
              key={metric.key}
              className="flex min-h-48 flex-col bg-[var(--sand)] p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="bg-[var(--sand-badge)] px-2.5 py-1 text-xs font-semibold tracking-[0.1em] text-[var(--sand-text)]">
                  HYPOTHÈSE
                </span>
              </div>
              <p className="mt-5 text-sm leading-5 text-[var(--muted)]">{metric.label}</p>
              <p className="mt-3 [overflow-wrap:anywhere] text-3xl font-semibold tracking-tight tabular-nums">
                {formatResultsEstimate(metric.estimate)}
              </p>
              <p className="mt-auto pt-5 text-xs leading-5 text-[var(--muted)]">{metric.context}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-6 border border-[var(--sand-line)] bg-[var(--surface)] p-6 md:p-8">
        <div className="grid gap-7 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <div className="flex items-center gap-2 text-[var(--sand-text)]">
              <CircleHelp className="size-4" />
              <p className="text-xs font-semibold tracking-[0.18em]">HYPOTHÈSE</p>
            </div>
            <h2 className="mt-3 text-xl font-semibold">Comment lire ces estimations</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              Les hypothèses sont visibles, modérées et appliquées uniquement aux actions réellement
              comptées. Le gain commercial et le retour par euro resteront à établir tant que les
              données disponibles ne permettent pas une attribution fiable.
            </p>
            <p className="mt-4 text-sm font-semibold text-[var(--sand-text)]">Ces montants ne sont pas un chiffre d’affaires déjà réalisé.</p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2" aria-label="Hypothèses utilisées">
            {summary.hypotheses.map((hypothesis) => (
              <li
                key={hypothesis}
                className="flex items-start gap-3 border border-[var(--sand-line)] bg-[var(--sand)] px-4 py-3 text-sm leading-6"
              >
                <ArrowRight className="mt-1 size-3.5 shrink-0 text-[var(--sand-text)]" />
                {hypothesis}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="results-unknown mt-6 border border-[var(--line)] bg-[var(--paper)] p-6 md:p-8" aria-labelledby="unknown-title">
        <p className="sesira-eyebrow">INCONNU</p>
        <h2 id="unknown-title" className="mt-2 text-xl font-semibold">Ce que Sesira ne sait pas attribuer.</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {["L’impact causal d’une relance sur une signature.", "La raison exacte d’une décision client.", "Un chiffre d’affaires généré par Sesira sans preuve causale."].map((item) => <p key={item} className="border border-[var(--line)] bg-[var(--surface)] p-4 text-sm leading-6">{item}</p>)}
        </div>
        <p className="mt-6 border-l-2 border-[var(--blue)] pl-4 text-sm font-medium">Sesira ne transforme jamais une estimation en résultat observé.</p>
        <Link href="/app/results" className="mt-5 inline-flex text-sm font-semibold text-[var(--blue)]">Voir les rapports <span className="ml-2">→</span></Link>
      </section>
    </div>
  );
}

function ObservedCard({ metric }: { metric: ObservedMetric }) {
  const available = metric.availability === "AVAILABLE";

  return (
    <article className="flex min-h-44 flex-col bg-[var(--surface)] p-5">
      <span className="sesira-eyebrow">OBSERVÉ</span>
      <p className="mt-5 text-sm leading-5 text-[var(--muted)]">{metric.label}</p>
      <p className={`mt-3 font-[family-name:var(--font-display)] font-semibold tracking-[-0.03em] ${available ? "text-4xl" : "text-xl text-[var(--ink)]"}`}>
        {available ? metric.value : "Indisponible"}
      </p>
      <p className="mt-auto pt-4 text-xs leading-5 text-[var(--muted)]">{metric.context}</p>
    </article>
  );
}
