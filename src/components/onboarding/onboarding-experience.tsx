"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState, useTransition } from "react";

import { saveOnboardingDraftAction } from "@/app/app/onboarding/actions";
import { SesiraLogo } from "@/components/sesira/logo";
import type { OnboardingDraft } from "@/lib/core/ui-contracts";

type DraftKey = keyof OnboardingDraft;
type Field = {
  key: DraftKey;
  label: string;
  placeholder: string;
  hint: string;
  type?: "text" | "email";
  required?: boolean;
};

type SaveState = { kind: "idle" | "saved" | "error"; message?: string };

const steps: Array<{
  name: string;
  kicker: string;
  title: string;
  description: string;
  fields: Field[];
}> = [
  {
    name: "Entreprise",
    kicker: "Votre base",
    title: "Bienvenue dans SESIRA.",
    description: "Commençons par le contexte nécessaire pour organiser votre espace sans vous demander de tout configurer d’un coup.",
    fields: [
      { key: "companyName", label: "Nom de l’entreprise", placeholder: "Ex. Maison K", hint: "Le nom utilisé dans votre espace SESIRA.", required: true },
      { key: "industry", label: "Activité principale", placeholder: "Ex. Installation et maintenance CVC", hint: "Votre métier principal, avec vos propres mots." },
    ],
  },
  {
    name: "Équipe",
    kicker: "Les personnes",
    title: "Qui porte les dossiers ?",
    description: "SESIRA doit comprendre la taille et la responsabilité de l’équipe avant de proposer du suivi.",
    fields: [
      { key: "teamSize", label: "Taille de l’équipe", placeholder: "Ex. 15 personnes", hint: "Une estimation suffit pour commencer." },
      { key: "primaryRole", label: "Rôle principal", placeholder: "Ex. Direction", hint: "La fonction qui utilisera le plus souvent SESIRA." },
    ],
  },
  {
    name: "Données",
    kicker: "Votre réalité",
    title: "Où vivent vos données aujourd’hui ?",
    description: "SESIRA ne prétend jamais être connecté à une source qui ne l’est pas réellement.",
    fields: [
      { key: "primaryTool", label: "Outil principal", placeholder: "Ex. Excel, logiciel métier, HubSpot", hint: "L’endroit où votre équipe cherche l’information aujourd’hui." },
      { key: "importFormat", label: "Format à importer", placeholder: "Ex. CSV", hint: "Le premier format que vous souhaitez reprendre." },
    ],
  },
  {
    name: "Email",
    kicker: "Le contexte",
    title: "Préparez votre messagerie.",
    description: "Une adresse connectée donne du contexte à SESIRA. Elle ne lui donne pas automatiquement le droit d’envoyer.",
    fields: [
      { key: "emailProvider", label: "Service email", placeholder: "Ex. Google Workspace", hint: "Microsoft 365, Gmail ou autre environnement professionnel." },
      { key: "professionalEmail", label: "Adresse professionnelle", placeholder: "vous@entreprise.com", hint: "La connexion de la messagerie se fait ensuite dans Connexions.", type: "email" },
    ],
  },
  {
    name: "Suivi",
    kicker: "Les relances",
    title: "Définissez votre manière de suivre.",
    description: "Le rythme de suivi est une règle métier. L’automatisation vient seulement après l’observation.",
    fields: [
      { key: "followUpDelay", label: "Délai de relance", placeholder: "Ex. 3 jours", hint: "Votre délai habituel avant une première relance." },
      { key: "defaultOwner", label: "Responsable par défaut", placeholder: "Ex. Moi", hint: "La personne qui garde la décision finale." },
    ],
  },
  {
    name: "Observation",
    kicker: "Avant d’agir",
    title: "SESIRA observe d’abord.",
    description: "Le système doit comprendre votre fonctionnement avant de proposer ou d’exécuter une action.",
    fields: [
      { key: "observationPeriod", label: "Période d’observation", placeholder: "Ex. 14 jours", hint: "Une période suffisante pour voir vos habitudes réelles." },
      { key: "primaryGoal", label: "Objectif principal", placeholder: "Ex. Réduire les devis oubliés", hint: "Le problème que vous voulez rendre visible en premier." },
    ],
  },
];

const EMPTY_DRAFT: OnboardingDraft = {
  companyName: "",
  industry: "",
  teamSize: "",
  primaryRole: "",
  primaryTool: "",
  importFormat: "",
  emailProvider: "",
  professionalEmail: "",
  followUpDelay: "",
  defaultOwner: "",
  observationPeriod: "",
  primaryGoal: "",
};

const MODE_PREVIEW = [
  ["01", "Observation", "SESIRA regarde ce qui se passe. Aucune action externe."],
  ["02", "Prépare", "SESIRA prépare ce qu’il aurait fait, sans envoyer."],
  ["03", "Vous validez", "Votre équipe valide, modifie ou refuse avant envoi."],
  ["04", "Automatique", "Uniquement pour les cas simples que vous avez autorisés."],
] as const;

export function OnboardingExperience({
  initialDraft,
  canSave,
}: {
  initialDraft: Partial<OnboardingDraft> | null;
  canSave: boolean;
}) {
  const [step, setStep] = useState(0);
  const [furthestStep, setFurthestStep] = useState(0);
  const [draft, setDraft] = useState<OnboardingDraft>({ ...EMPTY_DRAFT, ...(initialDraft ?? {}) });
  const [review, setReview] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>({ kind: initialDraft ? "saved" : "idle" });
  const [isSaving, startSaving] = useTransition();
  const current = steps[step];

  const completedFields = useMemo(() => Object.values(draft).filter((value) => value.trim().length > 0).length, [draft]);
  const stepCompletion = useMemo(() => steps.map((item) => item.fields.every((field) => !field.required || draft[field.key].trim().length > 0)), [draft]);

  function updateField(key: DraftKey, value: string) {
    setDraft((previous) => ({ ...previous, [key]: value }));
    setReview(false);
    setSaveState({ kind: "idle" });
  }

  function next(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step < steps.length - 1) {
      const nextStep = step + 1;
      setStep(nextStep);
      setFurthestStep((previous) => Math.max(previous, nextStep));
      return;
    }
    setReview(true);
  }

  function goToStep(index: number) {
    if (index <= furthestStep) {
      setStep(index);
      setReview(false);
    }
  }

  function save() {
    if (!canSave || isSaving) return;
    setSaveState({ kind: "idle" });
    startSaving(async () => {
      const result = await saveOnboardingDraftAction(draft);
      if (result.ok) {
        setSaveState({ kind: "saved", message: "Configuration enregistrée dans votre espace SESIRA." });
      } else {
        setSaveState({ kind: "error", message: result.error });
      }
    });
  }

  return (
    <main className="onboarding-frame premium-onboarding">
      <aside className="onboarding-rail">
        <SesiraLogo />
        <div className="onboarding-progress-label">Configuration <strong>{step + 1}/{steps.length}</strong></div>
        <nav aria-label="Étapes de configuration">
          {steps.map((item, index) => {
            const visited = index <= furthestStep;
            const status = index === step && !review ? "En cours" : index < step || (review && index === step) ? "Terminé" : visited ? "À faire" : "À venir";
            return (
              <button key={item.name} type="button" onClick={() => goToStep(index)} disabled={!visited} className={index === step && !review ? "active" : index < step || (review && index === step) ? "done" : ""}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <span><strong>{item.name}</strong><small>{status}</small></span>
              </button>
            );
          })}
        </nav>
        <p className="onboarding-rail-note">
          {canSave ? "Vous pouvez enregistrer cette configuration à la dernière étape et la reprendre plus tard." : "Vous pouvez consulter la configuration. Seul un propriétaire ou un administrateur peut l’enregistrer."}
        </p>
        <Link href="/app" className="text-link">Quitter la configuration</Link>
      </aside>

      <section className="onboarding-stage">
        <header className="onboarding-mobile-head"><SesiraLogo /><span>{step + 1} / {steps.length}</span></header>
        <div className="onboarding-card premium-onboarding-card">
          {review ? (
            <ReviewState
              draft={draft}
              completedFields={completedFields}
              onEdit={() => setReview(false)}
              onSave={save}
              canSave={canSave}
              isSaving={isSaving}
              saveState={saveState}
            />
          ) : (
            <>
              <div className="premium-onboarding-heading">
                <span className="eyebrow">{String(step + 1).padStart(2, "0")} · {current.kicker}</span>
                <h1>{current.title}</h1>
                <p>{current.description}</p>
              </div>

              {step === 5 ? <ModePreview /> : null}

              <form className="onboarding-form premium-onboarding-form" onSubmit={next}>
                {current.fields.map((field) => (
                  <label key={field.key}>
                    <span>{field.label}</span>
                    <input name={field.key} type={field.type ?? "text"} value={draft[field.key]} onChange={(event) => updateField(field.key, event.target.value)} placeholder={field.placeholder} required={field.required} autoComplete={field.key === "professionalEmail" ? "email" : "off"} />
                    <small>{field.hint}</small>
                  </label>
                ))}
                <div className="onboarding-actions premium-onboarding-actions">
                  <button type="button" className="button ghost" onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0}>Retour</button>
                  <span>{stepCompletion[step] ? "Étape prête" : step === 0 ? "Nom requis" : "Vous pouvez compléter plus tard"}</span>
                  <button type="submit" className="button primary">{step === steps.length - 1 ? "Vérifier la configuration" : "Continuer"}</button>
                </div>
              </form>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function ModePreview() {
  return (
    <section className="premium-mode-preview" aria-label="Niveaux d’automatisation">
      {MODE_PREVIEW.map(([number, name, copy], index) => (
        <article key={number} className={index === 0 ? "active" : ""}>
          <span>{number}</span><div><strong>{name}</strong><p>{copy}</p>{index === 0 ? <small>Recommandé pour commencer</small> : null}</div>
        </article>
      ))}
    </section>
  );
}

function ReviewState({
  draft,
  completedFields,
  onEdit,
  onSave,
  canSave,
  isSaving,
  saveState,
}: {
  draft: OnboardingDraft;
  completedFields: number;
  onEdit: () => void;
  onSave: () => void;
  canSave: boolean;
  isSaving: boolean;
  saveState: SaveState;
}) {
  const groups = [
    ["Entreprise", draft.companyName || "À compléter", draft.industry || "Activité non indiquée"],
    ["Équipe", draft.teamSize || "À compléter", draft.primaryRole || "Rôle non indiqué"],
    ["Données", draft.primaryTool || "À compléter", draft.importFormat || "Format non indiqué"],
    ["Email", draft.professionalEmail || "À compléter", draft.emailProvider || "Service non indiqué"],
    ["Suivi", draft.followUpDelay || "À compléter", draft.defaultOwner || "Responsable non indiqué"],
    ["Observation", draft.observationPeriod || "À compléter", draft.primaryGoal || "Objectif non indiqué"],
  ] as const;

  return (
    <div className="premium-review-state">
      <span className="eyebrow">VÉRIFICATION · {completedFields}/12 CHAMPS RENSEIGNÉS</span>
      <h1>Votre configuration est prête à être enregistrée.</h1>
      <p>Voici ce que vous avez renseigné. Une adresse email saisie ici ne crée aucune connexion et n’autorise aucun envoi.</p>
      <div className="premium-review-grid">
        {groups.map(([name, value, detail]) => <article key={name}><span>{name}</span><strong>{value}</strong><p>{detail}</p></article>)}
      </div>
      <div className="premium-inline-notice" role={saveState.kind === "error" ? "alert" : undefined}>
        <span className="eyebrow">SAUVEGARDE</span>
        <p>
          {isSaving
            ? "Enregistrement en cours…"
            : saveState.kind === "saved"
              ? saveState.message ?? "Cette configuration est enregistrée dans votre espace SESIRA."
              : saveState.kind === "error"
                ? saveState.message
                : canSave
                  ? "Enregistrez ces réponses pour les retrouver lors de votre prochaine visite."
                  : "Seul un propriétaire ou un administrateur peut modifier cette configuration."}
        </p>
      </div>
      <div className="onboarding-actions premium-onboarding-actions">
        <button type="button" className="button ghost" onClick={onEdit} disabled={isSaving}>Modifier</button>
        {canSave && saveState.kind !== "saved" ? (
          <button type="button" className="button primary" onClick={onSave} disabled={isSaving}>{isSaving ? "Enregistrement…" : "Enregistrer la configuration"}</button>
        ) : (
          <Link href="/app" className="button primary">Retour à l’espace</Link>
        )}
      </div>
    </div>
  );
}
