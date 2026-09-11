import Link from "next/link";

export const dynamic = "force-static";

const DECISIONS = [
  {
    id: "d1",
    code: "D",
    tone: "blue",
    category: "Devis & clients",
    age: "Il y a 3 h",
    title: "Devis 4 820 € — Boulangerie Marchand",
    detail: "Accord de principe reçu. Le planning prévisionnel est prêt.",
    action: "Valider & planifier",
    href: "/demo/devis",
    primary: true,
  },
  {
    id: "d2",
    code: "F",
    tone: "rose",
    category: "Facture",
    age: "Échue depuis 8 jours",
    title: "Facture 12 400 € — Carrefour Market",
    detail: "Relance niveau 2 préparée avec les pièces déjà disponibles.",
    action: "Vérifier la relance",
    href: "/demo/factures",
    primary: true,
  },
  {
    id: "d3",
    code: "O",
    tone: "amber",
    category: "Obligation CVC",
    age: "Échéance J-6",
    title: "Contrôle d’étanchéité — 3 groupes frigorifiques",
    detail: "La fiche d’intervention doit être préparée avant déplacement.",
    action: "Préparer la fiche",
    href: "/demo/obligations",
    primary: true,
  },
  {
    id: "d4",
    code: "R",
    tone: "green",
    category: "Rapport terrain",
    age: "Il y a 45 min",
    title: "Rapport #INT-409 — Pharmacie Centrale",
    detail: "Le rapport de Julien B. est complet et attend votre approbation.",
    action: "Approuver",
    href: "/demo/documents",
    primary: false,
  },
  {
    id: "d5",
    code: "M",
    tone: "violet",
    category: "Entretien",
    age: "Échéance J-45",
    title: "Renouvellement — Clinique du Mail · 24 800 € / an",
    detail: "La proposition est prête. Une validation humaine reste nécessaire.",
    action: "Vérifier",
    href: "/demo/maintenance",
    primary: false,
  },
] as const;

const FIELD = [
  { time: "10:30", title: "Chambre froide positive", person: "Julien B.", location: "Grenoble Sud", status: "En cours", tone: "green" },
  { time: "11:40", title: "Dépannage CTA Air Neuf", person: "Marc D.", location: "Valence", status: "Confirmée", tone: "blue" },
  { time: "13:30", title: "Maintenance PAC Hybride", person: "Antoine V.", location: "Résidence Les Cèdres", status: "À venir", tone: "neutral" },
  { time: "15:10", title: "Contrôle annuel étanchéité", person: "Thomas L.", location: "Crolles", status: "À venir", tone: "neutral" },
] as const;

export default function DemoTodayPage() {
  return (
    <div className="sesira-home demo-simple-home">
      <header className="sesira-home-header">
        <div>
          <div className="sesira-home-kicker">Aujourd’hui · jeudi 11 septembre</div>
          <h1>Voici ce qui compte.</h1>
          <p>Clim & Froid Dauphiné · Démo · Validation requise</p>
        </div>
        <div className="sesira-home-actions">
          <Link className="sesira-btn secondary" href="/demo/relances">Voir tout</Link>
          <Link className="sesira-btn primary" href="/demo/interventions">Planning du jour</Link>
        </div>
      </header>

      <section className="sesira-metric-grid" aria-label="Résumé de démonstration">
        <Metric label="À décider" value="5" meta="3 sujets prioritaires" href="/demo/relances" tone="violet" icon="!" />
        <Metric label="Devis en attente" value="48 650 €" meta="8 dossiers" href="/demo/devis" tone="blue" icon="D" />
        <Metric label="Factures échues" value="21 800 €" meta="4 créances" href="/demo/factures" tone="rose" icon="€" />
        <Metric label="Terrain aujourd’hui" value="4" meta="1 rapport à valider" href="/demo/interventions" tone="green" icon="T" />
      </section>

      <div className="sesira-home-primary-grid">
        <section className="sesira-panel sesira-priority-panel" aria-labelledby="demo-priorities-title">
          <div className="sesira-panel-heading">
            <div><span className="sesira-panel-kicker">Priorités</span><h2 id="demo-priorities-title">À faire maintenant</h2></div>
            <Link href="/demo/relances">Voir les 5</Link>
          </div>
          <div className="sesira-priority-list">
            {DECISIONS.map((item) => (
              <article className="sesira-priority-row" key={item.id}>
                <span className={`sesira-priority-icon tone-${item.tone}`}>{item.code}</span>
                <div className="sesira-priority-copy">
                  <div className="sesira-priority-meta"><span>{item.category}</span><time>{item.age}</time></div>
                  <h3>{item.title}</h3>
                  <p>{item.detail}</p>
                </div>
                <Link className={item.primary ? "sesira-row-action primary" : "sesira-row-action"} href={item.href}>{item.action}</Link>
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
            <span><strong>4</strong> interventions</span>
            <span><strong>1</strong> rapport</span>
            <span><strong>0</strong> conflit</span>
          </div>
          <div className="sesira-field-list">
            {FIELD.map((row) => (
              <Link className="sesira-field-row" href="/demo/interventions" key={`${row.time}-${row.title}`}>
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
          <div className="sesira-panel-heading">
            <div><span className="sesira-panel-kicker">Argent</span><h2 id="demo-money-title">À surveiller</h2></div>
            <Link href="/demo/factures">Finances</Link>
          </div>
          <div className="sesira-watch-list">
            <Watch label="Vendu non planifié" value="34 200 €" meta="5 affaires" href="/demo/interventions" />
            <Watch label="Contrats à renouveler < 60 j" value="76 500 €" meta="11 contrats" href="/demo/maintenance" />
            <Watch label="Devis en attente" value="48 650 €" meta="8 dossiers" href="/demo/devis" />
          </div>
        </section>

        <section className="sesira-panel" aria-labelledby="demo-reg-title">
          <div className="sesira-panel-heading">
            <div><span className="sesira-panel-kicker">Obligations</span><h2 id="demo-reg-title">À préparer</h2></div>
            <Link href="/demo/obligations">Registre</Link>
          </div>
          <div className="sesira-watch-list">
            <Watch label="Contrôles d’étanchéité" value="3" meta="prochaine échéance dans 6 jours" href="/demo/obligations" />
            <Watch label="Documents à compléter" value="2" meta="fiches d’intervention" href="/demo/documents" />
            <Watch label="Attestations suivies" value="2" meta="prochaine échéance 18 oct. 2026" href="/demo/obligations" />
          </div>
          <p className="sesira-reg-boundary">Données fictives. SESIRA prépare et signale les éléments connus ; aucun verdict réglementaire réel n’est émis.</p>
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value, meta, href, tone, icon }: { label: string; value: string; meta: string; href: string; tone: "violet" | "blue" | "green" | "rose"; icon: string }) {
  return <Link className={`sesira-metric-card tone-${tone}`} href={href}><div className="sesira-metric-top"><span className="sesira-metric-icon">{icon}</span><span>{label}</span></div><strong>{value}</strong><p>{meta}</p></Link>;
}

function Watch({ label, value, meta, href }: { label: string; value: string; meta: string; href: string }) {
  return <Link className="sesira-watch-row" href={href}><div><strong>{label}</strong><span>{meta}</span></div><b>{value}</b></Link>;
}
