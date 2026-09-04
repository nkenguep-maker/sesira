"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { SesiraLogo } from "@/components/sesira/logo";

const VOLUMES = [
  { label: "Environ 10", value: 10 },
  { label: "Environ 25", value: 25 },
  { label: "Environ 50", value: 50 },
  { label: "100 ou plus", value: 100 },
] as const;

export function DiagnosticExperience() {
  const [monthlyQuotes, setMonthlyQuotes] = useState<number | null>(null);
  const [quotesWithoutFollowUp, setQuotesWithoutFollowUp] = useState("");
  const [averageQuote, setAverageQuote] = useState("");
  const [unscheduledJobs, setUnscheduledJobs] = useState("");
  const [overdueInvoices, setOverdueInvoices] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const result = useMemo(() => {
    if (!monthlyQuotes) return null;

    const noFollowUp = parseOptionalNumber(quotesWithoutFollowUp);
    const average = parseOptionalNumber(averageQuote);
    const unscheduled = parseOptionalNumber(unscheduledJobs);
    const overdue = parseOptionalNumber(overdueInvoices);

    const annualQuotes = monthlyQuotes * 12;
    const annualQuotesLabel = monthlyQuotes === 100 ? `${formatNumber(annualQuotes)}+` : formatNumber(annualQuotes);
    const annualNoFollowUp = noFollowUp === null ? null : Math.round(noFollowUp * 12);
    const quoteValue = annualNoFollowUp !== null && average !== null ? annualNoFollowUp * average : null;

    return {
      annualQuotesLabel,
      annualNoFollowUp,
      quoteValue,
      unscheduled,
      overdue,
    };
  }, [averageQuote, monthlyQuotes, overdueInvoices, quotesWithoutFollowUp, unscheduledJobs]);

  const followUpError = useMemo(() => {
    if (!monthlyQuotes) return null;
    const value = parseOptionalNumber(quotesWithoutFollowUp);
    if (value === null) return null;
    if (monthlyQuotes < 100 && value > monthlyQuotes) {
      return `Ce nombre ne peut pas dépasser les ${monthlyQuotes} devis envoyés par mois.`;
    }
    return null;
  }, [monthlyQuotes, quotesWithoutFollowUp]);

  function showResult() {
    if (!monthlyQuotes || followUpError) return;
    setSubmitted(true);
    window.setTimeout(() => {
      document.getElementById("diagnostic-result")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 20);
  }

  return (
    <main className="roi-shell">
      <header className="roi-topbar">
        <Link href="/" aria-label="Retour à SESIRA"><SesiraLogo /></Link>
        <div>
          <span>Diagnostic gratuit · sans compte</span>
          <Link className="button ghost small" href="/">Retour au site</Link>
        </div>
      </header>

      <section className="roi-hero">
        <span className="roi-kicker">3 MINUTES · VOS CHIFFRES UNIQUEMENT</span>
        <h1>Sur un mois normal, qu&apos;est-ce qui reste sans suite chez vous&nbsp;?</h1>
        <p>Des chiffres approximatifs suffisent. Le résultat reprend uniquement ce que vous entrez.</p>
      </section>

      <section className="roi-form" aria-label="Questions du diagnostic SESIRA">
        <article className="roi-question roi-question-wide">
          <div className="roi-question-head">
            <span>01 · DEVIS</span>
            <h2>Combien de devis envoyez-vous chaque mois&nbsp;?</h2>
          </div>
          <div className="roi-volume-grid">
            {VOLUMES.map((item) => (
              <button
                className={`roi-volume-choice ${monthlyQuotes === item.value ? "selected" : ""}`}
                type="button"
                key={item.label}
                onClick={() => {
                  setMonthlyQuotes(item.value);
                  setSubmitted(false);
                }}
              >
                <strong>{item.label}</strong>
                <small>devis / mois</small>
              </button>
            ))}
          </div>
        </article>

        <article className="roi-question">
          <div className="roi-question-head">
            <span>02 · RELANCES</span>
            <h2>Combien de devis sans réponse ne sont jamais relancés&nbsp;?</h2>
          </div>
          <NumberField
            label="Sur un mois normal"
            value={quotesWithoutFollowUp}
            onChange={(value) => {
              setQuotesWithoutFollowUp(value);
              setSubmitted(false);
            }}
            suffix="devis"
            placeholder="3"
            helper="Si vous ne savez pas, laissez vide."
          />
          {followUpError ? <p className="roi-field-error">{followUpError}</p> : null}
        </article>

        <article className="roi-question">
          <div className="roi-question-head">
            <span>03 · MONTANT</span>
            <h2>Quel est le montant moyen d&apos;un devis&nbsp;?</h2>
          </div>
          <NumberField
            label="Approximation"
            value={averageQuote}
            onChange={(value) => {
              setAverageQuote(value);
              setSubmitted(false);
            }}
            suffix="€"
            placeholder="12000"
            helper="Facultatif. Il sert uniquement à chiffrer la valeur des devis concernés."
          />
        </article>

        <article className="roi-question">
          <div className="roi-question-head">
            <span>04 · CHANTIERS</span>
            <h2>Combien de chantiers signés sont aujourd&apos;hui sans date au planning&nbsp;?</h2>
          </div>
          <NumberField
            label="Aujourd'hui"
            value={unscheduledJobs}
            onChange={(value) => {
              setUnscheduledJobs(value);
              setSubmitted(false);
            }}
            suffix="chantiers"
            placeholder="2"
            helper="Laissez vide si vous ne connaissez pas le chiffre."
          />
        </article>

        <article className="roi-question">
          <div className="roi-question-head">
            <span>05 · FACTURES</span>
            <h2>Quel montant arrivé à échéance n&apos;est pas encore encaissé aujourd&apos;hui&nbsp;?</h2>
          </div>
          <NumberField
            label="Factures échues"
            value={overdueInvoices}
            onChange={(value) => {
              setOverdueInvoices(value);
              setSubmitted(false);
            }}
            suffix="€"
            placeholder="12400"
            helper="Facultatif. Entrez le montant que vous voyez réellement aujourd'hui."
          />
        </article>
      </section>

      <section className="roi-submit">
        <div>
          <strong>Aucun compte demandé.</strong>
          <span>Les valeurs restent dans cette page pendant votre calcul.</span>
        </div>
        <button className="button primary" type="button" disabled={!monthlyQuotes || Boolean(followUpError)} onClick={showResult}>
          Voir mes chiffres
        </button>
      </section>

      {submitted && result ? (
        <section id="diagnostic-result" className="roi-result">
          <div className="roi-result-head">
            <span className="roi-kicker">VOS CHIFFRES</span>
            <h2>Voilà ce que vous avez déclaré.</h2>
          </div>

          <div className="roi-result-grid">
            <ResultCard label="Devis envoyés" value={result.annualQuotesLabel} detail="par an, d'après votre volume mensuel" />
            <ResultCard
              label="Sans réponse et sans relance"
              value={result.annualNoFollowUp === null ? "Non renseigné" : formatNumber(result.annualNoFollowUp)}
              detail={result.annualNoFollowUp === null ? "vous n'avez pas donné ce chiffre" : "devis par an, si votre mois normal se répète"}
            />
            <ResultCard
              label="Valeur des devis concernés"
              value={result.quoteValue === null ? "Non calculée" : formatEuro(result.quoteValue)}
              detail={result.quoteValue === null ? "renseignez le montant moyen pour l'afficher" : "par an, sur vos chiffres"}
            />
            <ResultCard
              label="Chantiers signés sans date"
              value={result.unscheduled === null ? "Non renseigné" : formatNumber(result.unscheduled)}
              detail="aujourd'hui"
            />
            <ResultCard
              label="Factures échues non encaissées"
              value={result.overdue === null ? "Non renseigné" : formatEuro(result.overdue)}
              detail="aujourd'hui"
            />
          </div>

          <div className="roi-truth-note">
            <strong>La valeur des devis n&apos;est pas du chiffre d&apos;affaires perdu.</strong>
            <p>Elle mesure seulement les devis que vous avez indiqués comme sans réponse et sans relance. SESIRA ne devine pas lesquels auraient signé.</p>
          </div>

          <div className="roi-next-step">
            <div>
              <span className="roi-kicker">SUR VOS VRAIS DEVIS</span>
              <h3>Vous voulez mesurer ça pendant 90 jours&nbsp;?</h3>
              <p>SESIRA observe vos demandes et vos devis. Il garde aussi les relances datées. Rien n&apos;est envoyé par SESIRA pendant le constat.</p>
            </div>
            <div className="roi-offer-card">
              <strong>590 €</strong>
              <p>forfait unique · 90 jours · sans engagement</p>
              <small>Déduits de l&apos;installation si vous continuez.</small>
              <a className="button primary" href="mailto:paul@sesira.fr?subject=Constat%2090%20jours%20SESIRA">Demander mon constat</a>
            </div>
          </div>

          <div className="roi-secondary-actions">
            <button className="button ghost" type="button" onClick={() => setSubmitted(false)}>Modifier mes chiffres</button>
            <Link href="/#aujourdhui">Voir SESIRA Aujourd&apos;hui</Link>
          </div>
        </section>
      ) : null}

      <footer className="roi-footer">
        <SesiraLogo />
        <span>Le calcul reprend vos saisies. Il ne promet aucun résultat commercial.</span>
      </footer>
    </main>
  );
}

function NumberField({
  label,
  value,
  onChange,
  suffix,
  placeholder,
  helper,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suffix: string;
  placeholder: string;
  helper: string;
}) {
  return (
    <label className="roi-number-field">
      <span>{label}</span>
      <div>
        <input
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          aria-label={label}
        />
        <b>{suffix}</b>
      </div>
      <small>{helper}</small>
    </label>
  );
}

function ResultCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function parseOptionalNumber(value: string) {
  const cleaned = value.trim().replace(/\s/g, "").replace(",", ".");
  if (!cleaned) return null;
  const number = Number(cleaned);
  if (!Number.isFinite(number) || number < 0) return null;
  return number;
}

function formatEuro(value: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value);
}
