import { CheckCircle2, ShieldCheck } from "lucide-react";

import type { AutomationCard, AutomationLevel } from "@/lib/automations/contracts";

const modeCopy: Record<AutomationLevel, string> = {
  OBSERVATION: "Sesira surveille. Aucune action n’est préparée pour envoi.",
  SHADOW: "Sesira prépare ce qu’il aurait fait. Aucun message n’est envoyé.",
  APPROVAL: "Sesira prépare les actions. Votre équipe les valide, les modifie ou les refuse avant envoi.",
  AUTOMATIC: "Les actions autorisées peuvent être exécutées selon les règles définies. Les décisions sensibles restent humaines.",
};
const modes: AutomationLevel[] = ["OBSERVATION", "SHADOW", "APPROVAL", "AUTOMATIC"];
const modeNames: Record<AutomationLevel, string> = {
  OBSERVATION: "Observation",
  SHADOW: "Il vous montre",
  APPROVAL: "Validation",
  AUTOMATIC: "Automatisation contrôlée",
};
const modeNumbers: Record<AutomationLevel, string> = { OBSERVATION: "01", SHADOW: "02", APPROVAL: "03", AUTOMATIC: "04" };

export function AutomationsScreen({ cards }: { cards: AutomationCard[] }) {
  const current = cards[0]?.level ?? "OBSERVATION";
  const health = cards.length ? cards.every((card) => card.health.tone === "emerald") ? "EN BON ÉTAT" : "À VÉRIFIER" : "INDISPONIBLE";

  return <div className="automation-page"><header className="automation-page-head"><p className="automation-kicker">AUTOMATISATIONS</p><h1>Automatisations</h1><p>Sesira surveille vos processus selon les règles définies avec votre entreprise.</p></header><div className="automation-summary"><Summary label="ACTIVES" value={String(cards.length)} /><Summary label="MODE ACTUEL" value={modeNames[current]} /><Summary label="SANTÉ" value={health} /><Summary label="VALIDATION" value="Indisponible" /></div><section className="automation-mode"><div><p className="automation-label">MODE ACTUEL</p><b className="automation-mode-number">{modeNumbers[current]}</b><h2>{modeNames[current]}</h2><p>{modeCopy[current]}</p></div><div className="automation-levels">{modes.map((level) => <div key={level} className={level === current ? "current" : ""}><span>{modeNumbers[level]}</span><b>{modeNames[level]}</b></div>)}</div></section><section className="automation-safety"><ShieldCheck aria-hidden="true" /><div><b>Aucune action sensible n’est modifiée depuis cet écran.</b><p>Les réglages sont présentés depuis les données de l’organisation. Le changement de mode et la suspension nécessitent une action serveur dédiée.</p></div></section>{cards.length ? <section className="automation-list"><div className="automation-section-head"><div><p className="automation-label">PROCESSUS ACTIFS</p><h2>Relance des devis</h2></div><span>{cards.length} module{cards.length > 1 ? "s" : ""}</span></div>{cards.map((card) => <AutomationCardView key={card.id} card={card} />)}</section> : <EmptyAutomation />}</div>;
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div><span>{label}</span><b>{value}</b></div>;
}

function AutomationCardView({ card }: { card: AutomationCard }) {
  const hasActivity = card.activityAvailable && card.recentActivity.length > 0;
  return <article className="automation-card"><div className="automation-card-main"><div className="automation-card-title"><div><p className="automation-label">RELANCE DES DEVIS</p><h3>{card.title}</h3><p>{card.description}</p></div><span className={`automation-state ${card.health.tone === "emerald" ? "good" : "warn"}`}>{card.status === "ACTIVE" ? "ACTIF" : "INACTIF"}</span></div><div className="automation-facts"><Fact label="MODE" value={modeNames[card.level]} /><Fact label="DOSSIERS SURVEILLÉS" value="Indisponible" /><Fact label="AUJOURD’HUI" value={card.activityAvailable ? String(card.recentActivity.length) : "Indisponible"} /><Fact label="SANTÉ" value={card.health.label === "Stable" ? "EN BON ÉTAT" : card.health.label.toUpperCase()} /></div>{hasActivity ? <section className="automation-activity"><p className="automation-label">ACTIVITÉ RÉCENTE</p><ul>{card.recentActivity.map((activity) => <li key={activity.id}><span>{activity.date}</span><b>{activity.label}</b></li>)}</ul></section> : <p className="automation-muted">{card.activityAvailable ? "Aucune activité réelle enregistrée." : "Activité temporairement indisponible."}</p>}</div><aside className="automation-card-side"><p className="automation-label">CE QUE SESIRA PEUT FAIRE</p><p>{card.allowedAction}</p><div><p className="automation-label">TOUJOURS DÉCIDÉ PAR VOUS</p><p>{card.humanJudgment}</p></div><div><p className="automation-label">ARRÊTS AUTOMATIQUES</p><p>Réponse reçue · Désinscription · Plainte · Devis gagné · Devis perdu · Pause manuelle</p></div><button type="button" disabled title="La suspension nécessite une action serveur">Suspendre l’automatisation</button></aside></article>;
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div><span>{label}</span><b>{value}</b></div>;
}

function EmptyAutomation() {
  return <section className="automation-empty"><CheckCircle2 aria-hidden="true" /><h2>Aucune automatisation active.</h2><p>Sesira peut commencer par observer le suivi de vos devis.</p><span>Configuration en cours.</span></section>;
}
