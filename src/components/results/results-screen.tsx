import { ArrowRight, CircleHelp, Clock3, Info, Sparkles } from "lucide-react";
import Link from "next/link";

import type {
  ObservedMetric,
  ResultsPeriodKey,
  ResultsSummary,
} from "@/lib/results/contracts";
import { formatResultsEstimate } from "@/lib/results/format";

const PERIODS: Array<{ key: ResultsPeriodKey; label: string }> = [
  { key: "30d", label: "30 jours" },
  { key: "90d", label: "90 jours" },
  { key: "12m", label: "12 mois" },
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
      <header className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-[var(--accent)]">Résultats</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
            Ce que Sesira rend visible.
          </h1>
          <p className="mt-3 leading-7 text-[var(--muted)]">
            Les faits observés restent séparés des projections. Aucun montant estimé n’est présenté
            comme un revenu généré.
          </p>
        </div>

        <nav
          aria-label="Période des résultats"
          className="inline-flex self-start rounded-xl border border-[var(--border)] bg-[var(--panel)] p-1"
        >
          {PERIODS.map((period) => {
            const active = period.key === summary.period.key;

            return (
              <Link
                key={period.key}
                href={`/app/results?period=${period.key}`}
                aria-current={active ? "page" : undefined}
                className={`rounded-lg px-3 py-2 text-sm transition sm:px-4 ${
                  active
                    ? "bg-violet-400/15 font-medium text-violet-100"
                    : "text-[var(--muted)] hover:text-white"
                }`}
              >
                {period.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {stateMessage ? (
        <section
          className="mt-8 flex items-start gap-3 rounded-2xl border border-cyan-300/20 bg-cyan-300/5 p-5"
          aria-live="polite"
        >
          <Info className="mt-0.5 size-5 shrink-0 text-cyan-300" />
          <div>
            <h2 className="font-medium">{stateMessage.title}</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{stateMessage.description}</p>
          </div>
        </section>
      ) : null}

      <section className="mt-10" aria-labelledby="observed-title">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-emerald-300">OBSERVÉ</p>
            <h2 id="observed-title" className="mt-2 text-xl font-semibold">
              Activité réelle
            </h2>
          </div>
          <p className="text-sm text-[var(--muted)]">Période : {summary.period.label}</p>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {summary.observed.map((metric) => (
            <ObservedCard key={metric.key} metric={metric} />
          ))}
        </div>
      </section>

      <section className="mt-12" aria-labelledby="estimated-title">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold tracking-[0.18em] text-violet-300">ESTIMATION</p>
          <h2 id="estimated-title" className="mt-2 text-xl font-semibold">
            Potentiel calculé avec prudence
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Ces valeurs projettent un potentiel à partir de l’activité observée. Ce ne sont pas des
            revenus générés.
          </p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {summary.estimated.map((metric) => (
            <article
              key={metric.key}
              className="flex min-h-48 flex-col rounded-2xl border border-violet-300/15 bg-[var(--panel)] p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-[0.68rem] font-semibold tracking-[0.16em] text-violet-300">
                  ESTIMATION
                </span>
                {metric.key === "recovered_time" ? (
                  <Clock3 className="size-4 text-violet-300" />
                ) : (
                  <Sparkles className="size-4 text-violet-300" />
                )}
              </div>
              <p className="mt-5 text-sm leading-5 text-[var(--muted)]">{metric.label}</p>
              <p className="mt-3 break-words text-3xl font-semibold tracking-tight">
                {formatResultsEstimate(metric.estimate)}
              </p>
              <p className="mt-auto pt-5 text-xs leading-5 text-[var(--muted)]">{metric.context}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-6 md:p-8">
        <div className="grid gap-7 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <div className="flex items-center gap-2 text-amber-300">
              <CircleHelp className="size-4" />
              <p className="text-xs font-semibold tracking-[0.18em]">HYPOTHÈSE</p>
            </div>
            <h2 className="mt-3 text-xl font-semibold">Comment lire ces estimations</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              Les hypothèses sont visibles, modérées et appliquées uniquement aux actions réellement
              comptées. Le gain commercial et le retour par euro resteront à établir tant que Core ne
              fournit pas une attribution fiable.
            </p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2" aria-label="Hypothèses utilisées">
            {summary.hypotheses.map((hypothesis) => (
              <li
                key={hypothesis}
                className="flex items-start gap-3 rounded-xl bg-[var(--panel-soft)] px-4 py-3 text-sm leading-6"
              >
                <ArrowRight className="mt-1 size-3.5 shrink-0 text-amber-300" />
                {hypothesis}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

function ObservedCard({ metric }: { metric: ObservedMetric }) {
  const available = metric.availability === "AVAILABLE";

  return (
    <article className="flex min-h-44 flex-col rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5">
      <span className="text-[0.68rem] font-semibold tracking-[0.16em] text-emerald-300">OBSERVÉ</span>
      <p className="mt-5 text-sm leading-5 text-[var(--muted)]">{metric.label}</p>
      <p className={`mt-3 font-semibold tracking-tight ${available ? "text-4xl" : "text-xl text-slate-300"}`}>
        {available ? metric.value : "Indisponible"}
      </p>
      <p className="mt-auto pt-4 text-xs leading-5 text-[var(--muted)]">{metric.context}</p>
    </article>
  );
}
