"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const steps = ["Entreprise", "Équipe", "Données", "E-mail", "Suivi", "Observation"];
type Member = { name: string; role: string; status: string };
type Props = {
  initialStep: number;
  organization: { name: string; sectorKey: string; status: string };
  members: Member[];
  quoteCount: number;
  integrations: Array<{ provider: string; type: string; status: string }>;
};

export function OnboardingExperience({ initialStep, organization, members, quoteCount, integrations }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(initialStep);
  const [companyName, setCompanyName] = useState(organization.name);
  const [activity, setActivity] = useState(organization.sectorKey || "");
  const goToStep = (nextStep: number) => {
    const safeStep = Math.max(1, Math.min(6, nextStep));
    setStep(safeStep);
    router.replace(`/app/onboarding?step=${safeStep}`, { scroll: false });
  };

  return <div className="onboarding"><aside className="onboarding-rail"><Link href="/" className="onboarding-brand">SESIRA<span>.</span></Link><nav aria-label="Étapes de configuration">{steps.map((label, index) => <button key={label} type="button" onClick={() => goToStep(index + 1)} disabled={index + 1 > step} aria-current={step === index + 1 ? "step" : undefined} className={`${step === index + 1 ? "current" : ""} ${index + 1 > step ? "locked" : ""}`}><span>{String(index + 1).padStart(2, "0")}</span><b>{label}</b><small>{index + 1 < step ? "TERMINÉ" : index + 1 === step ? "EN COURS" : "À VENIR"}</small></button>)}</nav><p>Votre étape est conservée dans l’adresse de cette page. Les réglages ne sont enregistrés qu’après une action serveur confirmée.</p></aside><main className="onboarding-main"><div className="onboarding-mobile-head"><span className="onboarding-brand">SESIRA<span>.</span></span><span>{String(step).padStart(2, "0")} / 06</span><div>{steps.map((label, index) => <i key={label} className={index + 1 <= step ? "done" : ""} />)}</div></div><div className="onboarding-content"><StepLabel number={step} name={steps[step - 1]} />{step === 1 ? <CompanyStep name={companyName} setName={setCompanyName} activity={activity} setActivity={setActivity} /> : null}{step === 2 ? <TeamStep members={members} /> : null}{step === 3 ? <DataStep quoteCount={quoteCount} /> : null}{step === 4 ? <EmailStep integrations={integrations} /> : null}{step === 5 ? <FollowStep /> : null}{step === 6 ? <ObservationStep /> : null}<div className="onboarding-actions"><button className="onboarding-secondary" type="button" onClick={() => goToStep(step - 1)} disabled={step === 1}>Retour</button>{step < 6 ? <button className="onboarding-primary" type="button" onClick={() => goToStep(step + 1)} disabled={step === 1 && !companyName.trim()}>Continuer <span>→</span></button> : <Link className="onboarding-primary" href="/app">Ouvrir Sesira <span>→</span></Link>}</div></div></main></div>;
}

function StepLabel({ number, name }: { number: number; name: string }) {
  return <p className="onboarding-step-label">Étape {String(number).padStart(2, "0")} · {name}</p>;
}

function CompanyStep({ name, setName, activity, setActivity }: { name: string; setName: (value: string) => void; activity: string; setActivity: (value: string) => void }) {
  return <section><h1>Bienvenue dans Sesira.</h1><p className="onboarding-lede">Commençons par les informations nécessaires pour configurer votre espace.</p><div className="onboarding-form"><label>Nom de l’entreprise<input value={name} onChange={(event) => setName(event.target.value)} /></label><fieldset><legend>Activité principale</legend><div className="choice-grid">{["Chauffage", "Climatisation", "Pompes à chaleur", "Maintenance", "Multi-activité"].map((item) => <button type="button" key={item} onClick={() => setActivity(item)} className={activity === item ? "selected" : ""} aria-pressed={activity === item}>{item}</button>)}</div></fieldset><div className="onboarding-two-cols"><label>Ville ou zone principale<input placeholder="À renseigner" disabled /></label><label>Taille de l’équipe<select defaultValue="" disabled><option value="">Non disponible</option></select></label></div><p className="onboarding-blocked">La sauvegarde complète de la configuration d’entreprise sera disponible avec l’action serveur d’onboarding. Les valeurs saisies ici ne sont pas encore enregistrées.</p></div></section>;
}

function TeamStep({ members }: { members: Member[] }) {
  return <section><h1>Qui utilisera Sesira&nbsp;?</h1><p className="onboarding-lede">Les décisions importantes peuvent être attribuées à la bonne personne.</p><div className="member-table">{members.length ? members.map((member) => <div key={`${member.name}-${member.role}`}><div><b>{member.name}</b><small>membre de l’équipe</small></div><span>{memberRoleLabel(member.role)}</span><span>{memberStatusLabel(member.status)}</span></div>) : <p>Aucun membre disponible.</p>}</div><div className="onboarding-blocked"><b>Invitations</b><p>L’équipe est affichée en lecture seule. L’invitation de nouveaux membres sera disponible quand l’action existera côté serveur.</p></div></section>;
}

function DataStep({ quoteCount }: { quoteCount: number }) {
  return <section><h1>Ajoutez vos devis actuels.</h1><p className="onboarding-lede">Sesira commence par observer les dossiers qui existent déjà.</p><div className="data-state"><span>ÉTAT DES DONNÉES</span><b>{quoteCount ? `${quoteCount} devis déjà présents` : "Aucun devis importé"}</b><small>{quoteCount ? "Ces données sont disponibles dans votre espace." : "L’import CSV est disponible dans l’écran dédié."}</small></div><div className="onboarding-actions-inline"><Link className="onboarding-primary" href="/app/imports/new">Importer mes devis</Link></div><p className="onboarding-note">Formats acceptés : CSV. Aucun compteur de démonstration n’est affiché.</p></section>;
}

function EmailStep({ integrations }: { integrations: Props["integrations"] }) {
  const connected = integrations.find((integration) => integration.type.toLowerCase().includes("email") && integration.status === "CONNECTED");
  return <section><h1>Connectez l’adresse utilisée pour vos devis.</h1><p className="onboarding-lede">Sesira utilise cette connexion pour reconnaître les échanges liés à vos dossiers.</p><div className="data-state"><span>CONNEXION E-MAIL</span><b>{connected ? "Connectée" : "Non connectée"}</b><small>{connected ? `Fournisseur : ${connected.provider}` : "Aucune connexion e-mail active n’est disponible."}</small></div><Link className="onboarding-primary" href="/app/settings/integrations">Voir les connexions</Link><div className="onboarding-copy"><p>En mode Observation, aucune action externe n’est envoyée.</p><p>La connexion sert au suivi des dossiers et au rattachement des échanges au bon devis.</p></div></section>;
}

function FollowStep() {
  return <section><h1>Comment Sesira doit-il commencer&nbsp;?</h1><p className="onboarding-lede">Quatre niveaux, dans cet ordre. Vous ne passez au suivant que lorsque vous le décidez.</p><div className="levels">{[["01", "Observation", "Sesira lit et signale, sans action externe."], ["02", "Il vous montre", "Sesira prépare une proposition pour votre équipe."], ["03", "Validation", "Votre équipe valide avant toute action."], ["04", "Automatisation contrôlée", "Les règles et limites sont explicitement validées."]].map(([number, title, text], index) => <div key={title} className={index === 0 ? "selected" : ""}><i /><div><b>{number} · {title}</b><span>{text}</span></div><small>{index === 0 ? "ACTUEL" : "À VENIR"}</small></div>)}</div><p className="onboarding-copy">Sesira surveille vos dossiers sans envoyer d’action externe. Vous pourrez passer au niveau suivant lorsque vous aurez observé son comportement.</p></section>;
}

function ObservationStep() {
  return <section><h1>Sesira commence par regarder.</h1><p className="onboarding-lede">Votre espace peut commencer par observer les dossiers selon la configuration disponible.</p><div className="data-state"><span>DÉMARRAGE RECOMMANDÉ</span><b>Observation</b><small>Ce choix n’est pas activé tant que le serveur ne l’a pas confirmé.</small></div><div className="onboarding-blocked"><b>Activation complète</b><p>L’activation persistée sera disponible une fois les contrats d’onboarding et de readiness exposés côté serveur.</p></div></section>;
}

function memberRoleLabel(role: string) {
  return ({ OWNER: "Propriétaire", ADMIN: "Administrateur", MEMBER: "Membre", VIEWER: "Lecture seule" } as Record<string, string>)[role] ?? "Rôle non renseigné";
}

function memberStatusLabel(status: string) {
  return ({ ACTIVE: "Actif", INVITED: "Invité", SUSPENDED: "Suspendu", DISABLED: "Désactivé" } as Record<string, string>)[status] ?? "État non renseigné";
}
