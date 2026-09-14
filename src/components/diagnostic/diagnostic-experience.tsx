"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { SesiraLogo } from "@/components/sesira/logo";
import {
  DEFAULT_LOSS_ASSUMPTIONS,
  calculateLossDiagnostic,
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
  { label: "Selon le client", value: 0.4 },
  { label: "Quand j’y pense", value: 0.6 },
  { label: "Je ne relance pas", value: 1 },
] as const;

const PLANNING_OPTIONS = [
  { label: "Aucune", value: 0 },
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
  const [showResults, setShowResults] = useState(false);
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

  const attentionQueue = useMemo(
    () => input && result ? buildAttentionQueue(input, result) : [],
    [input, result],
  );

  const allAnswered = input !== null;

  function openResults() {
    if (!input) return;
    setSimulatedHabit(input.followUpHabit);
    setShowResults(true);
    window.setTimeout(() => document.getElementById("diagnostic-result")?.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
  }

  function updateAssumption(key: keyof LossAssumptions, value: number) {
    setAssumptions((current) => ({ ...current, [key]: value }));
  }

  function printConstat() {
    const previousTitle = document.title;
    const date = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" }).format(new Date());
    document.title = `Diagnostic SESIRA du ${date}`;
    window.print();
    window.setTimeout(() => { document.title = previousTitle; }, 500);
  }

  return (
    <main className="roi-shell">
      <header className="roi-topbar">
        <Link href="/" aria-label="Retour à SESIRA"><SesiraLogo /></Link>
        <div>
          <span>Diagnostic · 2 min · sans compte</span>
          <Link className="button ghost small" href="/">Retour au site</Link>
        </div>
      </header>

      <section className="roi-hero">
        <span className="roi-kicker">DIAGNOSTIC SESIRA</span>
        <h1>Voyez ce que votre entreprise laisse passer.</h1>
        <p>Devis sans réponse, affaires signées sans date, factures en retard. Répondez à cinq questions avec vos chiffres : SESIRA vous montre ce qui mérite votre attention.</p>
        <div className="roi-hero-meta" aria-label="Informations sur le diagnostic">
          <span>5 questions</span>
          <span>Vos chiffres</span>
          <span>Aucun compte</span>
        </div>
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
          title="Combien d’affaires signées attendent encore une date ?"
          options={PLANNING_OPTIONS}
          selectedValue={unscheduledJobs}
          onSelect={setUnscheduledJobs}
        />
        <ChoiceQuestion
          index="05"
          label="ENCAISSEMENT"
          title="Quel montant de factures échues reste à encaisser ?"
          options={INVOICE_OPTIONS}
          selectedValue={overdueInvoices}
          onSelect={setOverdueInvoices}
        />

        <div className="roi-stage-action">
          <div>
            <strong>{allAnswered ? "Votre diagnostic est prêt." : "Répondez aux cinq questions."}</strong>
            <span>Les hypothèses de calcul restent visibles et modifiables.</span>
          </div>
          <button className="button primary" type="button" disabled={!allAnswered} onClick={openResults}>
            Voir mon diagnostic
          </button>
        </div>
      </section>

      {showResults && input && result && simulation ? (
        <section id="diagnostic-result" className="roi-result">
          <div className="roi-print-title">Diagnostic SESIRA · Ce que votre entreprise laisse passer</div>

          <section className="roi-output">
            <div className="roi-section-head">
              <div><span className="roi-kicker">VOTRE DIAGNOSTIC</span><h2>Voici ce qui mérite votre attention.</h2></div>
              <small>Trois situations · jamais additionnées</small>
            </div>
            <div className="roi-output-grid">
              <article>
                <span>DEVIS À REPRENDRE</span>
                <strong>{formatEuro(result.annualQuoteLoss)}</strong>
                <p>Ordre de grandeur annuel basé sur vos réponses et les hypothèses ci-dessous. Ce n’est pas du chiffre d’affaires garanti.</p>
              </article>
              <article>
                <span>SIGNÉ · EN ATTENTE D’UNE DATE</span>
                <strong>{formatEuro(result.signedValueWaitingForDate)}</strong>
                <p>Valeur commerciale approximative des affaires déjà gagnées qui attendent encore une date.</p>
              </article>
              <article>
                <span>FACTURÉ · PAS ENCAISSÉ</span>
                <strong>{formatEuro(result.overdueInvoices)}</strong>
                <p>Montant issu directement de votre réponse. Le travail est fait, l’argent reste à encaisser.</p>
              </article>
            </div>
          </section>

          <section className="roi-monday">
            <div className="roi-section-head">
              <div><span className="roi-kicker">SI SESIRA ÉTAIT OUVERT CE MATIN</span><h2>Voilà ce qui remonterait en premier.</h2></div>
              <small>{attentionQueue.length} priorité{attentionQueue.length === 1 ? "" : "s"}</small>
            </div>
            {attentionQueue.length ? (
              <div className="roi-monday-list">
                {attentionQueue.map((row, index) => (
                  <article key={`${row.kind}-${index}`}>
                    <b>{index + 1}</b>
                    <div><span>{row.kind}</span><strong>{row.title}</strong><small>{row.detail}</small></div>
                    <em>{row.action}</em>
                  </article>
                ))}
              </div>
            ) : (
              <div className="roi-empty-result">D’après vos réponses, rien ne demande une reprise immédiate sur ces trois sujets.</div>
            )}
            <p>Cette file est construite avec vos réponses. Aucun dossier fictif n’est ajouté.</p>
          </section>

          <section className="roi-simulation">
            <span className="roi-kicker">UN LEVIER SIMPLE</span>
            <h2>Voyez l’effet d’une relance plus tôt.</h2>
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
            <div className="roi-range-labels"><span>Dans la semaine</span><span>Je ne relance pas</span></div>
            <p><strong>{formatEuro(Math.abs(simulation.difference))}</strong> d’écart par an entre votre rythme actuel et cette position.</p>
            <small>C’est une simulation, pas une promesse de chiffre d’affaires.</small>
          </section>

          <details className="roi-calculation">
            <summary>Voir comment ce diagnostic est calculé</summary>
            <div className="roi-method-intro">
              <strong>Vos réponses + trois hypothèses visibles.</strong>
              <span>Changez une hypothèse : le diagnostic se recalcule immédiatement.</span>
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
            <p className="roi-order-note">Le résultat donne un ordre de grandeur. SESIRA ne transforme jamais une hypothèse en résultat commercial garanti.</p>
            <div className="roi-calculation-grid">
              <CalculationLine label="Volume annuel de devis" formula={`${input.monthlyQuotes} × ${formatEuro(input.averageQuoteAmount)} × 12`} value={formatEuro(result.annualQuotedVolume)} />
              <CalculationLine label="Sans réponse / mois" formula={`${input.monthlyQuotes} × ${formatPercent(assumptions.unansweredAfterSevenDaysShare)}`} value={formatNumber(result.unansweredQuotesPerMonth)} />
              <CalculationLine label="Sans relance / mois" formula={`${formatNumber(result.unansweredQuotesPerMonth)} × ${formatPercent(input.followUpHabit)}`} value={formatNumber(result.neverFollowedUpPerMonth)} />
              <CalculationLine label="Ordre de grandeur annuel" formula={`${formatNumber(result.neverFollowedUpPerMonth)} × ${formatPercent(assumptions.additionalFollowUpConversionShare)} × ${formatEuro(input.averageQuoteAmount)} × 12`} value={formatEuro(result.annualQuoteLoss)} />
              <CalculationLine label="Signé sans date" formula={`${input.unscheduledJobs} × ${formatEuro(input.averageQuoteAmount)}`} value={formatEuro(result.signedValueWaitingForDate)} />
              <CalculationLine label="Factures échues" formula="Votre réponse, sans calcul" value={formatEuro(result.overdueInvoices)} />
            </div>
          </details>

          <div className="roi-result-actions">
            <Link className="button primary" href="/signup">Créer mon espace SESIRA</Link>
            <Link className="button ghost" href="/demo">Voir SESIRA en action</Link>
            <button className="button ghost" type="button" onClick={printConstat}>Exporter en PDF</button>
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

function buildAttentionQueue(input: LossDiagnosticInput, result: LossDiagnosticResult) {
  const rows: Array<{ kind: string; title: string; detail: string; action: string }> = [];

  if (result.neverFollowedUpPerMonth > 0) {
    rows.push({
      kind: "DEVIS",
      title: `${formatNumber(result.neverFollowedUpPerMonth)} devis par mois peuvent rester sans relance`,
      detail: `${formatEuro(result.annualQuoteLoss)} d’ordre de grandeur annuel concerné`,
      action: "Relancer",
    });
  }

  if (input.unscheduledJobs > 0) {
    rows.push({
      kind: "PLANNING",
      title: `${input.unscheduledJobs} affaire${input.unscheduledJobs > 1 ? "s" : ""} signée${input.unscheduledJobs > 1 ? "s" : ""} attend${input.unscheduledJobs > 1 ? "ent" : ""} une date`,
      detail: `${formatEuro(result.signedValueWaitingForDate)} de valeur commerciale concernée`,
      action: "Planifier",
    });
  }

  if (input.overdueInvoices > 0) {
    rows.push({
      kind: "ENCAISSEMENT",
      title: `${formatEuro(result.overdueInvoices)} restent à encaisser`,
      detail: "Échéance déjà dépassée",
      action: "Encaisser",
    });
  }

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
