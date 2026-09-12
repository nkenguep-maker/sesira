"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { SesiraLogo } from "@/components/sesira/logo";
import {
  DEFAULT_LOSS_ASSUMPTIONS,
  calculateLossDiagnostic,
  comparisonMessage,
  simulateFollowUpLoss,
  type FollowUpHabit,
  type LossAssumptions,
  type LossDiagnosticInput,
  type LossDiagnosticResult,
} from "@/lib/diagnostic/loss-calculator";

const QUOTE_OPTIONS = [
  { label: "Environ 10", value: 10 },
  { label: "Environ 25", value: 25 },
  { label: "Environ 50", value: 50 },
  { label: "100 ou plus", value: 100 },
] as const;

const AMOUNT_OPTIONS = [
  { label: "2 000 €", value: 2_000 },
  { label: "5 000 €", value: 5_000 },
  { label: "15 000 €", value: 15_000 },
  { label: "40 000 €", value: 40_000 },
] as const;

const FOLLOW_UP_OPTIONS = [
  { label: "Dans la semaine", value: 0.1 },
  { label: "Ça dépend du client", value: 0.4 },
  { label: "Quand j’y pense", value: 0.6 },
  { label: "Jamais", value: 1 },
] as const;

const PLANNING_OPTIONS = [
  { label: "Aucun", value: 0 },
  { label: "1 ou 2", value: 2 },
  { label: "3 à 5", value: 4 },
  { label: "Plus de 5", value: 7 },
] as const;

const INVOICE_OPTIONS = [
  { label: "Rien", value: 0 },
  { label: "Moins de 5 000 €", value: 2_500 },
  { label: "5 000 à 20 000 €", value: 12_500 },
  { label: "Plus de 20 000 €", value: 30_000 },
] as const;

export function DiagnosticExperience() {
  const [monthlyQuotes, setMonthlyQuotes] = useState<number | null>(null);
  const [averageQuoteAmount, setAverageQuoteAmount] = useState<number | null>(null);
  const [followUpHabit, setFollowUpHabit] = useState<FollowUpHabit | null>(null);
  const [unscheduledJobs, setUnscheduledJobs] = useState<number | null>(null);
  const [overdueInvoices, setOverdueInvoices] = useState<number | null>(null);
  const [phase, setPhase] = useState<1 | 2 | 3>(1);
  const [estimate, setEstimate] = useState(0);
  const [assumptions, setAssumptions] = useState<LossAssumptions>(() => ({ ...DEFAULT_LOSS_ASSUMPTIONS }));
  const [simulatedHabit, setSimulatedHabit] = useState(0.1);

  const input = useMemo<LossDiagnosticInput | null>(() => {
    if (
      monthlyQuotes === null ||
      averageQuoteAmount === null ||
      followUpHabit === null ||
      unscheduledJobs === null ||
      overdueInvoices === null
    ) return null;

    return { monthlyQuotes, averageQuoteAmount, followUpHabit, unscheduledJobs, overdueInvoices };
  }, [averageQuoteAmount, followUpHabit, monthlyQuotes, overdueInvoices, unscheduledJobs]);

  const result = useMemo(
    () => input ? calculateLossDiagnostic(input, assumptions) : null,
    [assumptions, input],
  );

  const simulation = useMemo(
    () => input ? simulateFollowUpLoss(input, assumptions, simulatedHabit) : null,
    [assumptions, input, simulatedHabit],
  );

  const mondayQueue = useMemo(
    () => input && result ? buildMondayQueue(input, result) : [],
    [input, result],
  );

  const allAnswered = input !== null;

  function openEstimate() {
    if (!input) return;
    setPhase(2);
    window.setTimeout(() => document.getElementById("estimation")?.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
  }

  function openResults() {
    if (!input) return;
    setSimulatedHabit(input.followUpHabit);
    setPhase(3);
    window.setTimeout(() => document.getElementById("diagnostic-result")?.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
  }

  function updateAssumption(key: keyof LossAssumptions, value: number) {
    setAssumptions((current) => ({ ...current, [key]: value }));
  }

  function printConstat() {
    const previousTitle = document.title;
    const date = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" }).format(new Date());
    document.title = `Constat du ${date}`;
    window.print();
    window.setTimeout(() => { document.title = previousTitle; }, 500);
  }

  return (
    <main className="roi-shell">
      <header className="roi-topbar">
        <Link href="/" aria-label="Retour à SESIRA"><SesiraLogo /></Link>
        <div>
          <span>Calculatrice · sans compte</span>
          <Link className="button ghost small" href="/">Retour au site</Link>
        </div>
      </header>

      <section className="roi-hero">
        <span className="roi-kicker">CE QUI SE PERD CHEZ MOI</span>
        <h1>Cinq gestes. Puis vos chiffres devant vous.</h1>
        <p>Choisissez les réponses qui ressemblent le plus à votre activité. Pas de formulaire à remplir, pas de moyenne de marché ajoutée en silence.</p>
      </section>

      <section className="roi-input-stage" aria-label="Cinq questions">
        <ChoiceQuestion
          index="01"
          label="DEVIS"
          title="Combien de devis envoyez-vous par mois ?"
          options={QUOTE_OPTIONS}
          selectedValue={monthlyQuotes}
          onSelect={setMonthlyQuotes}
        />
        <ChoiceQuestion
          index="02"
          label="MONTANT"
          title="Quel est le montant moyen d’un devis ?"
          options={AMOUNT_OPTIONS}
          selectedValue={averageQuoteAmount}
          onSelect={setAverageQuoteAmount}
        />
        <ChoiceQuestion
          index="03"
          label="RELANCES"
          title="Quand relancez-vous un devis sans réponse ?"
          options={FOLLOW_UP_OPTIONS}
          selectedValue={followUpHabit}
          onSelect={(value) => setFollowUpHabit(value as FollowUpHabit)}
        />
        <ChoiceQuestion
          index="04"
          label="PLANNING"
          title="Combien d’affaires signées attendent une date ?"
          options={PLANNING_OPTIONS}
          selectedValue={unscheduledJobs}
          onSelect={setUnscheduledJobs}
        />
        <ChoiceQuestion
          index="05"
          label="FACTURES"
          title="Combien vous doit-on en factures dépassées ?"
          options={INVOICE_OPTIONS}
          selectedValue={overdueInvoices}
          onSelect={setOverdueInvoices}
        />

        <div className="roi-stage-action">
          <div>
            <strong>{allAnswered ? "Vos cinq réponses sont prêtes." : "Choisissez une réponse dans chaque ligne."}</strong>
            <span>Pour les tranches, SESIRA retient volontairement une valeur prudente.</span>
          </div>
          <button className="button primary" type="button" disabled={!allAnswered} onClick={openEstimate}>
            Continuer
          </button>
        </div>
      </section>

      {phase >= 2 && input ? (
        <section id="estimation" className="roi-estimate-stage">
          <span className="roi-kicker">UNE DERNIÈRE CHOSE</span>
          <h2>À votre avis, combien ça vous coûte par an ?</h2>
          <div className="roi-estimate-value">{formatEuro(estimate)}</div>
          <input
            aria-label="Votre estimation annuelle"
            type="range"
            min="0"
            max="200000"
            step="1000"
            value={estimate}
            onChange={(event) => setEstimate(Number(event.target.value))}
          />
          <div className="roi-range-labels"><span>0 €</span><span>200 000 €</span></div>
          <p>Répondez au feeling. Le curseur part à zéro et ne suggère aucun montant.</p>
          <button className="button primary" type="button" onClick={openResults}>Voir le calcul</button>
        </section>
      ) : null}

      {phase === 3 && input && result && simulation ? (
        <section id="diagnostic-result" className="roi-result">
          <div className="roi-print-title">Constat SESIRA · Ce qui se perd chez moi</div>

          <section className="roi-comparison">
            <div className="roi-comparison-grid">
              <article><span>VOUS AVIEZ DIT</span><strong>{formatEuro(estimate)}</strong><small>par an</small></article>
              <article><span>LE CALCUL DONNE</span><strong>{formatEuro(result.annualQuoteLoss)}</strong><small>par an</small></article>
            </div>
            <div className="roi-gap-line">Écart : <strong>{formatEuro(Math.abs(result.annualQuoteLoss - estimate))}</strong></div>
            <p className="roi-comparison-context">
              Sur {formatEuro(result.annualQuotedVolume)} de devis envoyés dans l’année, soit {formatPercent(result.annualQuoteLossShare)}. Fourchette basse {formatEuro(result.annualQuoteLossLow)} · haute {formatEuro(result.annualQuoteLossHigh)}.
            </p>
            <p className="roi-comparison-message">{comparisonMessage(estimate, result.annualQuoteLoss)}</p>
            {input.followUpHabit === 0.1 ? <p className="roi-positive-note">Votre suivi de devis tient déjà. Le reste de la page regarde ailleurs.</p> : null}
          </section>

          <section className="roi-monday">
            <div className="roi-section-head">
              <div><span className="roi-kicker">LUNDI MATIN, CHEZ VOUS</span><h2>Votre file SESIRA avec vos montants.</h2></div>
              <small>{mondayQueue.length} ligne{mondayQueue.length === 1 ? "" : "s"} · maximum 5</small>
            </div>
            {mondayQueue.length ? (
              <div className="roi-monday-list">
                {mondayQueue.map((row, index) => (
                  <article key={`${row.kind}-${index}`}>
                    <b>{index + 1}</b>
                    <div><span>{row.kind}</span><strong>{row.title}</strong><small>{row.detail}</small></div>
                    <em>{row.action}</em>
                  </article>
                ))}
              </div>
            ) : (
              <div className="roi-empty-result">D’après vos réponses, rien ne se perd de façon mesurable. C’est rare, et c’est une bonne nouvelle.</div>
            )}
            <p>Ces lignes viennent de vos réponses, pas d’un exemple préparé à l’avance.</p>
          </section>

          <section className="roi-simulation">
            <span className="roi-kicker">ET SI VOUS RELANCIEZ PLUS TÔT ?</span>
            <h2>Déplacez un seul réglage.</h2>
            <div className="roi-simulation-numbers">
              <strong>{formatEuro(result.annualQuoteLoss)}</strong><span>→</span><strong>{formatEuro(simulation.simulatedLoss)}</strong>
            </div>
            <input
              aria-label="Moment de relance simulé"
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              value={simulatedHabit}
              onChange={(event) => setSimulatedHabit(Number(event.target.value))}
            />
            <div className="roi-range-labels"><span>Dans la semaine</span><span>Jamais</span></div>
            <p><strong>{formatEuro(Math.abs(simulation.difference))}</strong> d’écart par an entre votre réglage actuel et cette position.</p>
            <small>SESIRA ne relance pas à votre place. Il vous dit qui relancer.</small>
          </section>

          <section className="roi-output">
            <div className="roi-section-head">
              <div><span className="roi-kicker">CE N’EST PAS LA MÊME CHOSE</span><h2>Trois réalités, jamais additionnées.</h2></div>
            </div>
            <div className="roi-output-grid">
              <article>
                <span>DEVIS · ORDRE DE GRANDEUR</span>
                <strong>{formatEuro(result.annualQuoteLoss)}</strong>
                <p>de devis qui auraient pu aboutir selon les hypothèses visibles ci-dessous. Ce n’est pas du chiffre d’affaires garanti.</p>
              </article>
              {input.unscheduledJobs > 0 ? (
                <article>
                  <span>SIGNÉ · EN ATTENTE D’UNE DATE</span>
                  <strong>{formatEuro(result.signedValueWaitingForDate)}</strong>
                  <p>déjà gagnés commercialement et encore sans date. L’hypothèse de risque associée est {formatEuro(result.unscheduledRisk)}.</p>
                </article>
              ) : null}
              {input.overdueInvoices > 0 ? (
                <article>
                  <span>FACTURÉ · PAS ENCAISSÉ</span>
                  <strong>{formatEuro(result.overdueInvoices)}</strong>
                  <p>Vous avez déjà fait le travail. Ce montant vient directement de votre réponse.</p>
                </article>
              ) : null}
            </div>
          </section>

          <section className="roi-assumptions">
            <div className="roi-section-head">
              <div><span className="roi-kicker">TROIS HYPOTHÈSES NE VIENNENT PAS DE VOUS</span><h2>Changez-les. Tout se recalcule.</h2></div>
            </div>
            <div className="roi-assumption-list">
              <AssumptionControl
                label="Devis sans réponse au-delà de 7 jours"
                value={assumptions.unansweredAfterSevenDaysShare}
                min={0.1}
                max={0.8}
                step={0.05}
                onChange={(value) => updateAssumption("unansweredAfterSevenDaysShare", value)}
              />
              <AssumptionControl
                label="Relances supplémentaires qui auraient abouti"
                value={assumptions.additionalFollowUpConversionShare}
                min={0.05}
                max={0.15}
                step={0.01}
                onChange={(value) => updateAssumption("additionalFollowUpConversionShare", value)}
              />
              <AssumptionControl
                label="Affaires signées sans date qui ne se font jamais"
                value={assumptions.unscheduledCancellationShare}
                min={0}
                max={0.3}
                step={0.01}
                onChange={(value) => updateAssumption("unscheduledCancellationShare", value)}
              />
            </div>
            <p className="roi-order-note">Ce montant reprend vos réponses et trois hypothèses visibles. Il donne un ordre de grandeur, pas une mesure.</p>
          </section>

          <details className="roi-calculation" open>
            <summary>Calcul détaillé</summary>
            <div className="roi-calculation-grid">
              <CalculationLine label="Volume annuel de devis" formula={`${input.monthlyQuotes} × ${formatEuro(input.averageQuoteAmount)} × 12`} value={formatEuro(result.annualQuotedVolume)} />
              <CalculationLine label="Sans réponse / mois" formula={`${input.monthlyQuotes} × ${formatPercent(assumptions.unansweredAfterSevenDaysShare)}`} value={formatNumber(result.unansweredQuotesPerMonth)} />
              <CalculationLine label="Jamais relancés / mois" formula={`${formatNumber(result.unansweredQuotesPerMonth)} × ${formatPercent(input.followUpHabit)}`} value={formatNumber(result.neverFollowedUpPerMonth)} />
              <CalculationLine label="Ordre de grandeur annuel" formula={`${formatNumber(result.neverFollowedUpPerMonth)} × ${formatPercent(assumptions.additionalFollowUpConversionShare)} × ${formatEuro(input.averageQuoteAmount)} × 12`} value={formatEuro(result.annualQuoteLoss)} />
              {input.unscheduledJobs > 0 ? <CalculationLine label="Signé sans date" formula={`${input.unscheduledJobs} × ${formatEuro(input.averageQuoteAmount)}`} value={formatEuro(result.signedValueWaitingForDate)} /> : null}
              {input.overdueInvoices > 0 ? <CalculationLine label="Factures échues" formula="Votre réponse, sans calcul" value={formatEuro(result.overdueInvoices)} /> : null}
            </div>
          </details>

          <div className="roi-result-actions">
            <a className="button primary" href="mailto:paul@sesira.fr?subject=Calculatrice%20SESIRA%20-%2020%20minutes">En parler vingt minutes</a>
            <button className="button ghost" type="button" onClick={printConstat}>Recevoir ce constat en PDF</button>
            <Link href="/demo">Voir SESIRA en action</Link>
          </div>
        </section>
      ) : null}

      <footer className="roi-footer">
        <SesiraLogo />
        <span>Vos réponses restent dans cette page. Aucun résultat commercial n’est promis.</span>
      </footer>
    </main>
  );
}

function ChoiceQuestion({
  index,
  label,
  title,
  options,
  selectedValue,
  onSelect,
}: {
  index: string;
  label: string;
  title: string;
  options: readonly { label: string; value: number }[];
  selectedValue: number | null;
  onSelect: (value: number) => void;
}) {
  return (
    <article className="roi-choice-question">
      <div className="roi-choice-question__head"><span>{index} · {label}</span><h2>{title}</h2></div>
      <div className="roi-choice-grid">
        {options.map((option) => (
          <button
            className={selectedValue === option.value ? "selected" : ""}
            type="button"
            key={`${label}-${option.label}`}
            onClick={() => onSelect(option.value)}
            aria-pressed={selectedValue === option.value}
          >
            {option.label}
          </button>
        ))}
      </div>
    </article>
  );
}

function AssumptionControl({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="roi-assumption-row">
      <div><strong>{formatPercent(value)}</strong><span>{label}</span></div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function CalculationLine({ label, formula, value }: { label: string; formula: string; value: string }) {
  return <div><span>{label}</span><code>{formula}</code><strong>{value}</strong></div>;
}

function buildMondayQueue(input: LossDiagnosticInput, result: LossDiagnosticResult) {
  const quoteCount = Math.min(5, Math.max(0, Math.floor(result.neverFollowedUpPerMonth)));
  const ages = [9, 12, 16, 19, 21];
  const rows: Array<{ kind: string; title: string; detail: string; action: string }> = [];
  let usedQuotes = 0;

  const pushQuote = () => {
    if (usedQuotes >= quoteCount || rows.length >= 5) return;
    rows.push({
      kind: "DEVIS",
      title: `${formatEuro(input.averageQuoteAmount)} · parti il y a ${ages[usedQuotes] ?? 21} jours`,
      detail: "Aucune réponse enregistrée",
      action: "Relancer",
    });
    usedQuotes += 1;
  };

  pushQuote();
  pushQuote();
  if (input.unscheduledJobs > 0 && rows.length < 5) rows.push({ kind: "PLANNING", title: `Affaire signée ${formatEuro(input.averageQuoteAmount)}`, detail: "Aucune date au planning", action: "Planifier" });
  if (input.overdueInvoices > 0 && rows.length < 5) rows.push({ kind: "FACTURE", title: formatEuro(input.overdueInvoices), detail: "Échéance dépassée", action: "Décider" });
  while (usedQuotes < quoteCount && rows.length < 5) pushQuote();
  return rows;
}

function formatEuro(value: number) {
  const rounded = roundDisplayValue(value);
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(rounded);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(value);
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 1 }).format(value);
}

function roundDisplayValue(value: number) {
  if (!Number.isFinite(value) || value === 0) return 0;
  const absolute = Math.abs(value);
  if (absolute >= 10_000) {
    const magnitude = 10 ** Math.max(0, Math.floor(Math.log10(absolute)) - 1);
    return Math.round(value / magnitude) * magnitude;
  }
  return Math.round(value / 100) * 100;
}
