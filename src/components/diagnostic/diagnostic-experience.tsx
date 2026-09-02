"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { SesiraLogo } from "@/components/sesira/logo";
import { calculateDiagnostic } from "@/lib/diagnostic/calculator";
import type { DiagnosticInput, DiagnosticSector } from "@/lib/diagnostic/contracts";
import { diagnosticInputSchema } from "@/lib/diagnostic/schema";

type QuickStep = 1 | 2 | 3;
type Mode = "quick" | "quick-result" | "detail-company" | "detail-operations" | "results";
type CompanyBand = "MICRO" | "SMALL" | "GROWING" | "STRUCTURED";
type Friction = "FOLLOWUP" | "INBOX" | "QUOTES" | "ADMIN" | "VISIBILITY";

type Draft = {
  sector: DiagnosticSector | null;
  companyBand: CompanyBand | null;
  friction: Friction | null;
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
  companyBand: null,
  friction: null,
  employees: "",
  technicians: "",
  monthlyRequests: "",
  monthlyQuotes: "",
  averageQuoteAmount: "",
  approximateMarginPercent: "",
  weeklyAdminHours: "",
};

const QUICK_STEPS = ["Activité", "Taille", "Friction", "Lecture"] as const;

const SECTORS: Array<{ value: DiagnosticSector; title: string; copy: string }> = [
  { value: "CVC", title: "Chauffage et climatisation", copy: "Installation, entretien, dépannage et contrats CVC." },
  { value: "SOLAR", title: "Solaire et photovoltaïque", copy: "Études, installation, maintenance et interventions." },
  { value: "TECHNICAL_SERVICES", title: "Services techniques", copy: "Maintenance, interventions et prestations récurrentes." },
  { value: "CONSTRUCTION", title: "Construction et rénovation", copy: "Chantiers, coordination, rénovation et suivi client." },
];

const COMPANY_BANDS: Array<{ value: CompanyBand; title: string; copy: string; employees: number }> = [
  { value: "MICRO", title: "1 à 9 personnes", copy: "Une petite équipe où beaucoup de choses passent encore directement par les dirigeants.", employees: 5 },
  { value: "SMALL", title: "10 à 29 personnes", copy: "Le volume commence à rendre le suivi plus difficile à tenir uniquement de mémoire.", employees: 20 },
  { value: "GROWING", title: "30 à 99 personnes", copy: "Plusieurs équipes, davantage de transmissions et plus de risques de perte de contexte.", employees: 60 },
  { value: "STRUCTURED", title: "100 à 500 personnes", copy: "Le pilotage dépend fortement de la qualité des systèmes et des responsabilités.", employees: 180 },
];

const FRICTIONS: Array<{ value: Friction; title: string; copy: string }> = [
  { value: "FOLLOWUP", title: "Les relances", copy: "Des prospects, devis ou clients ne sont pas toujours relancés au bon moment." },
  { value: "INBOX", title: "Les demandes qui se dispersent", copy: "Des informations importantes restent dans les emails, messages ou conversations." },
  { value: "QUOTES", title: "Le suivi des devis", copy: "Vous manquez de visibilité entre devis envoyé, réponse, relance et décision." },
  { value: "ADMIN", title: "La coordination et l’administratif", copy: "Trop de temps part dans les rappels, vérifications, doubles saisies et transmissions." },
  { value: "VISIBILITY", title: "Savoir ce qui mérite votre attention", copy: "Vous avez les données mais pas toujours une vue claire de ce qui doit être traité maintenant." },
];

const QUICK_INSIGHTS: Record<Friction, { title: string; copy: string; actions: [string, string, string] }> = {
  FOLLOWUP: {
    title: "Votre premier risque est probablement le suivi commercial.",
    copy: "Quand les relances reposent sur des rappels personnels, la performance dépend davantage de la mémoire des équipes que du système. SESIRA doit ici rendre visible chaque prochaine action et détecter ce qui risque d’être oublié.",
    actions: ["Centraliser les prochaines actions", "Détecter automatiquement les relances en retard", "Garder le contexte client avec chaque devis"],
  },
  INBOX: {
    title: "Votre premier risque est probablement la perte de contexte.",
    copy: "Une demande peut être reçue correctement et malgré tout se perdre entre une boite email, un message et un outil métier. SESIRA doit ici transformer les signaux dispersés en éléments visibles et actionnables.",
    actions: ["Rassembler les demandes importantes", "Relier messages, clients et actions", "Faire remonter ce qui reste sans réponse"],
  },
  QUOTES: {
    title: "Votre premier risque est probablement ce qui arrive après l’envoi du devis.",
    copy: "Créer un devis n’est qu’une étape. La valeur se perd souvent dans les jours qui suivent quand personne ne sait clairement quoi relancer, quand et pourquoi. SESIRA doit ici rendre le cycle du devis lisible de bout en bout.",
    actions: ["Voir les devis qui nécessitent une action", "Conserver l’historique de suivi", "Préparer les relances au bon moment"],
  },
  ADMIN: {
    title: "Votre premier risque est probablement la coordination invisible.",
    copy: "Quand une équipe grandit, une partie du travail devient du contrôle du travail lui même. SESIRA doit réduire ces vérifications répétitives et remettre les exceptions importantes devant les bonnes personnes.",
    actions: ["Réduire les doubles vérifications", "Automatiser les rappels répétitifs", "Escalader seulement les exceptions utiles"],
  },
  VISIBILITY: {
    title: "Votre premier risque est probablement le bruit opérationnel.",
    copy: "Avoir plus de données ne garantit pas de mieux décider. SESIRA doit ici réduire le nombre de choses à regarder et faire ressortir les quelques situations qui méritent réellement une décision humaine.",
    actions: ["Prioriser ce qui nécessite une décision", "Réunir les signaux dans une seule vue", "Expliquer pourquoi une action remonte"],
  },
};

export function DiagnosticExperience() {
  const [mode, setMode] = useState<Mode>("quick");
  const [quickStep, setQuickStep] = useState<QuickStep>(1);
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

  function chooseSector(value: DiagnosticSector) {
    update("sector", value);
    setQuickStep(2);
    window.scrollTo({ top: 160, behavior: "smooth" });
  }

  function chooseCompanyBand(band: (typeof COMPANY_BANDS)[number]) {
    setDraft((current) => ({ ...current, companyBand: band.value, employees: String(band.employees) }));
    setError(null);
    setQuickStep(3);
    window.scrollTo({ top: 160, behavior: "smooth" });
  }

  function chooseFriction(value: Friction) {
    update("friction", value);
    setMode("quick-result");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function backQuick() {
    setError(null);
    setQuickStep((current) => Math.max(1, current - 1) as QuickStep);
  }

  function startDetail() {
    setMode("detail-company");
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function nextDetailCompany() {
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
    setError(null);
    setMode("detail-operations");
  }

  function finishDetail() {
    const parsed = diagnosticInputSchema.safeParse(toInput(draft));
    if (!parsed.success) {
      setError("Vérifiez les volumes, le montant moyen, la marge et le temps administratif indiqués.");
      return;
    }
    setCompletedInput(parsed.data);
    setMode("results");
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function restart() {
    setDraft(INITIAL_DRAFT);
    setCompletedInput(null);
    setError(null);
    setQuickStep(1);
    setMode("quick");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const progressIndex = mode === "quick-result" || mode === "detail-company" || mode === "detail-operations" || mode === "results" ? 4 : quickStep;

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
          <span className="eyebrow">PRÉDIAGNOSTIC · 3 CLICS</span>
          <h1>Où votre entreprise<br /><em>perd elle le fil&nbsp;?</em></h1>
        </div>
        <p>
          Commencez par une lecture rapide sans saisir de chiffres. Trois choix suffisent pour identifier le premier point à examiner. Vous pourrez ensuite affiner uniquement si vous le souhaitez.
        </p>
      </section>

      <div className="diagnostic-progress" aria-label="Progression du diagnostic">
        {QUICK_STEPS.map((label, index) => {
          const number = index + 1;
          const state = number === progressIndex ? "active" : number < progressIndex ? "done" : "pending";
          return (
            <div className={`diagnostic-progress-item ${state}`} key={label}>
              <span>{String(number).padStart(2, "0")}</span>
              <strong>{label}</strong>
            </div>
          );
        })}
      </div>

      {mode === "quick-result" && draft.sector && draft.companyBand && draft.friction ? (
        <QuickResult draft={draft} onRefine={startDetail} onRestart={restart} />
      ) : mode === "results" && result && completedInput ? (
        <Results input={completedInput} result={result} onEdit={() => setMode("detail-operations")} onRestart={restart} />
      ) : mode === "detail-company" || mode === "detail-operations" ? (
        <section className="diagnostic-workspace">
          <div className="diagnostic-card">
            {mode === "detail-company" ? <CompanyStep draft={draft} update={update} /> : null}
            {mode === "detail-operations" ? <OperationsStep draft={draft} update={update} /> : null}
            {error ? <p className="diagnostic-error" role="alert">{error}</p> : null}
            <div className="diagnostic-actions">
              <button className="button ghost" type="button" onClick={() => mode === "detail-company" ? setMode("quick-result") : setMode("detail-company")}>Retour</button>
              <button className="button primary" type="button" onClick={mode === "detail-company" ? nextDetailCompany : finishDetail}>
                {mode === "detail-company" ? "Continuer" : "Calculer avec mes chiffres"}
              </button>
            </div>
          </div>
          <aside className="diagnostic-aside">
            <span className="eyebrow">AFFINER · FACULTATIF</span>
            <h2>Plus précis,<br />seulement si utile.</h2>
            <p>Cette partie sert uniquement à calculer des ordres de grandeur financiers à partir de vos propres chiffres. Le prédiagnostic reste disponible sans elle.</p>
            <div className="diagnostic-rule-list">
              <span>01</span><p>Le résultat rapide est déjà acquis</p>
              <span>02</span><p>Aucun compte requis pour continuer</p>
              <span>03</span><p>Vos réponses restent dans le navigateur</p>
              <span>04</span><p>Les scénarios restent indicatifs</p>
            </div>
          </aside>
        </section>
      ) : (
        <section className="diagnostic-workspace">
          <div className="diagnostic-card">
            {quickStep === 1 ? <ActivityStep draft={draft} onSelect={chooseSector} /> : null}
            {quickStep === 2 ? <CompanyBandStep draft={draft} onSelect={chooseCompanyBand} /> : null}
            {quickStep === 3 ? <FrictionStep draft={draft} onSelect={chooseFriction} /> : null}
            {error ? <p className="diagnostic-error" role="alert">{error}</p> : null}
            {quickStep > 1 ? (
              <div className="diagnostic-actions">
                <button className="button ghost" type="button" onClick={backQuick}>Retour</button>
                <span className="eyebrow">UN CHOIX SUFFIT POUR CONTINUER</span>
              </div>
            ) : null}
          </div>

          <aside className="diagnostic-aside">
            <span className="eyebrow">POURQUOI 3 CLICS</span>
            <h2>La valeur<br />avant le formulaire.</h2>
            <p>Le prédiagnostic ne vous demande aucun chiffre exact. Il sert à orienter rapidement l’analyse avant de vous proposer, si nécessaire, une version plus précise.</p>
            <div className="diagnostic-rule-list">
              <span>01</span><p>Aucune longue saisie au départ</p>
              <span>02</span><p>Aucun benchmark caché</p>
              <span>03</span><p>Une première lecture immédiatement</p>
              <span>04</span><p>Les chiffres détaillés restent facultatifs</p>
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

function ActivityStep({ draft, onSelect }: { draft: Draft; onSelect: (value: DiagnosticSector) => void }) {
  return (
    <div>
      <StepHead index="01" title="Votre activité" copy="Un clic. Choisissez simplement l’environnement qui ressemble le plus à votre entreprise." />
      <div className="diagnostic-choice-grid">
        {SECTORS.map((sector) => {
          const selected = draft.sector === sector.value;
          return (
            <button className={`diagnostic-choice ${selected ? "selected" : ""}`} type="button" key={sector.value} onClick={() => onSelect(sector.value)}>
              <span className="diagnostic-choice-index">{selected ? "●" : "○"}</span>
              <strong>{sector.title}</strong>
              <p>{sector.copy}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CompanyBandStep({ draft, onSelect }: { draft: Draft; onSelect: (band: (typeof COMPANY_BANDS)[number]) => void }) {
  return (
    <div>
      <StepHead index="02" title="Quelle taille fait votre équipe ?" copy="Pas besoin du chiffre exact. Choisissez simplement une tranche." />
      <div className="diagnostic-choice-grid">
        {COMPANY_BANDS.map((band) => {
          const selected = draft.companyBand === band.value;
          return (
            <button className={`diagnostic-choice ${selected ? "selected" : ""}`} type="button" key={band.value} onClick={() => onSelect(band)}>
              <span className="diagnostic-choice-index">{selected ? "●" : "○"}</span>
              <strong>{band.title}</strong>
              <p>{band.copy}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FrictionStep({ draft, onSelect }: { draft: Draft; onSelect: (value: Friction) => void }) {
  return (
    <div>
      <StepHead index="03" title="Qu’est ce qui vous agace le plus aujourd’hui ?" copy="Choisissez le problème qui ressemble le plus à votre quotidien. Vous obtenez votre première lecture juste après ce clic." />
      <div className="diagnostic-choice-grid">
        {FRICTIONS.map((friction) => {
          const selected = draft.friction === friction.value;
          return (
            <button className={`diagnostic-choice ${selected ? "selected" : ""}`} type="button" key={friction.value} onClick={() => onSelect(friction.value)}>
              <span className="diagnostic-choice-index">{selected ? "●" : "○"}</span>
              <strong>{friction.title}</strong>
              <p>{friction.copy}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function QuickResult({ draft, onRefine, onRestart }: { draft: Draft; onRefine: () => void; onRestart: () => void }) {
  const insight = QUICK_INSIGHTS[draft.friction as Friction];
  return (
    <section className="diagnostic-results">
      <div className="diagnostic-results-head">
        <div>
          <span className="eyebrow">VOTRE PREMIÈRE LECTURE</span>
          <h2>{insight.title}</h2>
        </div>
        <div className="diagnostic-summary">
          <div><span>Activité</span><strong>{sectorLabel(draft.sector as DiagnosticSector)}</strong></div>
          <div><span>Taille</span><strong>{companyBandLabel(draft.companyBand as CompanyBand)}</strong></div>
        </div>
      </div>

      <div className="diagnostic-priority-grid">
        <article>
          <span className="eyebrow">CE QUE CELA SIGNIFIE</span>
          <h3>Le problème n’est pas forcément le volume. C’est la continuité.</h3>
          <p>{insight.copy}</p>
          <small>Cette lecture est qualitative et repose uniquement sur les trois choix que vous venez de faire.</small>
        </article>
        {insight.actions.map((action, index) => (
          <article key={action}>
            <span className="eyebrow">À REGARDER {String(index + 1).padStart(2, "0")}</span>
            <h3>{action}</h3>
            <p>SESIRA peut structurer ce point sans vous demander de remplacer tout votre fonctionnement actuel.</p>
          </article>
        ))}
      </div>

      <div className="diagnostic-result-actions">
        <div>
          <span className="eyebrow">VOUS AVEZ DÉJÀ LE RÉSULTAT RAPIDE</span>
          <h3>Vous voulez aller plus loin&nbsp;?<br />Les chiffres deviennent facultatifs.</h3>
        </div>
        <div>
          <button className="button ghost" type="button" onClick={onRestart}>Recommencer</button>
          <button className="button ghost" type="button" onClick={onRefine}>Affiner avec mes chiffres</button>
          <Link className="button primary" href="/login">Découvrir SESIRA</Link>
        </div>
      </div>
    </section>
  );
}

function CompanyStep({ draft, update }: StepProps) {
  return (
    <div>
      <StepHead index="A" title="Affiner la taille" copy="Votre tranche a déjà prérempli une estimation d’effectif. Corrigez uniquement si vous connaissez le chiffre exact." />
      <div className="diagnostic-field-grid two">
        <NumberField label="Effectif total" name="employees" value={draft.employees} min={1} max={500} hint="Prérempli à partir de votre tranche" onChange={(value) => update("employees", value)} />
        <NumberField label="Personnes terrain" name="technicians" value={draft.technicians} min={0} max={500} hint="Techniciens ou équipes d’intervention" onChange={(value) => update("technicians", value)} />
      </div>
    </div>
  );
}

function OperationsStep({ draft, update }: StepProps) {
  return (
    <div>
      <StepHead index="B" title="Affiner le fonctionnement" copy="Cette étape est facultative. Une estimation raisonnable suffit pour calculer des ordres de grandeur." />
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
          <span className="eyebrow">DIAGNOSTIC AFFINÉ</span>
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
          <Link className="button primary" href="/login">Découvrir SESIRA</Link>
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

function companyBandLabel(band: CompanyBand) {
  return COMPANY_BANDS.find((item) => item.value === band)?.title ?? band;
}
