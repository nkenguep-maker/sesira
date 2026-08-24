"use client";

import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  ClipboardList,
  HardHat,
  LineChart,
  Settings2,
  ShieldCheck,
  SunMedium,
  ThermometerSun,
  UsersRound,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { DiagnosticResults } from "@/components/diagnostic/diagnostic-results";
import { calculateDiagnostic } from "@/lib/diagnostic/calculator";
import type { DiagnosticInput, DiagnosticSector } from "@/lib/diagnostic/contracts";
import { diagnosticInputSchema } from "@/lib/diagnostic/schema";

type Step = 1 | 2 | 3 | 4;

type DiagnosticDraft = {
  sector: DiagnosticSector | null;
  employees: string;
  technicians: string;
  monthlyRequests: string;
  monthlyQuotes: string;
  averageQuoteAmount: string;
  approximateMarginPercent: string;
  weeklyAdminHours: string;
};

const INITIAL_DRAFT: DiagnosticDraft = {
  sector: null,
  employees: "",
  technicians: "",
  monthlyRequests: "",
  monthlyQuotes: "",
  averageQuoteAmount: "",
  approximateMarginPercent: "",
  weeklyAdminHours: "",
};

const STEPS = [
  [1, "Votre activité", ClipboardList],
  [2, "Votre entreprise", Building2],
  [3, "Votre fonctionnement", Settings2],
  [4, "Vos résultats", LineChart],
] as const;

const SECTORS: Array<{
  value: DiagnosticSector;
  title: string;
  description: string;
  icon: LucideIcon;
}> = [
  { value: "CVC", title: "Chauffage / Climatisation", description: "Installation, entretien et dépannage CVC.", icon: ThermometerSun },
  { value: "SOLAR", title: "Solaire / Photovoltaïque", description: "Études, installation et maintenance solaire.", icon: SunMedium },
  { value: "TECHNICAL_SERVICES", title: "Maintenance / Services techniques", description: "Interventions, contrats et services récurrents.", icon: Wrench },
  { value: "CONSTRUCTION", title: "Construction / Rénovation", description: "Chantiers, coordination et rénovation.", icon: HardHat },
];

export function DiagnosticExperience() {
  const [step, setStep] = useState<Step>(1);
  const [draft, setDraft] = useState<DiagnosticDraft>(INITIAL_DRAFT);
  const [completedInput, setCompletedInput] = useState<DiagnosticInput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const update = (field: keyof DiagnosticDraft, value: string | DiagnosticSector) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setError(null);
  };

  const continueFromActivity = () => {
    if (!draft.sector) {
      setError("Choisissez votre activité pour continuer.");
      return;
    }
    setError(null);
    setStep(2);
  };

  const continueFromCompany = () => {
    const employees = toNumber(draft.employees);
    const technicians = toNumber(draft.technicians);

    if (!Number.isInteger(employees) || employees < 1 || employees > 500) {
      setError("Indiquez un effectif compris entre 1 et 500 salariés.");
      return;
    }
    if (!Number.isInteger(technicians) || technicians < 0 || technicians > employees) {
      setError("Le nombre de techniciens doit être compris entre 0 et l’effectif total.");
      return;
    }

    setError(null);
    setStep(3);
  };

  const calculate = () => {
    const parsed = diagnosticInputSchema.safeParse(toDiagnosticInput(draft));
    if (!parsed.success) {
      setError("Vérifiez les volumes, le montant moyen, la marge et le temps administratif.");
      return;
    }

    setCompletedInput(parsed.data);
    setError(null);
    setStep(4);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => {
    setError(null);
    setStep((current) => (Math.max(1, current - 1) as Step));
  };

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 md:py-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex items-center justify-between gap-4 py-2">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-[var(--brand)] font-bold text-white">S</span>
            <span>
              <span className="block text-sm font-semibold tracking-[0.18em]">SESIRA</span>
              <span className="block text-[10px] text-[var(--muted)]">Diagnostic opérationnel</span>
            </span>
          </Link>
          <Link href="/login" className="rounded-full border border-[var(--border)] bg-[var(--panel)] px-4 py-2 text-xs font-medium text-slate-300 transition hover:border-violet-300/40 hover:text-white">
            Ouvrir Sesira
          </Link>
        </header>

        <Progress step={step} />

        {step === 4 && completedInput ? (
          <div className="mt-7">
            <DiagnosticResults
              input={completedInput}
              result={calculateDiagnostic(completedInput)}
              onEdit={() => setStep(3)}
            />
          </div>
        ) : (
          <div className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-5 shadow-2xl shadow-black/20 md:p-8 lg:p-10">
              {step === 1 ? <ActivityStep draft={draft} update={update} /> : null}
              {step === 2 ? <CompanyStep draft={draft} update={update} /> : null}
              {step === 3 ? <OperationsStep draft={draft} update={update} /> : null}

              {error ? (
                <p role="alert" className="mt-6 rounded-xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-200">
                  {error}
                </p>
              ) : null}

              <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[var(--border)] pt-6 sm:flex-row sm:items-center sm:justify-between">
                {step > 1 ? (
                  <button type="button" onClick={goBack} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-5 py-3 text-sm font-medium text-slate-300 transition hover:bg-[var(--panel-soft)] hover:text-white">
                    <ArrowLeft className="size-4" /> Retour
                  </button>
                ) : <span />}
                <button
                  type="button"
                  onClick={step === 1 ? continueFromActivity : step === 2 ? continueFromCompany : calculate}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-violet-500"
                >
                  {step === 3 ? "Voir mes résultats" : "Continuer"} <ArrowRight className="size-4" />
                </button>
              </div>
            </section>

            <aside className="space-y-4 lg:sticky lg:top-6">
              <div className="rounded-2xl border border-cyan-300/15 bg-cyan-300/5 p-5">
                <ShieldCheck className="size-5 text-cyan-300" />
                <h2 className="mt-4 font-medium">Vos réponses restent locales.</h2>
                <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                  Aucun compte n’est nécessaire. Les calculs sont effectués dans votre navigateur et aucune réponse n’est envoyée.
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5">
                <p className="text-xs font-semibold tracking-[0.16em] text-violet-300">MÉTHODE</p>
                <ul className="mt-4 space-y-3 text-xs leading-5 text-[var(--muted)]">
                  {["Vos propres chiffres", "Des règles de calcul visibles", "Aucun benchmark ajouté", "Aucune intelligence artificielle"].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-3.5 shrink-0 text-violet-300" /> {item}
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        )}

        <footer className="py-10 text-center text-xs text-slate-600">
          © 2026 Sesira — Diagnostic indicatif, sans benchmark externe.
        </footer>
      </div>
    </main>
  );
}

function Progress({ step }: { step: Step }) {
  return (
    <nav aria-label="Progression du diagnostic" className="mt-7 overflow-x-auto pb-2">
      <ol className="grid min-w-[680px] grid-cols-4 gap-2">
        {STEPS.map(([number, label, Icon]) => {
          const active = number === step;
          const complete = number < step;
          return (
            <li key={number} aria-current={active ? "step" : undefined} className={`rounded-xl border px-4 py-3 ${active ? "border-violet-300/50 bg-violet-400/10" : complete ? "border-cyan-300/20 bg-cyan-300/5" : "border-[var(--border)] bg-[var(--panel)]"}`}>
              <div className="flex items-center gap-3">
                <span className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${active ? "bg-violet-400 text-white" : complete ? "bg-cyan-300/15 text-cyan-200" : "bg-[var(--panel-soft)] text-slate-500"}`}>
                  {complete ? <Check className="size-3.5" /> : number}
                </span>
                <div>
                  <p className="text-[10px] text-[var(--muted)]">ÉTAPE {number}</p>
                  <p className={`mt-0.5 text-xs font-medium ${active || complete ? "text-white" : "text-slate-500"}`}>{label}</p>
                </div>
                <Icon className="ml-auto size-4 text-slate-600" />
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function StepHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <header className="max-w-3xl">
      <p className="text-xs font-semibold tracking-[0.2em] text-[var(--accent)]">{eyebrow}</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
      <p className="mt-3 leading-7 text-[var(--muted)]">{description}</p>
    </header>
  );
}

function ActivityStep({ draft, update }: StepProps) {
  return (
    <div>
      <StepHeading eyebrow="VOTRE ACTIVITÉ" title="Dans quel environnement travaillez-vous ?" description="Choisissez l’activité qui ressemble le plus à votre entreprise. Le calcul reste fondé sur vos propres chiffres." />
      <fieldset className="mt-8 grid gap-4 md:grid-cols-2">
        <legend className="sr-only">Secteur d’activité</legend>
        {SECTORS.map(({ value, title, description, icon: Icon }) => {
          const selected = draft.sector === value;
          return (
            <label key={value} className={`cursor-pointer rounded-2xl border p-5 transition ${selected ? "border-violet-300/60 bg-violet-400/10" : "border-[var(--border)] bg-[var(--background)] hover:border-slate-500"}`}>
              <input type="radio" name="sector" value={value} checked={selected} onChange={() => update("sector", value)} className="sr-only" />
              <div className="flex items-start gap-4">
                <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${selected ? "bg-violet-400/20 text-violet-200" : "bg-[var(--panel-soft)] text-slate-400"}`}><Icon className="size-5" /></span>
                <span>
                  <span className="block font-medium">{title}</span>
                  <span className="mt-2 block text-xs leading-5 text-[var(--muted)]">{description}</span>
                </span>
                {selected ? <Check className="ml-auto size-4 shrink-0 text-violet-300" /> : null}
              </div>
            </label>
          );
        })}
      </fieldset>
    </div>
  );
}

function CompanyStep({ draft, update }: StepProps) {
  return (
    <div>
      <StepHeading eyebrow="VOTRE ENTREPRISE" title="Quelle est la taille de votre équipe ?" description="Deux chiffres suffisent pour comprendre la part du terrain dans votre organisation." />
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <NumberField icon={UsersRound} label="Salariés" hint="Effectif total actuel" name="employees" value={draft.employees} min={1} max={500} onChange={(value) => update("employees", value)} />
        <NumberField icon={Wrench} label="Techniciens / personnes terrain" hint="Inclus dans l’effectif total" name="technicians" value={draft.technicians} min={0} max={500} onChange={(value) => update("technicians", value)} />
      </div>
    </div>
  );
}

function OperationsStep({ draft, update }: StepProps) {
  return (
    <div>
      <StepHeading eyebrow="VOTRE FONCTIONNEMENT" title="Quelques chiffres pour cadrer le potentiel." description="Utilisez une moyenne récente. Une estimation raisonnable suffit ; aucune donnée externe ne sera ajoutée." />
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <NumberField icon={ClipboardList} label="Demandes par mois" hint="Nouvelles demandes reçues" name="monthlyRequests" value={draft.monthlyRequests} min={0} max={10000} onChange={(value) => update("monthlyRequests", value)} />
        <NumberField icon={LineChart} label="Devis par mois" hint="Devis créés en moyenne" name="monthlyQuotes" value={draft.monthlyQuotes} min={0} max={10000} onChange={(value) => update("monthlyQuotes", value)} />
        <NumberField icon={Building2} label="Montant moyen d’un devis" hint="En euros, hors taxes" name="averageQuoteAmount" value={draft.averageQuoteAmount} min={0} max={10000000} suffix="€" onChange={(value) => update("averageQuoteAmount", value)} />
        <NumberField icon={LineChart} label="Marge approximative" hint="Pourcentage indicatif" name="approximateMarginPercent" value={draft.approximateMarginPercent} min={0} max={100} step="0.1" suffix="%" onChange={(value) => update("approximateMarginPercent", value)} />
        <NumberField icon={Settings2} label="Temps administratif par semaine" hint="Pour l’ensemble de l’équipe" name="weeklyAdminHours" value={draft.weeklyAdminHours} min={0} max={500} step="0.5" suffix="h" className="md:col-span-2" onChange={(value) => update("weeklyAdminHours", value)} />
      </div>
    </div>
  );
}

function NumberField({ icon: Icon, label, hint, name, value, min, max, step = "1", suffix, className = "", onChange }: {
  icon: LucideIcon;
  label: string;
  hint: string;
  name: string;
  value: string;
  min: number;
  max: number;
  step?: string;
  suffix?: string;
  className?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className={`block rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 transition focus-within:border-[var(--brand-soft)] focus-within:ring-2 focus-within:ring-violet-400/15 ${className}`}>
      <span className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--panel-soft)] text-violet-300"><Icon className="size-4" /></span>
        <span>
          <span className="block text-sm font-medium text-slate-200">{label}</span>
          <span className="mt-1 block text-xs text-[var(--muted)]">{hint}</span>
        </span>
      </span>
      <span className="mt-4 flex items-center rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 focus-within:border-[var(--brand-soft)]">
        <input required aria-label={label} inputMode="decimal" min={min} max={max} name={name} step={step} type="number" value={value} onInput={(event) => onChange(event.currentTarget.value)} className="min-w-0 flex-1 bg-transparent py-3 text-lg font-medium text-white outline-none" />
        {suffix ? <span className="text-sm text-[var(--muted)]">{suffix}</span> : null}
      </span>
    </label>
  );
}

type StepProps = {
  draft: DiagnosticDraft;
  update: (field: keyof DiagnosticDraft, value: string | DiagnosticSector) => void;
};

function toDiagnosticInput(draft: DiagnosticDraft): Record<string, unknown> {
  return {
    sector: draft.sector,
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
  return value.trim() === "" ? Number.NaN : Number(value);
}
