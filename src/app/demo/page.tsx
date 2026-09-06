import Link from "next/link";

import { StatusPill } from "@/components/sesira/ui";

export const dynamic = "force-static";

const DEMO_DECISIONS = [
  { id: "d1", code: "D", kind: "commercial", type: "DEVIS & CLIENTS", title: "Devis 18 450 € — Sophie Lefèvre", detail: "Réponse attendue depuis 7 jours · relance préparée", action: "Vérifier la relance", href: "/demo/devis", priority: 1 },
  { id: "d2", code: "F", kind: "facture", type: "FACTURE", title: "Facture 12 400 € — Garage Montreuil", detail: "Promesse de paiement dépassée · reprise humaine attendue", action: "Reprendre le dossier", href: "/demo/factures", priority: 1 },
  { id: "d3", code: "R", kind: "obligation", type: "OBLIGATION CVC", title: "Contrôle d’étanchéité périodique — 3 équipements", detail: "Échéance dans 6 jours · fiche d’intervention à préparer", action: "Préparer la fiche", href: "/demo/obligations", priority: 1 },
  { id: "d4", code: "T", kind: "terrain", type: "RAPPORT TERRAIN", title: "Rapport #1842 — Karim D. chez Boulangerie Rivet", detail: "Intervention terminée · observations et pièces jointes à relire", action: "Relire le rapport", href: "/demo/documents", priority: 2 },
  { id: "d5", code: "C", kind: "commercial", type: "ENTRETIEN", title: "Renouvellement — Martin & Fils · 1 840 € / an", detail: "Échéance le 30 septembre · proposition à préparer", action: "Préparer", href: "/demo/maintenance", priority: 2 },
] as const;

const DEMO_MONEY = [
  { label: "Devis en attente", value: "54 650 €", count: "2 dossiers", note: "8 dossiers actifs dans le scénario", attention: false, href: "/demo/devis" },
  { label: "Vendu non planifié", value: "22 400 €", count: "1 chantier", note: "Créneau et technicien à choisir", attention: false, href: "/demo/interventions" },
  { label: "Factures échues", value: "12 400 €", count: "1 créance", note: "Promesse de paiement dépassée", attention: true, href: "/demo/factures" },
  { label: "Contrats < 60 jours", value: "1 840 € / an", count: "1 contrat", note: "Renouvellement à préparer", attention: false, href: "/demo/maintenance" },
] as const;

const DEMO_FIELD = [
  { initials: "JB", name: "Julien B.", van: "Camionnette 04", time: "10:30", status: "En cours", tone: "warning" as const, title: "Chambre froide positive (+2 °C)", site: "Boulangerie Marchand · Grenoble", foot: "Étape 2/3 · tirage au vide" },
  { initials: "MD", name: "Marc D.", van: "Camionnette 02", time: "11:15", status: "En route", tone: "neutral" as const, title: "Dépannage CTA Air Neuf", site: "Laboratoire Biomédic · Valence", foot: "Tournée terrain · démonstration" },
  { initials: "TL", name: "Thomas L.", van: "Camionnette 01", time: "09:45", status: "Terminée", tone: "good" as const, title: "Contrôle annuel d’étanchéité", site: "Entrepôt · 6 équipements", foot: "Rapport généré · CERFA à préparer" },
  { initials: "AV", name: "Antoine V.", van: "Atelier", time: "14:00", status: "Prévue", tone: "neutral" as const, title: "Maintenance PAC hybride", site: "Résidence Les Cèdres · R32", foot: "Matériel et fluide chargés" },
] as const;

export default function DemoTodayPage() {
  return (
    <div className="command-dashboard demo-command-dashboard">
      <section className="demo-stitch-truth" aria-label="Périmètre de la démonstration">
        <strong>DÉMONSTRATION · DONNÉES FICTIVES</strong>
        <span>Référence visuelle Stitch. Aucune donnée réelle et aucune action externe.</span>
      </section>

      <section className="command-status-bar" aria-label="État du poste de commande démo">
        <div><span className="command-status-dot" aria-hidden="true" /><span className="command-kicker">Supervision</span><strong>Validation humaine</strong></div>
        <div><span className="command-kicker">Scénario</span><strong>THERMOPRO SERVICES</strong></div>
        <div><span className="command-kicker">Décisions</span><strong>5</strong></div>
        <span className="command-service-quiet">Lecture seule</span>
      </section>

      <header className="command-hero">
        <div>
          <span className="eyebrow">SUPERVISION OPÉRATIONNELLE · THERMOPRO SERVICES</span>
          <h1>Bonjour, 5 décisions requièrent votre validation aujourd’hui</h1>
          <p>La démonstration reprend le poste de commande Stitch avec une file de décisions, le cash-flow, le terrain et le registre CVC dans une seule vue.</p>
        </div>
        <div className="command-hero-meta"><span>Scénario direction CVC</span><Link href="/demo/automatisations">Autonomie</Link></div>
      </header>

      <section className="command-section command-decisions" aria-labelledby="demo-decision-heading">
        <div className="command-section-heading">
          <div><span className="eyebrow">BANDEAU 01</span><h2 id="demo-decision-heading">File de Décisions Immédiates</h2></div>
          <span className="command-section-count">5 EN ATTENTE · TRI VALEUR × URGENCE</span>
        </div>
        <div className="command-decision-list">
          {DEMO_DECISIONS.map((item) => (
            <article className={`command-decision-row command-kind-${item.kind}`} key={item.id}>
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
          <div><span className="eyebrow">BANDEAU 02</span><h2 id="demo-money-heading">Cockpit Financier & Cash-Flow</h2></div>
          <span className="command-heading-note">Scénario fictif · EUR uniquement</span>
        </div>
        <div className="command-money-grid">
          {DEMO_MONEY.map((item) => (
            <Link className={item.attention ? "command-money-card attention" : "command-money-card"} href={item.href} key={item.label}>
              <div className="command-money-card-head"><span>{item.label}</span><span>{item.count}</span></div>
              <strong>{item.value}</strong>
              <p>{item.note}</p>
              <span className="command-card-link">Consulter</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="command-section" aria-labelledby="demo-field-heading">
        <div className="command-section-heading">
          <div><span className="eyebrow">BANDEAU 03</span><h2 id="demo-field-heading">Aujourd’hui sur le Terrain · 4 Techniciens en Rotation</h2></div>
          <div className="command-inline-metrics"><span>4 interventions</span><span>1 rapport à relire</span><span>0 conflit offline</span></div>
        </div>
        <div className="command-field-grid">
          {DEMO_FIELD.map((row) => (
            <Link className="command-field-card" href="/demo/interventions" key={row.name}>
              <div className="command-field-card-top">
                <span className="command-tech-avatar">{row.initials}</span>
                <div><strong>{row.name}</strong><span>{row.van} · {row.time}</span></div>
                <StatusPill tone={row.tone}>{row.status}</StatusPill>
              </div>
              <h3>{row.title}</h3>
              <p>{row.site}</p>
              <div className="command-field-card-foot"><span>{row.foot}</span><span>Dossier</span></div>
            </Link>
          ))}
        </div>
      </section>

      <section className="command-section command-regulatory" aria-labelledby="demo-reg-heading">
        <div className="command-section-heading">
          <div><span className="eyebrow">BANDEAU 04</span><h2 id="demo-reg-heading">Registre d’Équipements & Traçabilité CERFA 15497*04</h2></div>
          <Link className="command-text-link" href="/demo/obligations">Registre</Link>
        </div>
        <div className="command-regulatory-grid">
          <article><span className="eyebrow">BILAN FLUIDES 2026</span><strong>482,4 kg</strong><p>R134a, R404A, R449A, R32 et R410A dans le jeu de données fictif.</p><span className="demo-stitch-mini-status">Bilan annuel à préparer</span></article>
          <article><span className="eyebrow">DOCUMENTS À COMPLÉTER</span><strong>2</strong><p>Deux fiches disposent encore d’informations manquantes avant préparation documentaire.</p><span className="demo-stitch-mini-status warning">Action humaine attendue</span></article>
          <article><span className="eyebrow">PARC OUTILLAGE & MÉTROLOGIE</span><strong>6</strong><p>Balances et équipements de mesure suivis avec dates d’étalonnage fictives.</p><span className="demo-stitch-mini-status">Prochaine échéance · 18 oct.</span></article>
        </div>
        <p className="command-regulatory-boundary">SESIRA prépare, calcule et signale. Cette démonstration ne qualifie pas votre situation réglementaire et n’effectue aucun dépôt externe.</p>
      </section>
    </div>
  );
}
