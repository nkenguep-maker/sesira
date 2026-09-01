"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { SesiraLogo } from "@/components/sesira/logo";

const steps = [
  { name: "Entreprise", kicker: "Votre base", title: "Commençons par l'entreprise.", description: "Ces informations donnent à SESIRA le bon contexte pour organiser le reste.", fields: ["Nom de l'entreprise", "Secteur d'activité"] },
  { name: "Équipe", kicker: "Les personnes", title: "Qui travaille avec vous ?", description: "Invitez plus tard ou préparez simplement la structure maintenant.", fields: ["Taille de l'équipe", "Rôle principal"] },
  { name: "Données", kicker: "Votre réalité", title: "Où vivent vos données aujourd'hui ?", description: "SESIRA ne prétend pas être connecté tant qu'une source réelle ne l'est pas.", fields: ["Outil principal", "Format à importer"] },
  { name: "E-mail", kicker: "Le contexte", title: "Reliez votre messagerie.", description: "La connexion réelle sera effectuée par l'intégration du core. Cette UI ne simule aucun accès.", fields: ["Fournisseur e-mail", "Adresse professionnelle"] },
  { name: "Suivi", kicker: "Les relances", title: "Définissez votre rythme de suivi.", description: "Choisissez une règle de travail ; l'automatisation sera activée uniquement lorsque le backend la supportera.", fields: ["Délai de relance", "Responsable par défaut"] },
  { name: "Observation", kicker: "Avant d'automatiser", title: "SESIRA observe d'abord.", description: "Le système doit comprendre votre manière de travailler avant de proposer des automatisations.", fields: ["Période d'observation", "Objectif principal"] },
] as const;

export function OnboardingExperience() {
  const [step, setStep] = useState(0);
  const [saved, setSaved] = useState(false);
  const current = steps[step];

  function next(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step < steps.length - 1) setStep(step + 1);
    else setSaved(true);
  }

  return (
    <main className="onboarding-frame">
      <aside className="onboarding-rail">
        <SesiraLogo />
        <div className="onboarding-progress-label">Configuration <strong>{step + 1}/{steps.length}</strong></div>
        <nav aria-label="Étapes de configuration">
          {steps.map((item, index) => (
            <button key={item.name} onClick={() => { setStep(index); setSaved(false); }} className={index === step ? "active" : index < step ? "done" : ""}>
              <span>{String(index + 1).padStart(2, "0")}</span>{item.name}
            </button>
          ))}
        </nav>
        <Link href="/app" className="text-link">Quitter la configuration</Link>
      </aside>
      <section className="onboarding-stage">
        <header className="onboarding-mobile-head"><SesiraLogo /><span>{step + 1} / {steps.length}</span></header>
        <div className="onboarding-card">
          {saved ? (
            <div className="completion-state">
              <span className="eyebrow">CONFIGURATION UI TERMINÉE</span>
              <h1>La structure est prête.</h1>
              <p>Les données n'ont pas été enregistrées dans un backend depuis cette version UI. Branchez le core SESIRA pour persister cette configuration.</p>
              <Link href="/app" className="button primary">Aller à la vue d'ensemble</Link>
            </div>
          ) : (
            <>
              <div className="eyebrow">{String(step + 1).padStart(2, "0")} · {current.kicker}</div>
              <h1>{current.title}</h1>
              <p>{current.description}</p>
              <form className="onboarding-form" onSubmit={next}>
                {current.fields.map((field, index) => (
                  <label key={field}><span>{field}</span><input name={`field-${index}`} placeholder="À renseigner" required={index === 0 && step === 0} /></label>
                ))}
                <div className="onboarding-actions">
                  <button type="button" className="button ghost" onClick={() => step > 0 && setStep(step - 1)} disabled={step === 0}>Retour</button>
                  <button type="submit" className="button primary">{step === steps.length - 1 ? "Terminer" : "Continuer"}</button>
                </div>
              </form>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
