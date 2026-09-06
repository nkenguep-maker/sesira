import Link from "next/link";

import { DemoCommandCenter } from "@/components/sesira/demo-command-center";
import { StatusPill } from "@/components/sesira/ui";

export const dynamic = "force-static";

const DEMO_DECISIONS = [
  { id: "d1", code: "D", type: "DEVIS & CLIENTS", title: "Relance du devis DV-2026-0421", detail: "18 450 € · Sophie Lefèvre · 7 jours sans réponse", action: "Vérifier", href: "/demo/devis", priority: 1 },
  { id: "d2", code: "C", type: "CHANTIER", title: "Dupont SARL · chantier vendu non planifié", detail: "22 400 € · créneau et technicien à choisir", action: "Planifier", href: "/demo/interventions", priority: 1 },
  { id: "d3", code: "F", type: "FACTURE", title: "F-2026-0418 · promesse de paiement dépassée", detail: "12 400 € · Garage Montreuil", action: "Ouvrir", href: "/demo/factures", priority: 1 },
  { id: "d4", code: "R", type: "RAPPORT TERRAIN", title: "Boulangerie Rivet · rapport prêt pour revue", detail: "Intervention #1842 · observations et 3 photos fictives", action: "Relire", href: "/demo/documents", priority: 2 },
  { id: "d5", code: "M", type: "ENTRETIEN", title: "Martin & Fils · renouvellement à préparer", detail: "1 840 € / an · échéance le 30 septembre", action: "Préparer", href: "/demo/maintenance", priority: 2 },
] as const;

const DEMO_MONEY = [
  { label: "Devis en attente", value: "54 650 €", count: "2 dossiers", note: "Sophie Lefèvre + Clinique Valmy", attention: false, href: "/demo/devis" },
  { label: "Vendu non planifié", value: "22 400 €", count: "1 chantier", note: "Dupont SARL · créneau à choisir", attention: false, href: "/demo/interventions" },
  { label: "Factures échues", value: "12 400 €", count: "1 créance", note: "Garage Montreuil · promesse dépassée", attention: true, href: "/demo/factures" },
  { label: "Renouvellements ≤ 60 j", value: "1 840 € / an", count: "1 contrat", note: "Martin & Fils · échéance 30 septembre", attention: false, href: "/demo/maintenance" },
] as const;

const DEMO_FIELD = [
  { initials: "KD", name: "Karim D.", time: "10:30", status: "En cours", tone: "warning" as const, title: "Chambre froide positive", site: "Boulangerie Rivet · Grenoble", foot: "Pressostat remplacé · rapport en préparation" },
  { initials: "JL", name: "Julie L.", time: "11:15", status: "En route", tone: "neutral" as const, title: "Dépannage CTA Air Neuf", site: "Clinique Valmy · Dijon", foot: "Vision GPS/dispatch · en intégration Core" },
  { initials: "MB", name: "Marc B.", time: "09:45", status: "Terminée", tone: "good" as const, title: "Contrôle annuel d’étanchéité", site: "Martin & Fils · 3 équipements", foot: "Compte rendu terrain prêt" },
  { initials: "SD", name: "Sonia D.", time: "14:00", status: "Prévue", tone: "neutral" as const, title: "Remplacement groupe froid", site: "Dupont SARL · Lyon", foot: "Vendu · planification à confirmer" },
] as const;

export default function DemoTodayPage() {
  return (
    <div className="command-dashboard demo-command-dashboard">
      <section className="demo-stitch-truth" aria-label="Périmètre de la démonstration">
        <strong>DÉMONSTRATION · DONNÉES FICTIVES</strong>
        <span>Cette page est indépendante de votre compte et ne modifie aucune donnée. Les capacités non encore disponibles dans le Core sont marquées comme vision produit.</span>
      </section>

      <section className="command-status-bar" aria-label="État du poste de commande démo">
        <div><span className="command-status-dot" aria-hidden="true" /><span className="command-kicker">Mode</span><strong>Validation humaine</strong></div>
        <div><span className="command-kicker">Synchronisation</span><strong>scénario fictif</strong></div>
        <div><span className="command-kicker">Périmètre</span><strong>THERMOPRO SERVICES</strong></div>
        <span className="command-service-quiet">Lecture seule · aucune action externe</span>
      </section>

      <header className="command-hero demo-stitch-hero">
        <div>
          <span className="eyebrow">POSTE DE COMMANDE · THERMOPRO SERVICES</span>
          <h1>5 sujets réclament un regard aujourd’hui.</h1>
          <p>SESIRA concentre les décisions commerciales, l’argent, le terrain et les obligations CVC dans une seule file de travail.</p>
        </div>
        <div className="command-hero-meta">
          <span>3 priorités hautes</span>
          <Link href="/demo/automatisations">Voir les règles →</Link>
        </div>
      </header>

      <section className="command-section command-decisions" aria-labelledby="demo-decision-heading">
        <div className="command-section-heading">
          <div><span className="eyebrow">01 · À TRAITER MAINTENANT</span><h2 id="demo-decision-heading">File de décisions</h2></div>
          <span className="command-section-count">5 situations</span>
        </div>
        <div className="command-decision-list">
          {DEMO_DECISIONS.map((item) => (
            <article className="command-decision-row" key={item.id}>
              <span className="command-decision-marker" aria-label={item.type}>{item.code}</span>
              <div className="command-decision-copy">
                <div><span className="command-decision-type">{item.type}</span><span>{item.priority === 1 ? "Priorité haute" : "À traiter"}</span></div>
                <h3>{item.title}</h3>
                <p>{item.detail}</p>
              </div>
              <Link className={item.priority === 1 ? "command-action primary" : "command-action"} href={item.href}>{item.action}</Link>
            </article>
          ))}
        </div>
        <div className="demo-stitch-progress">
          <div><span className="eyebrow">PROGRESSION DE LA JOURNÉE</span><strong>4 décisions traitées sur 9</strong></div>
          <div className="demo-stitch-progress-track"><span /></div>
          <strong>12 270 € de dossiers débloqués ce matin</strong>
        </div>
      </section>

      <section className="command-section" aria-labelledby="demo-money-heading">
        <div className="command-section-heading">
          <div><span className="eyebrow">02 · L’ARGENT</span><h2 id="demo-money-heading">Cockpit financier & cash-flow</h2></div>
          <span className="command-heading-note">Scénario fictif · EUR uniquement</span>
        </div>
        <div className="command-money-grid">
          {DEMO_MONEY.map((item) => (
            <Link className={item.attention ? "command-money-card attention" : "command-money-card"} href={item.href} key={item.label}>
              <div className="command-money-card-head"><span>{item.label}</span><span>{item.count}</span></div>
              <strong>{item.value}</strong>
              <p>{item.note}</p>
              <span className="command-card-link">Ouvrir →</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="command-section" aria-labelledby="demo-field-heading">
        <div className="command-section-heading">
          <div><span className="eyebrow">03 · AUJOURD’HUI SUR LE TERRAIN</span><h2 id="demo-field-heading">Équipe & interventions</h2></div>
          <div className="command-inline-metrics"><span>4 interventions</span><span>1 rapport à relire</span><span>0 conflit offline</span></div>
        </div>
        <div className="command-field-grid">
          {DEMO_FIELD.map((row) => (
            <Link className="command-field-card" href="/demo/interventions" key={row.name}>
              <div className="command-field-card-top">
                <span className="command-tech-avatar">{row.initials}</span>
                <div><strong>{row.name}</strong><span>{row.time}</span></div>
                <StatusPill tone={row.tone}>{row.status}</StatusPill>
              </div>
              <h3>{row.title}</h3>
              <p>{row.site}</p>
              <div className="command-field-card-foot"><span>{row.foot}</span><span>Ouvrir →</span></div>
            </Link>
          ))}
        </div>
      </section>

      <section className="command-section command-regulatory" aria-labelledby="demo-reg-heading">
        <div className="command-section-heading">
          <div><span className="eyebrow">04 · F-GAS & TRAÇABILITÉ CERFA 15497*04</span><h2 id="demo-reg-heading">Registre de travail réglementaire</h2></div>
          <Link className="command-text-link" href="/demo/obligations">Ouvrir les obligations →</Link>
        </div>
        <div className="command-regulatory-grid">
          <article><span className="eyebrow">FLUIDES TRACÉS 2026</span><strong>482,4 kg</strong><p>R134a, R404A, R449A, R32 et R410A dans le jeu de données fictif.</p><span className="demo-stitch-mini-status">Bilan annuel à préparer</span></article>
          <article><span className="eyebrow">À COMPLÉTER</span><strong>2</strong><p>Deux fiches disposent encore d’informations manquantes avant préparation documentaire.</p><span className="demo-stitch-mini-status warning">Action humaine attendue</span></article>
          <article><span className="eyebrow">OUTILLAGE & BALANCES</span><strong>6</strong><p>Équipements de mesure suivis avec références et dates d’étalonnage fictives.</p><span className="demo-stitch-mini-status">Prochaine échéance · 18 oct.</span></article>
        </div>
        <p className="command-regulatory-boundary">SESIRA prépare, calcule et signale. Cette démonstration ne qualifie pas votre situation réglementaire et n’effectue aucun dépôt externe.</p>
      </section>

      <section className="command-section demo-stitch-roadmap" aria-labelledby="demo-roadmap-heading">
        <div className="command-section-heading">
          <div><span className="eyebrow">05 · CAPACITÉS EN INTÉGRATION CORE</span><h2 id="demo-roadmap-heading">La couche terrain suivante</h2></div>
          <span className="command-heading-note">Vision produit · non production</span>
        </div>
        <div className="demo-stitch-roadmap-grid">
          <article><span>Dispatch</span><strong>Planning équipe + véhicule</strong><p>Affectation, ordre de tournée et conflits de capacité.</p></article>
          <article><span>GPS / ETA</span><strong>Télémétrie bornée</strong><p>Position, fraîcheur et source de la donnée toujours visibles.</p></article>
          <article><span>SMS</span><strong>Messages transactionnels</strong><p>Avis J-1, changement d’horaire et liens sous politique.</p></article>
          <article><span>Trust</span><strong>Preuve documentaire</strong><p>Hash, horodatage et preuve provider séparés des affirmations juridiques.</p></article>
          <article><span>Déchets</span><strong>Trackdéchets</strong><p>Préparation et statut provider réel, sans faux accusé.</p></article>
        </div>
      </section>

      <section className="demo-stitch-guided-intro">
        <span className="eyebrow">06 · DÉMONSTRATION GUIDÉE</span>
        <h2>Ouvrez un dossier et suivez-le de bout en bout.</h2>
        <p>Les actions ci-dessous sont simulées et ne modifient aucune base de données.</p>
      </section>
      <DemoCommandCenter communications={[]} />
    </div>
  );
}
