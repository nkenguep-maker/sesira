"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDollarSign,
  FileText,
  LayoutDashboard,
  RotateCcw,
  ShieldCheck,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { SesiraLogo } from "@/components/sesira/logo";
import styles from "./demo.module.css";

type Surface = "dashboard" | "clients" | "devis" | "planning" | "terrain" | "factures" | "obligations";
type Decision = { id: string; category: string; title: string; detail: string; value: string; timing: string; action: string; surface: Surface; priority: "urgent" | "high" | "normal" };
type InterventionStatus = "À venir" | "En route" | "Sur place" | "En cours" | "Terminée";
type Intervention = { id: string; time: string; customer: string; title: string; address: string; tech: string; status: InterventionStatus; duration: string };

const INITIAL_DECISIONS: Decision[] = [
  { id: "d1", category: "DEVIS", title: "Sophie Lefèvre · DV-2026-0421", detail: "18 450 € · aucune réponse enregistrée depuis 7 jours", value: "18 450 €", timing: "Relance à valider", action: "Ouvrir le devis", surface: "devis", priority: "high" },
  { id: "d2", category: "FACTURE", title: "Garage Montreuil · F-2026-0418", detail: "Promesse de règlement du 3 septembre dépassée", value: "12 400 €", timing: "8 jours de retard", action: "Décider du suivi", surface: "factures", priority: "urgent" },
  { id: "d3", category: "VENDU", title: "Dupont SARL · DV-2026-0412", detail: "Devis gagné sans intervention planifiée", value: "22 400 €", timing: "Créneau à confirmer", action: "Planifier", surface: "planning", priority: "high" },
  { id: "d4", category: "RAPPORT", title: "Boulangerie Rivet · INT-1842", detail: "Rapport terrain relu · message client prêt à valider", value: "3 pièces jointes", timing: "Terminé aujourd’hui", action: "Vérifier", surface: "terrain", priority: "normal" },
  { id: "d5", category: "OBLIGATION", title: "Restaurant Le Cèdre · groupe froid 02", detail: "Prochaine vérification calculée dans 9 jours", value: "18,2 tCO₂e", timing: "20 septembre", action: "Voir l’équipement", surface: "obligations", priority: "normal" },
];

const INITIAL_INTERVENTIONS: Intervention[] = [
  { id: "i1", time: "08:00", customer: "Boulangerie Rivet", title: "Remplacement pressostat chambre froide", address: "28 rue de la République, Grenoble", tech: "Karim D.", status: "Terminée", duration: "1 h 30" },
  { id: "i2", time: "10:15", customer: "Dupont SARL", title: "Préparation remplacement groupe froid", address: "14 rue des Frères Lumière, Grenoble", tech: "Marc D.", status: "En cours", duration: "2 h" },
  { id: "i3", time: "11:30", customer: "Restaurant Le Cèdre", title: "Contrôle groupe froid 02", address: "6 place Victor-Hugo, Grenoble", tech: "Sarah M.", status: "Sur place", duration: "1 h" },
  { id: "i4", time: "13:45", customer: "Clinique Valmy", title: "Diagnostic réseau eau glacée", address: "31 avenue Alsace-Lorraine, Grenoble", tech: "Marc D.", status: "En route", duration: "1 h 15" },
  { id: "i5", time: "15:30", customer: "Martin & Fils", title: "Maintenance PAC bureaux", address: "10 rue de la Poste, Échirolles", tech: "Lina K.", status: "À venir", duration: "2 h" },
  { id: "i6", time: "17:00", customer: "Garage Montreuil", title: "Dépannage climatisation atelier", address: "42 avenue Jean-Perrot, Grenoble", tech: "Karim D.", status: "À venir", duration: "1 h 30" },
];

const CLIENTS = [
  ["Sophie Lefèvre", "Particulier", "s.lefevre@example.fr", "06 18 24 71 20", "PAC maison"],
  ["Clinique Valmy", "Entreprise", "technique@valmy-demo.fr", "04 76 18 31 11", "2 sites"],
  ["Dupont SARL", "Entreprise", "direction@dupont-demo.fr", "04 76 55 28 90", "3 équipements"],
  ["Boulangerie Rivet", "Entreprise", "contact@rivet-demo.fr", "04 76 48 22 16", "2 équipements"],
  ["Martin & Fils", "Entreprise", "admin@martin-demo.fr", "04 76 09 17 02", "Contrat entretien"],
];

const QUOTES = [
  ["DV-2026-0421", "Sophie Lefèvre", "PAC air/eau + ballon", "18 450 €", "Relance à valider", "7 j"],
  ["DV-2026-0407", "Clinique Valmy", "Optimisation réseau eau glacée", "36 200 €", "Réponse reçue", "Aujourd’hui"],
  ["DV-2026-0412", "Dupont SARL", "Remplacement groupe froid", "22 400 €", "Gagné", "1 j"],
  ["DV-2026-0399", "Boulangerie Rivet", "Modernisation chambre froide", "9 800 €", "Envoyé", "3 j"],
];

const INVOICES = [
  ["F-2026-0418", "Garage Montreuil", "12 400 €", "3 septembre 2026", "8 j", "À décider"],
  ["F-2026-0426", "Clinique Valmy", "9 400 €", "8 septembre 2026", "3 j", "Relance enregistrée"],
  ["F-2026-0431", "Dupont SARL", "6 720 €", "25 septembre 2026", "—", "Émise"],
  ["F-2026-0403", "Boulangerie Rivet", "5 880 €", "19 août 2026", "—", "Payée"],
];

const NAV: Array<{ id: Surface; label: string; icon: LucideIcon }> = [
  { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { id: "clients", label: "Clients", icon: Users },
  { id: "devis", label: "Devis", icon: FileText },
  { id: "planning", label: "Interventions", icon: CalendarDays },
  { id: "terrain", label: "Terrain", icon: Wrench },
  { id: "factures", label: "Factures", icon: CircleDollarSign },
  { id: "obligations", label: "Obligations", icon: ShieldCheck },
];

export default function DemoPage() {
  const [surface, setSurface] = useState<Surface>("dashboard");
  const [decisions, setDecisions] = useState(INITIAL_DECISIONS);
  const [interventions, setInterventions] = useState(INITIAL_INTERVENTIONS);
  const [invoicePromise, setInvoicePromise] = useState(false);
  const [cerfaPrepared, setCerfaPrepared] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const unresolved = decisions.length;
  const inProgress = interventions.filter((item) => item.status === "En cours" || item.status === "Sur place").length;
  const finished = interventions.filter((item) => item.status === "Terminée").length;
  const header = useMemo(() => ({
    dashboard: ["Aujourd’hui", "Les décisions qui méritent votre attention."],
    clients: ["Clients", "Coordonnées, sites et contexte opérationnel."],
    devis: ["Devis", "Suivi commercial sans transformer un signal en décision."],
    planning: ["Interventions", "Planning du jour et charge de l’équipe."],
    terrain: ["Terrain", "Vue technicien : prochaine intervention et saisie terrain."],
    factures: ["Factures", "Échéances, promesses et litiges à suivre."],
    obligations: ["Obligations CVC", "Échéances et documents à préparer, sans verdict réglementaire."],
  }[surface]), [surface]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2400);
  }
  function openDecision(decision: Decision) { setSurface(decision.surface); notify(`Ouverture : ${decision.title}`); }
  function resolveDecision(id: string, copy: string) { setDecisions((current) => current.filter((item) => item.id !== id)); notify(copy); }
  function updateIntervention(id: string, status: InterventionStatus) {
    setInterventions((current) => current.map((item) => item.id === id ? { ...item, status } : item));
    notify(status === "Sur place" ? "Arrivée enregistrée dans la démo." : status === "En cours" ? "Intervention démarrée dans la démo." : "État mis à jour dans la démo.");
  }
  function resetDemo() {
    setSurface("dashboard"); setDecisions(INITIAL_DECISIONS); setInterventions(INITIAL_INTERVENTIONS); setInvoicePromise(false); setCerfaPrepared(false); notify("Démo réinitialisée.");
  }

  return (
    <main className={styles.demo}>
      <div className={styles.demoBar}><div><strong>DÉMO SESIRA</strong><span>Données fictives · aucun email, paiement ou dépôt externe n’est déclenché</span></div><button type="button" onClick={resetDemo}><RotateCcw size={14} /> Réinitialiser</button></div>
      <aside className={styles.sidebar}>
        <div className={styles.brand}><Link href="/demo" aria-label="Accueil de la démo"><SesiraLogo /></Link><div><strong>THERMOPRO SERVICES</strong><span>Direction · Démo</span></div></div>
        <nav><span className={styles.navLabel}>Navigation</span>{NAV.map((item) => { const Icon = item.icon; return <button key={item.id} type="button" onClick={() => setSurface(item.id)} className={surface === item.id ? styles.active : ""}><Icon size={18} /><span>{item.label}</span>{item.id === "dashboard" && unresolved ? <em>{unresolved}</em> : null}</button>; })}</nav>
        <div className={styles.sidebarBottom}><div className={styles.companyPulse}><span /><div><strong>Autonomie</strong><small>Observation + validation</small></div></div><Link href="/">Quitter la démo</Link></div>
      </aside>
      <section className={styles.body}>
        <header className={styles.topbar}><div><strong>{header[0]}</strong><span>THERMOPRO SERVICES · Isère</span></div><div className={styles.topActions}><span className={styles.sync}><i /> Démo synchronisée</span><button type="button" onClick={() => setSurface("dashboard")} aria-label="Voir les décisions"><Bell size={18} />{unresolved ? <b>{unresolved}</b> : null}</button><span className={styles.avatar}>TS</span></div></header>
        <div className={styles.content}>
          <div className={styles.pageHead}><div><span className={styles.eyebrow}>SESIRA · MODE DÉMO</span><h1>{header[0]}</h1><p>{header[1]}</p></div>{surface !== "dashboard" ? <button className={styles.backButton} type="button" onClick={() => setSurface("dashboard")}>Retour au tableau de bord</button> : null}</div>
          {surface === "dashboard" ? <Dashboard decisions={decisions} openDecision={openDecision} inProgress={inProgress} finished={finished} /> : null}
          {surface === "clients" ? <Clients /> : null}
          {surface === "devis" ? <Quotes decisions={decisions} onResolve={resolveDecision} /> : null}
          {surface === "planning" ? <Planning interventions={interventions} onUpdate={updateIntervention} onResolve={resolveDecision} /> : null}
          {surface === "terrain" ? <Terrain interventions={interventions} onUpdate={updateIntervention} onResolve={resolveDecision} /> : null}
          {surface === "factures" ? <Invoices invoicePromise={invoicePromise} setInvoicePromise={(value) => { setInvoicePromise(value); if (value) resolveDecision("d2", "Promesse de paiement enregistrée dans la démo."); }} /> : null}
          {surface === "obligations" ? <Obligations cerfaPrepared={cerfaPrepared} prepare={() => { setCerfaPrepared(true); resolveDecision("d5", "Document de travail préparé dans la démo. Aucun dépôt externe effectué."); }} /> : null}
        </div>
      </section>
      {toast ? <div className={styles.toast}><Check size={16} />{toast}</div> : null}
    </main>
  );
}

function Dashboard({ decisions, openDecision, inProgress, finished }: { decisions: Decision[]; openDecision: (decision: Decision) => void; inProgress: number; finished: number }) {
  return <div className={styles.stack}>
    <section className={styles.decisionPanel}><div className={styles.sectionHead}><div><span className={styles.eyebrow}>À TRAITER MAINTENANT</span><h2>{decisions.length ? `${decisions.length} décision${decisions.length > 1 ? "s" : ""} restent à prendre` : "La file est vide"}</h2></div>{decisions.length ? <span>Triées par valeur × urgence</span> : <span className={styles.goodText}>Rien ne demande votre arbitrage</span>}</div>{decisions.length ? <div className={styles.decisionList}>{decisions.map((item) => <button key={item.id} type="button" onClick={() => openDecision(item)} className={styles.decisionRow}><span className={`${styles.priorityDot} ${styles[item.priority]}`} /><div className={styles.decisionMain}><span>{item.category}</span><strong>{item.title}</strong><small>{item.detail}</small></div><div className={styles.decisionValue}><strong>{item.value}</strong><span>{item.timing}</span></div><div className={styles.decisionAction}>{item.action}<ChevronRight size={16} /></div></button>)}</div> : <div className={styles.positiveEmpty}><Check size={20} /><div><strong>Tout est traité pour le moment.</strong><span>SESIRA fera remonter uniquement ce qui nécessite une nouvelle décision.</span></div></div>}</section>
    <section><div className={styles.sectionHead}><div><span className={styles.eyebrow}>L’ARGENT</span><h2>Ce qui mérite un suivi financier</h2></div><span>EUR uniquement</span></div><div className={styles.kpiGrid}><Kpi value="64 450 €" label="Devis en attente" note="3 dossiers" /><Kpi value="22 400 €" label="Vendu non planifié" note="1 affaire" /><Kpi value="21 800 €" label="Factures échues" note="2 factures" warning /><Kpi value="76 500 €" label="Renouvellements < 60 j" note="11 contrats" /></div></section>
    <div className={styles.twoColumns}><section className={styles.card}><div className={styles.sectionHead}><div><span className={styles.eyebrow}>AUJOURD’HUI SUR LE TERRAIN</span><h2>6 interventions</h2></div><span>{inProgress} en cours · {finished} terminée</span></div><div className={styles.miniRows}><div><strong>10:15 · Dupont SARL</strong><span>Marc D. · En cours</span></div><div><strong>11:30 · Restaurant Le Cèdre</strong><span>Sarah M. · Sur place</span></div><div><strong>13:45 · Clinique Valmy</strong><span>Marc D. · En route</span></div></div></section><section className={styles.card}><div className={styles.sectionHead}><div><span className={styles.eyebrow}>OBLIGATIONS</span><h2>2 éléments à préparer</h2></div><span>Pas de verdict</span></div><div className={styles.miniRows}><div><strong>Boulangerie Rivet</strong><span>Rapport d’intervention à valider</span></div><div><strong>Restaurant Le Cèdre</strong><span>Vérification calculée dans 9 jours</span></div></div></section></div>
  </div>;
}
function Kpi({ value, label, note, warning }: { value: string; label: string; note: string; warning?: boolean }) { return <article className={`${styles.kpi} ${warning ? styles.kpiWarning : ""}`}><strong>{value}</strong><span>{label}</span><small>{note}</small></article>; }
function Clients() { return <section className={styles.tableCard}><div className={styles.tableHead}><span>Client</span><span>Type</span><span>Contact</span><span>Téléphone</span><span>Contexte</span></div>{CLIENTS.map((row) => <div className={styles.tableRow} key={row[0]}><strong>{row[0]}</strong><span>{row[1]}</span><span>{row[2]}</span><span>{row[3]}</span><span>{row[4]}</span></div>)}</section>; }
function Quotes({ decisions, onResolve }: { decisions: Decision[]; onResolve: (id: string, copy: string) => void }) { const stillOpen = decisions.some((item) => item.id === "d1"); return <div className={styles.stack}><div className={styles.kpiGrid}><Kpi value="4" label="Devis suivis" note="3 actifs" /><Kpi value="86 850 €" label="Valeur connue" note="EUR uniquement" /><Kpi value={stillOpen ? "1" : "0"} label="À décider" note="Validation humaine" /><Kpi value="1" label="Réponse reçue" note="Aujourd’hui" /></div><section className={styles.tableCard}><div className={`${styles.tableHead} ${styles.quoteGrid}`}><span>Devis</span><span>Client</span><span>Montant</span><span>État</span><span>Ancienneté</span></div>{QUOTES.map((row) => <div className={`${styles.tableRow} ${styles.quoteGrid}`} key={row[0]}><div><strong>{row[0]}</strong><small>{row[2]}</small></div><span>{row[1]}</span><strong>{row[3]}</strong><span className={row[4].includes("valider") ? styles.warnText : row[4] === "Gagné" ? styles.goodText : ""}>{row[4]}</span><span>{row[5]}</span></div>)}</section>{stillOpen ? <section className={styles.focusCard}><div><span className={styles.eyebrow}>DOSSIER À DÉCIDER</span><h2>Sophie Lefèvre · DV-2026-0421</h2><p>Le devis a été envoyé il y a 7 jours. Aucun signal de réponse n’est enregistré. SESIRA prépare une relance contextualisée, mais ne l’envoie pas sans validation.</p></div><button type="button" onClick={() => onResolve("d1", "Relance validée dans la démo. Aucun email réel envoyé.")}>Valider la relance <ArrowRight size={15} /></button></section> : <div className={styles.positiveEmpty}><Check size={20} /><div><strong>Aucune relance n’attend votre validation.</strong><span>Le dossier est sorti de la file de décisions de démonstration.</span></div></div>}</div>; }
function Planning({ interventions, onUpdate, onResolve }: { interventions: Intervention[]; onUpdate: (id: string, status: InterventionStatus) => void; onResolve: (id: string, copy: string) => void }) { return <div className={styles.stack}><div className={styles.planningTop}><div><strong>Vendredi 11 septembre</strong><span>6 interventions · 4 techniciens</span></div><div className={styles.legend}><span><i className={styles.dotGreen} />En cours / sur place</span><span><i className={styles.dotNeutral} />À venir</span></div></div><section className={styles.timeline}>{interventions.map((item) => <article key={item.id} className={styles.intervention}><div className={styles.time}>{item.time}</div><div><span className={styles.eyebrow}>{item.customer}</span><h3>{item.title}</h3><p>{item.address} · {item.duration}</p></div><div><strong>{item.tech}</strong><span>{item.status}</span></div>{item.customer === "Dupont SARL" && item.status !== "Terminée" ? <button type="button" onClick={() => { onUpdate(item.id, "En cours"); onResolve("d3", "Créneau confirmé pour la vente Dupont SARL dans la démo."); }}>Confirmer le planning</button> : null}</article>)}</section></div>; }
function Terrain({ interventions, onUpdate, onResolve }: { interventions: Intervention[]; onUpdate: (id: string, status: InterventionStatus) => void; onResolve: (id: string, copy: string) => void }) { const next = interventions.find((item) => item.status !== "Terminée") ?? interventions[0]; return <div className={styles.stack}><section className={styles.fieldHero}><div><span className={styles.eyebrow}>PROCHAINE INTERVENTION · {next.time}</span><h2>{next.customer}</h2><p>{next.title}</p><div><span>{next.address}</span><span>Durée prévue · {next.duration}</span></div></div><div className={styles.fieldActions}>{next.status === "En route" || next.status === "À venir" ? <button type="button" onClick={() => onUpdate(next.id, "Sur place")}>Je suis arrivé</button> : null}{next.status === "Sur place" ? <button type="button" onClick={() => onUpdate(next.id, "En cours")}>Commencer l’intervention</button> : null}<span>{next.status}</span></div></section><section className={styles.captureCard}><div className={styles.sectionHead}><div><span className={styles.eyebrow}>SAISIE TERRAIN</span><h2>Informations structurées</h2></div><span>Démo · aucune donnée réelle enregistrée</span></div><div className={styles.captureGrid}><button type="button" onClick={() => onResolve("d4", "Rapport terrain validé dans la démo.")}>Valider le rapport</button><button type="button">Ajouter une mesure</button><button type="button">Signaler une anomalie</button><button type="button">Ajouter une pièce utilisée</button></div><p>Dans le produit réel, les notes, anomalies, mesures et pièces structurées peuvent rester en file hors connexion. Les photos et signatures ne sont pas annoncées comme disponibles hors connexion sans stockage binaire dédié.</p></section></div>; }
function Invoices({ invoicePromise, setInvoicePromise }: { invoicePromise: boolean; setInvoicePromise: (value: boolean) => void }) { return <div className={styles.stack}><div className={styles.kpiGrid}><Kpi value="2" label="En retard" note="21 800 € connus" warning /><Kpi value={invoicePromise ? "1" : "0"} label="Promesses actives" note="Suivi humain" /><Kpi value="0" label="Litiges ouverts" note="Aucun" /><Kpi value="6" label="Payées ce mois" note="54 820 €" /></div><section className={styles.tableCard}><div className={`${styles.tableHead} ${styles.invoiceGrid}`}><span>Facture</span><span>Client</span><span>Montant</span><span>Échéance</span><span>Suivi</span></div>{INVOICES.map((row) => <div className={`${styles.tableRow} ${styles.invoiceGrid}`} key={row[0]}><strong>{row[0]}</strong><span>{row[1]}</span><strong>{row[2]}</strong><span>{row[3]}{row[4] !== "—" ? ` · +${row[4]}` : ""}</span><span className={row[5] === "À décider" && !invoicePromise ? styles.warnText : row[5] === "Payée" ? styles.goodText : ""}>{row[0] === "F-2026-0418" && invoicePromise ? "Promesse · 16 sept." : row[5]}</span></div>)}</section><section className={styles.focusCard}><div><span className={styles.eyebrow}>F-2026-0418 · GARAGE MONTREUIL</span><h2>{invoicePromise ? "Promesse de paiement enregistrée" : "12 400 € · promesse dépassée"}</h2><p>{invoicePromise ? "Le client a annoncé un règlement pour le 16 septembre. SESIRA surveillera cette date ; il ne modifie pas le statut comptable." : "La date annoncée du 3 septembre est dépassée. Aucun litige n’est enregistré. La prochaine décision reste humaine."}</p></div>{!invoicePromise ? <button type="button" onClick={() => setInvoicePromise(true)}>Enregistrer une promesse <ArrowRight size={15} /></button> : <span className={styles.goodBadge}><Check size={14} /> Suivi enregistré</span>}</section></div>; }
function Obligations({ cerfaPrepared, prepare }: { cerfaPrepared: boolean; prepare: () => void }) { return <div className={styles.stack}><div className={styles.boundary}><ShieldCheck size={18} /><div><strong>Pas de verdict réglementaire</strong><span>SESIRA affiche les données connues, la règle conservée et les éléments à préparer. La vérification et tout dépôt restent sous responsabilité humaine.</span></div></div><div className={styles.twoColumns}><section className={styles.card}><div className={styles.sectionHead}><div><span className={styles.eyebrow}>DOCUMENT À PRÉPARER</span><h2>Boulangerie Rivet · INT-1842</h2></div><span className={cerfaPrepared ? styles.goodText : styles.warnText}>{cerfaPrepared ? "Préparé" : "À préparer"}</span></div><div className={styles.dataList}><div><span>Intervention</span><strong>Terminée aujourd’hui</strong></div><div><span>Pièces jointes fictives</span><strong>3</strong></div><div><span>Action externe</span><strong>Aucun envoi automatique</strong></div></div>{!cerfaPrepared ? <button className={styles.primaryButton} type="button" onClick={prepare}>Préparer le dossier</button> : <div className={styles.goodBadge}><Check size={14} /> Document de travail préparé</div>}</section><section className={styles.card}><div className={styles.sectionHead}><div><span className={styles.eyebrow}>ÉQUIPEMENT</span><h2>Restaurant Le Cèdre · groupe froid 02</h2></div><span>Dans 9 jours</span></div><div className={styles.dataList}><div><span>Fluide enregistré</span><strong>R452A</strong></div><div><span>Charge</span><strong>9,4 kg</strong></div><div><span>Équivalent calculé</span><strong>18,2 tCO₂e</strong></div><div><span>Prochaine vérification calculée</span><strong>20 septembre 2026</strong></div></div></section></div><section className={styles.tableCard}><div className={styles.tableHead}><span>Élément</span><span>Client</span><span>Type</span><span>Échéance</span><span>État de travail</span></div><div className={styles.tableRow}><strong>INT-1842</strong><span>Boulangerie Rivet</span><span>Rapport / document</span><span>Après intervention</span><span className={cerfaPrepared ? styles.goodText : styles.warnText}>{cerfaPrepared ? "Préparé" : "À préparer"}</span></div><div className={styles.tableRow}><strong>GF-02</strong><span>Restaurant Le Cèdre</span><span>Contrôle de fuite</span><span>20 sept. 2026</span><span>Échéance calculée</span></div><div className={styles.tableRow}><strong>ATT-2026-04</strong><span>THERMOPRO SERVICES</span><span>Attestation</span><span>18 oct. 2026</span><span>Donnée enregistrée</span></div></section></div>; }
