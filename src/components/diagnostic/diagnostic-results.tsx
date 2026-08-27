import {
  ArrowRight,
  CheckCircle2,
  Info,
  LockKeyhole,
} from "lucide-react";

import type { DiagnosticInput, DiagnosticResult } from "@/lib/diagnostic/contracts";

export function DiagnosticResults({
  input,
  result,
  onEdit,
}: {
  input: DiagnosticInput;
  result: DiagnosticResult;
  onEdit: () => void;
}) {
  return (
    <div className="space-y-6">
      <section aria-labelledby="diagnostic-result-title" className="overflow-hidden border border-[var(--line)] bg-[var(--surface)]">
        <div className="border-b border-[var(--line)] bg-[var(--surface)] px-5 py-7 md:px-8 md:py-9">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
            <div className="max-w-3xl">
              <p className="sesira-eyebrow !text-[var(--blue)]">VOS RÉSULTATS</p>
              <h1 id="diagnostic-result-title" className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">
                Trois leviers à examiner en priorité.
              </h1>
              <p className="mt-4 max-w-2xl leading-7 text-[var(--muted)]">
                Cette lecture est calculée uniquement à partir de vos réponses. Elle aide à cadrer
                une discussion ; elle ne prédit pas votre performance.
              </p>
            </div>
            <button
              type="button"
              onClick={onEdit}
              className="sesira-secondary-action self-start"
            >
              Modifier mes réponses
            </button>
          </div>

          <dl className="mt-8 grid gap-3 sm:grid-cols-3">
            <ResultFact label="Devis par mois" value={formatNumber(input.monthlyQuotes)} />
            <ResultFact label="Valeur mensuelle des devis" value={formatEuro(result.monthlyQuotedValue)} />
            <ResultFact label="Temps administratif mensuel" value={`${formatNumber(result.monthlyAdminHours)} h`} />
          </dl>
        </div>

        <div className="p-5 md:p-8">
          <div className="flex items-center gap-3">
            <div>
              <p className="sesira-eyebrow">TOP 3</p>
              <h2 className="mt-1 text-xl font-semibold">Vos priorités opérationnelles</h2>
            </div>
          </div>

          <ol className="mt-6 grid gap-4 lg:grid-cols-3">
            {result.priorities.map((priority, index) => (
              <li key={priority.key} className=" border border-[var(--border)] bg-[var(--background)] p-5">
                <p className="text-sm font-semibold text-[var(--blue)]">0{index + 1}</p>
                <h3 className="mt-5 font-semibold leading-6">{priority.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{priority.explanation}</p>
                <p className="mt-5 border-t border-[var(--border)] pt-4 text-xs leading-5 text-[var(--blue)]">
                  {priority.evidence}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="scenarios-title" className="border border-[var(--sand-line)] bg-[var(--sand)] p-5 md:p-8">
        <div className="max-w-3xl">
          <p className="sesira-eyebrow !text-[var(--sand-text)]">SCÉNARIOS</p>
          <h2 id="scenarios-title" className="mt-2 text-2xl font-semibold">Trois hypothèses, aucune promesse.</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            Les montants montrent une part de la marge brute associée aux devis saisis. Ils ne
            représentent ni du chiffre d’affaires acquis ni un gain attribué à Sesira.
          </p>
        </div>

        <div className="mt-7 grid gap-4 lg:grid-cols-3">
          {result.scenarios.map((scenario) => (
            <article
              key={scenario.key}
              className="relative border border-[var(--sand-line)] bg-[var(--sand)] p-5 md:p-6"
            >
              {scenario.key === "PROBABLE" ? (
                <span className="absolute right-4 top-4 bg-[var(--sand-badge)] px-2.5 py-1 text-xs font-bold tracking-wide text-[var(--sand-text)]">
                  HYPOTHÈSE CENTRALE
                </span>
              ) : null}
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--sand-text)]">{scenario.label}</p>
              <div className="mt-6">
                <p className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-[-0.03em]">{formatNumber(scenario.recoveredHoursPerMonth)} h</p>
                <p className="mt-1 text-xs text-[var(--muted)]">de temps à réallouer par mois</p>
              </div>
              <div className="mt-5 border-t border-[var(--border)] pt-5">
                <p className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-[-0.03em]">{formatEuro(scenario.marginPotentialPerMonth)}</p>
                <p className="mt-1 text-xs leading-5 text-[var(--muted)]">de marge potentielle à examiner par mois</p>
              </div>
              <p className="mt-5 border-t border-[var(--sand-line)] pt-4 text-xs leading-5 text-[var(--ink-soft)]">
                Hypothèse : {scenario.timeSharePercent} % du temps administratif et {scenario.marginSharePercent} % de la marge liée aux devis.
              </p>
            </article>
          ))}
        </div>

        <details className="mt-6 border border-[var(--sand-line)] bg-[var(--surface)] p-5">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-[var(--sand-text)]">
            <Info className="size-4" /> Voir toutes les hypothèses de calcul
          </summary>
          <ul className="mt-4 space-y-2 text-xs leading-5 text-[var(--muted)]">
            {result.assumptions.map((assumption) => (
              <li key={assumption} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-[var(--blue)]" />
                {assumption}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs tracking-wide text-[var(--muted)]">CALCUL {result.calculationVersion}</p>
        </details>
      </section>

      <DiagnosticLeadForm employees={input.employees} />
    </div>
  );
}

function DiagnosticLeadForm({ employees }: { employees: number }) {
  return (
    <section aria-labelledby="contact-title" className=" border border-[var(--border)] bg-[var(--panel)] p-5 md:p-8">
      <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <p className="sesira-eyebrow">ALLER PLUS LOIN</p>
          <h2 id="contact-title" className="mt-2 text-2xl font-semibold">Recevoir une lecture personnalisée</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            Le formulaire est prêt, mais son envoi sécurisé n’est pas encore connecté. Vous pouvez
            consulter vos résultats sans laisser vos coordonnées.
          </p>
          <div className="mt-6 flex items-start gap-3  border border-[var(--blue)] bg-[var(--blue-soft)] p-4">
            <LockKeyhole className="mt-0.5 size-4 shrink-0 text-[var(--blue)]" />
            <p className="text-xs leading-5 text-[var(--muted)]">
              Aucune donnée de ce formulaire n’est envoyée ou enregistrée dans cette version.
            </p>
          </div>
        </div>

        <form className="grid gap-4 sm:grid-cols-2" aria-describedby="lead-unavailable-note">
          <LeadField label="Prénom" name="firstName" autoComplete="given-name" required />
          <LeadField label="Nom" name="lastName" autoComplete="family-name" required />
          <LeadField label="Entreprise" name="company" autoComplete="organization" required className="sm:col-span-2" />
          <LeadField label="Email professionnel" name="professionalEmail" autoComplete="email" type="email" required className="sm:col-span-2" />
          <LeadField label="Téléphone" name="phone" autoComplete="tel" type="tel" />
          <LeadField label="Salariés" name="employees" autoComplete="off" type="number" defaultValue={String(employees)} required />
          <LeadField label="Code postal" name="postalCode" autoComplete="postal-code" required className="sm:col-span-2" />
          <div className="sm:col-span-2">
            <button
              type="button"
              disabled
              className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2  bg-[var(--brand)] px-5 py-3.5 text-sm font-semibold text-white opacity-45"
            >
              Envoi sécurisé bientôt disponible <ArrowRight className="size-4" />
            </button>
            <p id="lead-unavailable-note" className="mt-3 text-center text-xs leading-5 text-[var(--muted)]">
              Aucun contact ne sera créé tant que l’enregistrement sécurisé n’est pas disponible.
            </p>
          </div>
        </form>
      </div>
    </section>
  );
}

function ResultFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[var(--line)] bg-[var(--paper)] p-4">
      <dt className="text-xs text-[var(--muted)]">{label}</dt>
      <dd className="mt-2 font-[family-name:var(--font-display)] text-xl font-semibold tracking-[-0.03em]">{value}</dd>
    </div>
  );
}

function LeadField({ label, name, autoComplete, type = "text", required = false, defaultValue, className = "" }: {
  label: string;
  name: string;
  autoComplete: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  className?: string;
}) {
  return (
    <label className={`block space-y-2 text-sm ${className}`}>
      <span className="font-medium text-[var(--ink)]">{label}{required ? <span className="text-[var(--blue)]"> *</span> : null}</span>
      <input
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        min={type === "number" ? 1 : undefined}
        max={type === "number" ? 500 : undefined}
        name={name}
        required={required}
        type={type}
        className="sesira-field px-4 py-3"
      />
    </label>
  );
}

function formatEuro(value: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(value);
}
