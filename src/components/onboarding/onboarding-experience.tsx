"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { SesiraLogo } from "@/components/sesira/logo";
import type { OnboardingDraft } from "@/lib/core/ui-contracts";

type DraftKey = keyof OnboardingDraft;
type Field = {
  key: DraftKey;
  label: string;
  placeholder: string;
  type?: "text" | "email";
  required?: boolean;
};

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
    title: "Commençons par l'entreprise.",
    description: "Ces informations donnent à SESIRA le bon contexte pour organiser le reste.",
    fields: [
      { key: "companyName", label: "Nom de l'entreprise", placeholder: "Ex. Maison K", required: true },
      { key: "industry", label: "Secteur d'activité", placeholder: "Ex. Services B2B" },
    ],
  },
  {
    name: "Équipe",
    kicker: "Les personnes",
    title: "Qui travaille avec vous ?",
    description: "Invitez plus tard ou préparez simplement la structure maintenant.",
    fields: [
      { key: "teamSize", label: "Taille de l'équipe", placeholder: "Ex. 8 personnes" },
      { key: "primaryRole", label: "Rôle principal", placeholder: "Ex. Direction commerciale" },
    ],
  },
  {
    name: "Données",
    kicker: "Votre réalité",
    title: "Où vivent vos données aujourd'hui ?",
    description: "SESIRA ne prétend pas être connecté tant qu'une source réelle ne l'est pas.",
    fields: [
      { key: "primaryTool", label: "Outil principal", placeholder: "Ex. HubSpot, Excel, Notion" },
      { key: "importFormat", label: "Format à importer", placeholder: "Ex. CSV" },
    ],
  },
  {
    name: "E-mail",
    kicker: "Le contexte",
    title: "Reliez votre messagerie.",
    description: "La connexion réelle sera effectuée par le core SESIRA. Cette UI ne simule aucun accès.",
    fields: [
      { key: "emailProvider", label: "Fournisseur e-mail", placeholder: "Ex. Google Workspace" },
      { key: "professionalEmail", label: "Adresse professionnelle", placeholder: "vous@entreprise.com", type: "email" },
    ],
  },
  {
    name: "Suivi",
    kicker: "Les relances",
    title: "Définissez votre rythme de suivi.",
    description: "Choisissez une règle de travail ; l'automatisation sera activée uniquement lorsque le backend la supportera.",
    fields: [
      { key: "followUpDelay", label: "Délai de relance", placeholder: "Ex. 3 jours" },
      { key: "defaultOwner", label: "Responsable par défaut", placeholder: "Ex. Moi" },
    ],
  },
  {
    name: "Observation",
    kicker: "Avant d'automatiser",
    title: "SESIRA observe d'abord.",
    description: "Le système doit comprendre votre manière de travailler avant de proposer des automatisations.",
    fields: [
      { key: "observationPeriod", label: "Période d'observation", placeholder: "Ex. 14 jours" },
      { key: "primaryGoal", label: "Objectif principal", placeholder: "Ex. Réduire les relances oubliées" },
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

export function OnboardingExperience() {
  const [step, setStep] = useState(0);
  const [furthestStep, setFurthestStep] = useState(0);
  const [draft, setDraft] = useState<OnboardingDraft>(EMPTY_DRAFT);
  const [readyToSave, setReadyToSave] = useState(false);
  const current = steps[step];

  const completedFields = useMemo(
    () => Object.values(draft).filter((value) => value.trim().length > 0).length,
    [draft],
  );

  function updateField(key: DraftKey, value: string) {
    setDraft((previous) => ({ ...previous, [key]: value }));
    setReadyToSave(false);
  }

  function next(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step < steps.length - 1) {
      const nextStep = step + 1;
      setStep(nextStep);
      setFurthestStep((previous) => Math.max(previous, nextStep));
      return;
    }
    setReadyToSave(true);
  }

  function goToStep(index: number) {
    if (index <= furthestStep) {
      setStep(index);
      setReadyToSave(false);
    }
  }

  return (
    <main className="onboarding-frame">
      <aside className="onboarding-rail">
        <SesiraLogo />
        <div className="onboarding-progress-label">Configuration <strong>{step + 1}/{steps.length}</strong></div>
        <nav aria-label="Étapes de configuration">
          {steps.map((item, index) => (
            <button
              key={item.name}
              type="button"
              onClick={() => goToStep(index)}
              disabled={index > furthestStep}
              className={index === step ? "active" : index < step ? "done" : ""}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>{item.name}
            </button>
          ))}
        </nav>
        <Link href="/app" className="text-link">Quitter la configuration</Link>
      </aside>

      <section className="onboarding-stage">
        <header className="onboarding-mobile-head"><SesiraLogo /><span>{step + 1} / {steps.length}</span></header>
        <div className="onboarding-card">
          {readyToSave ? (
            <div className="completion-state">
              <span className="eyebrow">PRÊT POUR LE CORE · {completedFields}/12 CHAMPS RENSEIGNÉS</span>
              <h1>La configuration est prête à être enregistrée.</h1>
              <p>Votre saisie a été conservée dans l'interface pendant ce parcours. Aucun backend n'a été appelé : Claude Code pourra brancher <code>saveOnboardingDraft</code> sur le core SESIRA.</p>
              <div className="onboarding-actions">
                <button type="button" className="button ghost" onClick={() => { setStep(steps.length - 1); setReadyToSave(false); }}>Modifier</button>
                <Link href="/app" className="button primary">Retour à la vue d'ensemble</Link>
              </div>
            </div>
          ) : (
            <>
              <div className="eyebrow">{String(step + 1).padStart(2, "0")} · {current.kicker}</div>
              <h1>{current.title}</h1>
              <p>{current.description}</p>
              <form className="onboarding-form" onSubmit={next}>
                {current.fields.map((field) => (
                  <label key={field.key}>
                    <span>{field.label}</span>
                    <input
                      name={field.key}
                      type={field.type ?? "text"}
                      value={draft[field.key]}
                      onChange={(event) => updateField(field.key, event.target.value)}
                      placeholder={field.placeholder}
                      required={field.required}
                      autoComplete={field.key === "professionalEmail" ? "email" : "off"}
                    />
                  </label>
                ))}
                <div className="onboarding-actions">
                  <button type="button" className="button ghost" onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0}>Retour</button>
                  <button type="submit" className="button primary">{step === steps.length - 1 ? "Vérifier" : "Continuer"}</button>
                </div>
              </form>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
