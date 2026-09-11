import Link from "next/link";

import { StatusPill } from "@/components/sesira/ui";

export const dynamic = "force-static";

const DECISIONS = [
  { id: "d1", category: "DEVIS", title: "Sophie Lefèvre · DV-2026-0421", detail: "18 450 € · aucune réponse enregistrée depuis 7 jours", action: "Voir le devis", href: "/demo/devis", priority: 1, observed: "Il y a 3 h", tone: "blue" },
  { id: "d2", category: "FACTURE", title: "Garage Montreuil · F-2026-0418", detail: "Promesse de règlement du 3 septembre dépassée", action: "Décider du suivi", href: "/demo/factures", priority: 1, observed: "8 jours de retard", tone: "rose" },
  { id: "d3", category: "CHANTIER", title: "Dupont SARL · DV-2026-0412", detail: "Devis gagné à 22 400 € sans intervention planifiée", action: "Planifier", href: "/demo/interventions", priority: 1, observed: "Depuis hier", tone: "amber" },
  { id: "d4", category: "TERRAIN", title: "Boulangerie Rivet · INT-1842", detail: "Rapport terrain relu · compte rendu prêt à vérifier", action: "Vérifier", href: "/demo/documents", priority: 2, observed: "Il y a 45 min", tone: "green" },
  { id: "d5", category: "MAINTENANCE", title: "Martin & Fils · CE-2026-0019", detail: "Contrat à préparer avant son échéance du 30 septembre", action: "Voir le contrat", href: "/demo/maintenance", priority: 2, observed: "Échéance J-19", tone: "violet" },
] as const;

const FIELD = [
  { id: "i1", time: "08:00", title: "Remplacement pressostat chambre froide", person: "Karim D.", location: "Grenoble", status: "Terminée", tone: "green" },
  { id: "i2", time: "10:15", title: "Préparation remplacement groupe froid", person: "Marc D.", location: "Grenoble", status: "En cours", tone: "blue" },
  { id: "i3", time: "11:30", title: "Contrôle groupe froid 02", person: "Sarah M.", location: "Grenoble", status: "Sur place", tone: "amber" },
  { id: "i4", time: "13:45", title: "Diagnostic réseau eau glacée", person: "Marc D.", location: "Grenoble", status: "Confirmée", tone: "neutral" },
  { id: "i5", time: "15:30", title: "Maintenance PAC bureaux", person: "Lina K.", location: "Échirolles", status: "Planifiée", tone: "neutral" },
] as const;

export default function DemoDashboardPage() {
  return (
    <div className="sesira-home">
      <header className="sesira-home-header">
        <div>
          <div className="sesira-home-kicker">Aujourd’hui · 11 septembre 2026</div>
          <h1>Voici ce qui compte.</h1>
          <p>THERMOPRO SERVICES · Observation + validation</p>
        </div>
        <div className="sesira-home-actions">
          <Link className="sesira-btn secondary" href="/demo/relances">Voir tout</Link>
          <Link className="sesira-btn primary" href="/demo/interventions">Planning du jour</Link>
        </div>
      </header>

      <section className="sesira-read-warning">
        <StatusPill>Données fictives</StatusPill>
        <span>Même interface que l’application principale. Aucun envoi, paiement ou dépôt externe n’est effectué depuis la démo.</span>
      </section>

      <section className="sesira-metric-grid" aria-label="Résumé du jour">
        <MetricCard label="À décider" value="5" meta="5 sujets attendent un geste" href="/demo/relances" tone="violet" icon="!" />
        <MetricCard label="Devis en attente" value="64 450 €" meta="3 dossiers" href="/demo/devis" tone="blue" icon="D" />
        <MetricCard label="Factures échues" value="21 800 €" meta="2 créances" href="/demo/factures" tone="rose" icon="€" />
        <MetricCard label="Terrain aujourd’hui" value="5" meta="1 rapport à valider" href="/demo/interventions" tone="green" icon="T" />
      </section>

      <div className="sesira-home-primary-grid">
        <section className="sesira-panel sesira-priority-panel" aria-labelledby="demo-priorities-title">
          <div className="sesira-panel-heading">
            <div><span className="sesira-panel-kicker">Priorités</span><h2 id="demo-priorities-title">À faire maintenant</h2></div>
          </div>
          <div className="sesira-priority-list">
            {DECISIONS.map((item) => (
              <article className="sesira-priority-row" key={item.id}>
                <span className={`sesira-priority-icon tone-${item.tone}`}>{item.category.slice(0, 1)}</span>
                <div className="sesira-priority-copy">
                  <div className="sesira-priority-meta"><span>{item.category}</span><time>{item.observed}</time></div>
                  <h3>{item.title}</h3>
                  <p>{item.detail}</p>
                </div>
                <Link className={item.priority === 1 ? "sesira-row-action primary" : "sesira-row-action"} href={item.href}>{item.action}</Link>
              </article>
            ))}
          </div>
        </section>

        <section className="sesira-panel sesira-field-panel" aria-labelledby="demo-field-title">
          <div className="sesira-panel-heading">
            <div><span className="sesira-panel-kicker">Terrain</span><h2 id="demo-field-title">Aujourd’hui</h2></div>
            <Link href="/demo/interventions">Planning</Link>
          </div>
          <div className="sesira-field-summary">
            <span><strong>5</strong> interventions</span>
            <span><strong>1</strong> rapport</span>
            <span><strong>0</strong> conflit</span>
          </div>
          <div className="sesira-field-list">
            {FIELD.map((row) => (
              <Link className="sesira-field-row" href="/demo/interventions" key={row.id}>
                <time>{row.time}</time>
                <div><strong>{row.title}</strong><span>{row.person} · {row.location}</span></div>
                <span className={`sesira-status tone-${row.tone}`}>{row.status}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <div className="sesira-home-secondary-grid">
        <section className="sesira-panel" aria-labelledby="demo-money-title">
          <div className="sesira-panel-heading"><div><span className="sesira-panel-kicker">Argent</span><h2 id="demo-money-title">À surveiller</h2></div><Link href="/demo/factures">Finances</Link></div>
          <div className="sesira-watch-list">
            <WatchRow label="Vendu non planifié" value="22 400 €" meta="1 affaire" href="/demo/interventions" />
            <WatchRow label="Contrats à renouveler < 60 j" value="26 640 €" meta="2 contrats" href="/demo/maintenance" />
            <WatchRow label="Devis en attente" value="64 450 €" meta="3 dossiers" href="/demo/devis" />
          </div>
        </section>

        <section className="sesira-panel" aria-labelledby="demo-reg-title">
          <div className="sesira-panel-heading"><div><span className="sesira-panel-kicker">Obligations</span><h2 id="demo-reg-title">À préparer</h2></div><Link href="/demo/obligations">Registre</Link></div>
          <div className="sesira-watch-list">
            <WatchRow label="Contrôles d’étanchéité" value="3" meta="prochaine échéance dans 9 jours" href="/demo/obligations" />
            <WatchRow label="Documents à compléter" value="2" meta="fiches d’intervention" href="/demo/documents" />
            <WatchRow label="Attestations suivies" value="2" meta="prochaine échéance 18 oct. 2026" href="/demo/obligations" />
          </div>
        </section>
      </div>
    </div>
  );
}

function MetricCard({ label, value, meta, href, tone, icon }: { label: string; value: string; meta: string; href: string; tone: "violet" | "blue" | "green" | "rose"; icon: string }) {
  return <Link className={`sesira-metric-card tone-${tone}`} href={href}><div className="sesira-metric-top"><span className="sesira-metric-icon">{icon}</span><span>{label}</span></div><strong>{value}</strong><p>{meta}</p></Link>;
}

function WatchRow({ label, value, meta, href }: { label: string; value: string; meta: string; href: string }) {
  return <Link className="sesira-watch-row" href={href}><div><strong>{label}</strong><span>{meta}</span></div><b>{value}</b></Link>;
}
