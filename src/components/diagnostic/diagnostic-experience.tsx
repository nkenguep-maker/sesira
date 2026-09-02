"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { SesiraLogo } from "@/components/sesira/logo";
import { calculateDiagnostic } from "@/lib/diagnostic/calculator";
import type { DiagnosticInput, DiagnosticSector } from "@/lib/diagnostic/contracts";
import { diagnosticInputSchema } from "@/lib/diagnostic/schema";

type Step = 1 | 2 | 3 | 4;

type Draft = {
  sector: DiagnosticSector | null;
  employees: string;
  technicians: string;
  monthlyRequests: string;
  monthlyQuotes: string;
  averageQuoteAmount: string;
  approximateMarginPercent: string;
  weeklyAdminHours: string;
};

const INITIAL_DRAFT: Draft = {
  sector: null,
  employees: "",
  technicians: "",
  monthlyRequests: "",
  monthlyQuotes: "",
  averageQuoteAmount: "",
  approximateMarginPercent: "",
  weeklyAdminHours: "",
};

const STEPS = ["Activité", "Entreprise", "Fonctionnement", "Résultats"] as const;

const SECTORS: Array<{ value: DiagnosticSector; title: string; copy: string }> = [
  { value: "CVC", title: "Chauffage et climatisation", copy: "Installation, entretien, dépannage et contrats CVC." },
  { value: "SOLAR", title: "Solaire et photovoltaïque", copy: "Études, installation, maintenance et interventions." },
  { value: "TECHNICAL_SERVICES", title: "Services techniques", copy: "Maintenance, interventions et prestations récurrentes." },
  { value: "CONSTRUCTION", title: "Construction et rénovation", copy: "Chantiers, coordination, rénovation et suivi client." },
];

export function DiagnosticExperience() {
  const [step, setStep] = useState<Step>(1);
  const [draft, setDraft] = useState<Draft>(INITIAL_DRAFT);
  const [completedInput, setCompletedInput] = useState<DiagnosticInput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const result = useMemo(
    () => (completedInput ? calculateDiagnostic(completedInput) : null),
    [completedInput],
  );

  function update<K extends keyof Draft>(field: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
    setError(null);
  }

  function next() {
    if (step === 1) {
      if (!draft.sector) {
        setError("Choisissez votre activité pour continuer.");
        return;
      }
      setStep(2);
      return;
    }

    if (step === 2) {
      const employees = toNumber(draft.employees);
      const technicians = toNumber(draft.technicians);
      if (!Number.isInteger(employees) || employees < 1 || employees > 500) {
        setError("Indiquez un effectif compris entre 1 et 500 salariés.");
        return;
      }
      if (!Number.isInteger(technicians) || technicians < 0 || technicians > employees) {
        setError("Le nombre de personnes terrain doit rester compris entre 0 et votre effectif total.");
        return;
      }
      setStep(3);
      return;
    }

    if (step === 3) {
      const parsed = diagnosticInputSchema.safeParse(toInput(draft));
      if (!parsed.success) {
        setError("Vérifiez les volumes, le montant moyen, la marge et le temps administratif indiqués.");
        return;
      }
      setCompletedInput(parsed.data);
      setStep(4);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function back() {
    setError(null);
    setStep((current) => Math.max(1, current - 1) as Step);
  }

  function restart() {
    setDraft(INITIAL_DRAFT);
    setCompletedInput(null);
    setError(null);
    setStep(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main className="diagnostic-shell">
      <header className="diagnostic-topbar">
        <Link href="/" aria-label="Retour à SESIRA"><SesiraLogo /></Link>
        <div className="diagnostic-top-actions">
          <span>Diagnostic opérationnel</span>
          <Link className="button ghost small" href="/">Retour au site</Link>
        </div>
      </header>

      <section className="diagnostic-hero">
        <div>
          <span className="eyebrow">DIAGNOSTIC · 5 MINUTES</span>
          <h1>Où votre entreprise<br /><em>perd elle le fil&nbsp;?</em></h1>
        </div>
        <p>
          Quelques chiffres suffisent pour identifier les zones où le suivi mérite votre attention. Le calcul utilise uniquement vos réponses. Aucun benchmark externe n’est ajouté.
        </p>
      </section>

      <div className="diagnostic-progress" aria-label="Progression du diagnostic">
        {STEPS.map((label, index) => {
          const number = (index + 1) as Step;
          const state = number === step ? "active" : number < step ? "done" : "pending";
          return (
            <div className={`diagnostic-progress-item ${state}`} key={label}>
              <span>{String(number).padStart(2, "0")}</span>
              <strong>{label}</strong>
            </div>
          );
        })}
      </div>

      {step === 4 && result && completedInput ? (
        <Results input={completedInput} result={result} onEdit={() => setStep(3)} onRestart={restart} />
      ) : (
        <section className="diagnostic-workspace">
          <div className="diagnostic-card">
            {step === 1 ? <ActivityStep draft={draft} update={update} /> : null}
            {step === 2 ? <CompanyStep draft={draft} update={update} /> : null}
            {step === 3 ? <OperationsStep draft={draft} update={update} /> : null}

            {error ? <p className="diagnostic-error" role="alert">{error}</p> : null}

            <div className="diagnostic-actions">
              {step > 1 ? <button className="button ghost" type="button" onClick={back}>Retour</button> : <span />}
              <button className="button primary" type="button" onClick={next}>
                {step === 3 ? "Voir mes résultats" : "Continuer"}
              </button>
            </div>
          </div>

          <aside className="diagnostic-aside">
            <span className="eyebrow">MÉTHODE</span>
            <h2>Vos chiffres.<br />Rien de plus.</h2>
            <p>Le diagnostic est calculé directement dans votre navigateur. Vos réponses ne sont ni envoyées ni enregistrées.</p>
            <div className="diagnostic-rule-list">
              <span>01</span><p>Vos propres volumes et montants</p>
              <span>02</span><p>Des hypothèses visibles dans les résultats</p>
              <span>03</span><p>Aucun benchmark sectoriel inventé</p>
              <span>04</span><p>Aucune promesse de revenu automatique</p>
            </div>
          </aside>
        </section>
      )}

      <footer className="diagnostic-footer">
        <SesiraLogo />
        <span>Diagnostic indicatif. Les résultats sont des scénarios, pas des prévisions.</span>
      </footer>
    </main>
  );
}

function ActivityStep({ draft, update }: StepProps) {
  return (
    <div>
      <StepHead index="01" title="Votre activité" copy="Choisissez l’environnement qui ressemble le plus à votre entreprise. Le secteur donne du contexte, mais n’ajoute aucun benchmark au calcul." />
      <div className="diagnostic-choice-grid">
        {SECTORS.map((sector) => {
          const selected = draft.sector === sector.value;
          return (
            <label className={`diagnostic-choice ${selected ? "selected" : ""}`} key={sector.value}>
              <input type="radio" name="sector" value={sector.value} checked={selected} onChange={() => update("sector", sector.value)} />
              <span className="diagnostic-choice-index">{selected ? "●" : "○"}</span>
              <strong>{sector.title}</strong>
              <p>{sector.copy}</p>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function CompanyStep({ draft, update }: StepProps) {
  return (
    <div>
      <StepHead index="02" title="Votre entreprise" copy="Deux chiffres permettent de comprendre la place du terrain dans votre organisation." />
      <div className="diagnostic-field-grid two">
        <NumberField label="Effectif total" name="employees" value={draft.employees} min={1} max={500} hint="Salariés aujourd’hui" onChange={(value) => update("employees", value)} />
        <NumberField label="Personnes terrain" name="technicians" value={draft.technicians} min={0} max={500} hint="Techniciens ou équipes d’intervention" onChange={(value) => update("technicians", value)} />
      </div>
    </div>
  );
}

function OperationsStep({ draft, update }: StepProps) {
  return (
    <div>
      <StepHead index="03" title="Votre fonctionnement" copy="Utilisez une moyenne récente. Une estimation raisonnable suffit pour faire apparaître les ordres de grandeur." />
      <div className="diagnostic-field-grid">
        <NumberField label="Demandes par mois" name="monthlyRequests" value={draft.monthlyRequests} min={0} max={10000} hint="Nouvelles demandes reçues" onChange={(value) => update("monthlyRequests", value)} />
        <NumberField label="Devis par mois" name="monthlyQuotes" value={draft.monthlyQuotes} min={0} max={10000} hint="Devis créés en moyenne" onChange={(value) => update("monthlyQuotes", value)} />
        <NumberField label="Montant moyen d’un devis" name="averageQuoteAmount" value={draft.averageQuoteAmount} min={0} max={10000000} suffix="€" hint="Montant hors taxes" onChange={(value) => update("averageQuoteAmount", value)} />
        <NumberField label="Marge approximative" name="approximateMarginPercent" value={draft.approximateMarginPercent} min={0} max={100} step="0.1" suffix="%" hint="Pourcentage indicatif" onChange={(value) => update("approximateMarginPercent", value)} />
        <NumberField label="Temps administratif par semaine" name="weeklyAdminHours" value={draft.weeklyAdminHours} min={0} max={500} step="0.5" suffix="h" hint="Pour l’ensemble de l’équipe" onChange={(value) => update("weeklyAdminHours", value)} />
      </div>
    </div>
  );
}

function Results({ input, result, onEdit, onRestart }: {
  input: DiagnosticInput;
  result: ReturnType<typeof calculateDiagnostic>;
  onEdit: () => void;
  onRestart: () => void;
}) {
  return (
    <section className="diagnostic-results">
      <div className="diagnostic-results-head">
        <div>
          <span className="eyebrow">VOS RÉSULTATS</span>
          <h2>Trois leviers à examiner<br /><em>en priorité.</em></h2>
        </div>
        <div className="diagnostic-summary">
          <div><span>Valeur de devis / mois</span><strong>{formatEuro(result.monthlyQuotedValue)}</strong></div>
          <div><span>Temps administratif / mois</span><strong>{formatNumber(result.monthlyAdminHours)} h</strong></div>
        </div>
      </div>

      <div className="diagnostic-priority-grid">
        {result.priorities.map((priority, index) => (
          <article key={priority.key}>
            <span className="eyebrow">PRIORITÉ {String(index + 1).padStart(2, "0")}</span>
            <h3>{priority.title}</h3>
            <p>{priority.explanation}</p>
            <small>{priority.evidence}</small>
          </article>
        ))}
      </div>

      <div className="diagnostic-scenarios">
        <div className="diagnostic-scenario-intro">
          <span className="eyebrow">SCÉNARIOS</span>
          <h3>Pas une promesse.<br />Un ordre de grandeur.</h3>
          <p>Les trois scénarios appliquent exactement les mêmes règles à vos chiffres. Ils montrent ce que représenterait une petite amélioration du suivi et du temps administratif.</p>
        </div>
        <div className="diagnostic-scenario-list">
          {result.scenarios.map((scenario) => (
            <div key={scenario.key} className={scenario.key === "PROBABLE" ? "featured" : ""}>
              <span>{scenario.label}</span>
              <strong>{formatEuro(scenario.marginPotentialPerMonth)}</strong>
              <small>potentiel de marge / mois</small>
              <p>{formatNumber(scenario.recoveredHoursPerMonth)} h potentiellement réallouées</p>
            </div>
          ))}
        </div>
      </div>

      <div className="diagnostic-assumptions">
        <span className="eyebrow">COMMENT LIRE CES CHIFFRES</span>
        <div>
          {result.assumptions.map((assumption) => <p key={assumption}>{assumption}</p>)}
        </div>
      </div>

      <div className="diagnostic-result-actions">
        <div>
          <span className="eyebrow">PROCHAINE ÉTAPE</span>
          <h3>Le diagnostic montre où regarder.<br />SESIRA sert à ne plus perdre le fil.</h3>
        </div>
        <div>
          <button className="button ghost" type="button" onClick={onEdit}>Modifier mes chiffres</button>
          <button className="button ghost" type="button" onClick={onRestart}>Recommencer</button>
          <Link className="button primary" href="/login">Ouvrir SESIRA</Link>
        </div>
      </div>

      <p className="diagnostic-local-note">Aucune réponse de ce diagnostic n’est envoyée ou stockée. Secteur sélectionné : {sectorLabel(input.sector)}.</p>
    </section>
  );
}

function StepHead({ index, title, copy }: { index: string; title: string; copy: string }) {
  return (
    <header className="diagnostic-step-head">
      <span className="eyebrow">ÉTAPE {index}</span>
      <h2>{title}</h2>
      <p>{copy}</p>
    </header>
  );
}

function NumberField({ label, name, value, hint, suffix, min, max, step = "1", onChange }: {
  label: string;
  name: string;
  value: string;
  hint: string;
  suffix?: string;
  min: number;
  max: number;
  step?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="diagnostic-field">
      <span>{label}</span>
      <div>
        <input type="number" inputMode="decimal" name={name} value={value} min={min} max={max} step={step} onChange={(event) => onChange(event.target.value)} />
        {suffix ? <b>{suffix}</b> : null}
      </div>
      <small>{hint}</small>
    </label>
  );
}

type StepProps = {
  draft: Draft;
  update: <K extends keyof Draft>(field: K, value: Draft[K]) => void;
};

function toInput(draft: Draft): DiagnosticInput {
  return {
    sector: draft.sector as DiagnosticSector,
    employees: toNumber(draft.employees),
    technicians: toNumber(draft.technicians),
    monthlyRequests: toNumber(draft.monthlyRequests),
    monthlyQuotes: toNumber(draft.monthlyQuotes),
    averageQuoteAmount: toNumber(draft.averageQuoteAmount),
    approximateMarginPercent: toNumber(draft.approximateMarginPercent),
    weeklyAdminHours: toNumber(draft.weeklyAdminHours),
  };
}

function toNumber(value: string) {
  if (value.trim() === "") return Number.NaN;
  return Number(value.replace(",", "."));
}

function formatEuro(value: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(value);
}

function sectorLabel(sector: DiagnosticSector) {
  return SECTORS.find((item) => item.value === sector)?.title ?? sector;
}
