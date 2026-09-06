import Link from "next/link";

import { DemoCommandCenter } from "@/components/sesira/demo-command-center";
import { StatusPill } from "@/components/sesira/ui";
import { getManagerToday, type TodayAction } from "@/lib/data/today-c40";
import { getDemoCommunications } from "@/lib/demo/communications";
import { DEMO_ORGANIZATION_ID } from "@/lib/demo/context";
import { getDemoDashboardMetrics } from "@/lib/demo/dashboard";

export const dynamic = "force-dynamic";

const DEMO_MONEY = [
  { label: "Devis en attente", value: "54 650 €", count: "2 dossiers", note: "Sophie Lefèvre + Clinique Valmy", attention: false, href: "/demo/devis" },
  { label: "Vendu non planifié", value: "22 400 €", count: "1 chantier", note: "Dupont SARL · créneau à choisir", attention: false, href: "/demo/interventions" },
  { label: "Factures échues", value: "12 400 €", count: "1 créance", note: "Garage Montreuil · promesse dépassée", attention: true, href: "/demo/factures" },
  { label: "Renouvellements ≤ 60 j", value: "1 840 € / an", count: "1 contrat", note: "Martin & Fils · échéance 30 septembre", attention: false, href: "/demo/maintenance" },
];

const DEMO_FIELD = [
  { initials: "KD", name: "Karim D.", time: "10:30", status: "En cours", tone: "warning" as const, title: "Chambre froide positive", site: "Boulangerie Rivet · Grenoble", foot: "Pressostat remplacé · rapport en préparation" },
  { initials: "JL", name: "Julie L.", time: "11:15", status: "En route", tone: "neutral" as const, title: "Dépannage CTA Air Neuf", site: "Clinique Valmy · Dijon", foot: "ETA 14 min · vision GPS/dispatch" },
  { initials: "MB", name: "Marc B.", time: "09:45", status: "Terminée", tone: "good" as const, title: "Contrôle annuel d’étanchéité", site: "Martin & Fils · 3 équipements", foot: "Rapport terrain relu" },
  { initials: "SD", name: "Sonia D.", time: "14:00", status: "Prévue", tone: "neutral" as const, title: "Remplacement groupe froid", site: "Dupont SARL · Lyon", foot: "Vendu · planification à confirmer" },
];

export default async function DemoTodayPage() {
  const [today, metrics, communications] = await Promise.all([
    getManagerToday(DEMO_ORGANIZATION_ID, { includePlatform: false }),
    getDemoDashboardMetrics(DEMO_ORGANIZATION_ID),
    getDemoCommunications(),
  ]);

  const visibleDecisions = today.actions.slice(0, 5);
  const urgent = today.actions.filter((item) => item.priority === 1).length;

  return (
    <div className="command-dashboard demo-command-dashboard">
      <section className="demo-stitch-truth" aria-label="Périmètre de la démonstration">
        <strong>DÉMONSTRATION · DONNÉES FICTIVES</strong>
        <span>Le tenant THERMOPRO est isolé du produit réel. GPS/ETA, SMS, preuve documentaire et Trackdéchets sont montrés comme vision en cours d’intégration Core, jamais comme états production.</span>
      </section>

      <section className="command-status-bar" aria-label="État du poste de commande démo">
        <div><span className="command-status-dot" aria-hidden="true" /><span className="command-kicker">Mode</span><strong>Validation humaine</strong></div>
        <div><span className="command-kicker">Synchronisation</span><strong>il y a 2 min</strong></div>
        <div><span className="command-kicker">Périmètre</span><strong>THERMOPRO SERVICES</strong></div>
        <span className="command-service-quiet">Lecture seule · aucune action externe</span>
      </section>

      <header className="command-hero demo-stitch-hero">
        <div>
          <span className="eyebrow">POSTE DE COMMANDE · THERMOPRO SERVICES</span>
          <h1>{today.actions.length || 5} sujets réclament un regard aujourd’hui.</h1>
          <p>La démo montre comment SESIRA transforme devis, relances, terrain, factures et maintenance en une file de décisions exploitable — avec la frontière humaine toujours visible.</p>
        </div>
        <div className="command-hero-meta">
          <span>{urgent} priorité{urgent > 1 ? "s" : ""} haute{urgent > 1 ? "s" : ""}</span>
          <Link href="/demo/automatisations">Voir les règles →</Link>
        </div>
      </header>

      <section className="command-section command-decisions" aria-labelledby="demo-decision-heading">
        <div className="command-section-heading">
          <div><span className="eyebrow">01 · À TRAITER MAINTENANT</span><h2 id="demo-decision-heading">File de décisions</h2></div>
          <span className="command-section-count">{today.actions.length} situation{today.actions.length > 1 ? "s" : ""} détectée{today.actions.length > 1 ? "s" : ""}</span>
        </div>

        {visibleDecisions.length ? (
          <div className="command-decision-list">
            {visibleDecisions.map((item) => <DemoDecisionRow item={item} key={item.id} />)}
          </div>
        ) : (
          <div className="command-clear-state"><span aria-hidden="true">✓</span><div><strong>Aucune décision remontée par le tenant fictif.</strong><p>Les scénarios guidés restent disponibles ci-dessous.</p></div></div>
        )}

        <div className="demo-stitch-progress">
          <div><span className="eyebrow">PROGRESSION DE LA JOURNÉE</span><strong>4 décisions traitées sur 9</strong></div>
          <div className="demo-stitch-progress-track"><span /></div>
          <strong>12 270 € de dossiers débloqués ce matin</strong>
        </div>
      </section>

      <section className="command-section" aria-labelledby="demo-money-heading">
        <div className="command-section-heading">
          <div><span className="eyebrow">02 · L’ARGENT</span><h2 id="demo-money-heading">Cockpit financier & cash-flow</h2></div>
          <span className="command-heading-note">Montants du scénario fictif · EUR uniquement</span>
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
          <div className="command-inline-metrics">
            <span>{value(metrics.todayInterventions)} intervention{metrics.todayInterventions === 1 ? "" : "s"}</span>
            <span>1 rapport à valider</span>
            <span>0 conflit offline</span>
          </div>
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
          <article><span className="eyebrow">À COMPLÉTER</span><strong>2</strong><p>Deux fiches d’intervention disposent encore d’informations manquantes avant préparation documentaire.</p><span className="demo-stitch-mini-status warning">Action humaine attendue</span></article>
          <article><span className="eyebrow">OUTILLAGE & BALANCES</span><strong>6</strong><p>Équipements de mesure suivis avec références et dates d’étalonnage fictives.</p><span className="demo-stitch-mini-status">Prochaine échéance · 18 oct.</span></article>
        </div>
        <p className="command-regulatory-boundary">SESIRA prépare, calcule et signale. Cette démonstration ne prononce aucun verdict réglementaire et n’effectue aucun dépôt externe.</p>
      </section>

      <section className="command-section demo-stitch-roadmap" aria-labelledby="demo-roadmap-heading">
        <div className="command-section-heading">
          <div><span className="eyebrow">05 · CAPACITÉS EN INTÉGRATION CORE</span><h2 id="demo-roadmap-heading">La couche terrain suivante</h2></div>
          <span className="command-heading-note">Vision produit · explicitement non production</span>
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
        <h2>Maintenant, ouvrez un dossier et suivez-le de bout en bout.</h2>
        <p>Cette seconde couche est interactive : elle utilise les scénarios THERMOPRO déjà présents dans SESIRA et simule les décisions sans modifier la base.</p>
      </section>
      <DemoCommandCenter communications={communications} />

      <section className="demo-real-queue">
        <div className="demo-section-heading">
          <div><span className="eyebrow">LECTURE DU TENANT FICTIF</span><h2>Ce que le moteur Aujourd’hui remonte réellement</h2></div>
          <Link href="/demo/automatisations" className="demo-text-link">Comprendre les règles →</Link>
        </div>
        <div className="demo-queue-list">
          {today.actions.slice(0, 7).map((item) => (
            <div className="demo-queue-row" key={item.id}>
              <span className={`demo-priority p${item.priority}`} aria-hidden="true" />
              <div><strong>{item.title}</strong><span>{item.detail}</span></div>
              <StatusPill tone={item.priority === 1 ? "warning" : "neutral"}>{item.action}</StatusPill>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function DemoDecisionRow({ item }: { item: TodayAction }) {
  return (
    <article className={`command-decision-row command-kind-${item.category.toLowerCase()}`}>
      <span className="command-decision-marker" aria-label={categoryLabel(item.category)}>{categoryInitial(item.category)}</span>
      <div className="command-decision-copy">
        <div><span className="command-decision-type">{categoryLabel(item.category)}</span><span>{item.priority === 1 ? "Priorité haute" : "À traiter"}</span></div>
        <h3>{item.title}</h3>
        <p>{item.detail}</p>
      </div>
      <Link className={item.priority === 1 ? "command-action primary" : "command-action"} href={demoHref(item.href)}>{item.action}</Link>
    </article>
  );
}

function demoHref(href: string) {
  if (href.startsWith("/app/factures")) return "/demo/factures";
  if (href.startsWith("/app/interventions") || href.startsWith("/app/terrain")) return "/demo/interventions";
  if (href.startsWith("/app/rapports") || href.startsWith("/app/documents")) return "/demo/documents";
  if (href.startsWith("/app/maintenance")) return "/demo/maintenance";
  if (href.startsWith("/app/obligations")) return "/demo/obligations";
  if (href.startsWith("/app/automatisations")) return "/demo/automatisations";
  if (href.startsWith("/app/opportunites") || href.startsWith("/app/devis") || href.startsWith("/app/suivi")) return "/demo/devis";
  return "/demo";
}

function categoryLabel(category: TodayAction["category"]) {
  const labels: Record<TodayAction["category"], string> = { COMMERCIAL: "DEVIS & CLIENTS", CHANTIER: "CHANTIER", RAPPORT: "RAPPORT TERRAIN", FACTURE: "FACTURE", ENTRETIEN: "ENTRETIEN", OBLIGATION: "OBLIGATION CVC", TERRAIN: "TERRAIN", SESIRA: "ÉTAT SESIRA" };
  return labels[category];
}
function categoryInitial(category: TodayAction["category"]) { return ({ COMMERCIAL: "D", CHANTIER: "C", RAPPORT: "R", FACTURE: "F", ENTRETIEN: "M", OBLIGATION: "O", TERRAIN: "T", SESIRA: "S" } as const)[category]; }
function value(input: number | null) { return input === null ? "—" : String(input); }
