import Link from "next/link";

export const dynamic = "force-static";

const DEMO_DECISIONS = [
  {
    id: "d1",
    code: "D",
    kind: "commercial",
    title: "Devis 4 820 € — Boulangerie Marchand",
    tag: "Climatisation VRV",
    age: "Il y a 3 h",
    detail: "Réponse reçue avec accord de principe par courriel. Planning prévisionnel prêt.",
    action: "Valider & Planifier",
    href: "/demo/devis",
    priority: 1,
  },
  {
    id: "d2",
    code: "F",
    kind: "facture",
    title: "Facture 12 400 € — Hypermarché Carrefour Market",
    tag: "Chambre froide négative",
    age: "Échue depuis 8 jours",
    detail: "Relance niveau 2 préparée avec accusé de livraison et attestation CERFA jointe.",
    action: "Vérifier la relance",
    href: "/demo/factures",
    priority: 1,
  },
  {
    id: "d3",
    code: "R",
    kind: "obligation",
    title: "Contrôle d’étanchéité périodique — 3 groupes frigorifiques",
    tag: "Lidl Échirolles",
    age: "Échéance J-6",
    detail: "Charge totale > 50 Teq CO₂. Fiche d’intervention à préparer avant déplacement.",
    action: "Préparer la fiche",
    href: "/demo/obligations",
    priority: 1,
  },
  {
    id: "d4",
    code: "T",
    kind: "terrain",
    title: "Rapport #INT-409 — Julien B. chez Pharmacie Centrale",
    tag: "R449A · 1,8 kg",
    age: "Il y a 45 min",
    detail: "Remplacement compresseur renseigné, test pression N₂ effectué, rapport à approuver.",
    action: "Approuver le rapport",
    href: "/demo/documents",
    priority: 2,
  },
  {
    id: "d5",
    code: "C",
    kind: "commercial",
    title: "Renouvellement contrat annuel — Clinique du Mail · 24 800 € / an",
    tag: "Multi-sites CVC",
    age: "Échéance J-45",
    detail: "Proposition calculée à partir du contrat existant. Validation humaine encore requise.",
    action: "Vérifier la proposition",
    href: "/demo/maintenance",
    priority: 2,
  },
] as const;

const DEMO_MONEY = [
  {
    label: "Devis en attente",
    value: "48 650 €",
    meta: "+12 % sur 30 jours · 8 dossiers",
    footLabel: "Délai moyen réponse",
    footValue: "4,2 jours",
    attention: false,
    href: "/demo/devis",
  },
  {
    label: "Vendu non planifié",
    value: "34 200 €",
    meta: "5 chantiers signés · 9 climatiseurs prêts",
    footLabel: "Capacité équipe",
    footValue: "3 techniciens J+2",
    attention: false,
    href: "/demo/interventions",
  },
  {
    label: "Factures échues à recouvrer",
    value: "21 800 €",
    meta: "4 créances ouvertes · ancienneté < 20 j",
    footLabel: "Préparées",
    footValue: "2 relances",
    attention: true,
    href: "/demo/factures",
  },
  {
    label: "Contrats < 60 jours",
    value: "76 500 €",
    meta: "11 contrats clés · renouvellements à préparer",
    footLabel: "Renouvellement",
    footValue: "À vérifier",
    attention: false,
    href: "/demo/maintenance",
  },
] as const;

const DEMO_FIELD = [
  {
    initials: "JB",
    name: "Julien B.",
    van: "Camionnette 04",
    location: "Grenoble Sud",
    status: "En cours",
    tone: "good",
    title: "Chambre froide positive (+2°C)",
    site: "Boucherie des Halles · R452A",
    detail: "Étape 2/3 · tirage au vide",
    foot: "Débuté à 10:30 · sonde Testo connectée",
  },
  {
    initials: "MD",
    name: "Marc D.",
    van: "Camionnette 02",
    location: "Valence",
    status: "En route",
    tone: "cyan",
    title: "Dépannage CTA Air Neuf",
    site: "Laboratoire Biomédic · défaut débit",
    detail: "Arrivée estimée dans 14 min",
    foot: "Tournée planifiée · véhicule 02",
  },
  {
    initials: "TL",
    name: "Thomas L.",
    van: "Camionnette 01",
    location: "Crolles",
    status: "Terminée",
    tone: "neutral",
    title: "Contrôle annuel étanchéité",
    site: "Entrepôt logistique · 6 groupes",
    detail: "Rapport généré · CERFA prêt",
    foot: "Temps passé 2 h 15 · anomalie renseignée",
  },
  {
    initials: "AV",
    name: "Antoine V.",
    van: "Atelier",
    location: "Départ 13:30",
    status: "Prévue",
    tone: "neutral",
    title: "Maintenance PAC Hybride",
    site: "Résidence Les Cèdres · R32",
    detail: "Matériel & fluide chargés",
    foot: "Charge R32 · 4,5 kg · lot B49-2026",
  },
] as const;

export default function DemoTodayPage() {
  return (
    <div className="command-dashboard stitch-faithful-dashboard demo-command-dashboard">
      <header className="stitch-hero-card">
        <div className="stitch-hero-copy">
          <div className="stitch-hero-kickers">
            <span className="stitch-live-chip"><span />Supervision temps réel</span>
            <span>ISÈRE & RHÔNE-ALPES</span>
          </div>
          <h1>Bonjour Laurent, <strong>5 décisions</strong> requièrent votre validation aujourd’hui</h1>
          <p>SESIRA a préparé 3 relances automatiques et synchronisé 8 rapports d’intervention sans conflit télémétrique.</p>
        </div>

        <div className="stitch-hero-actions" aria-label="Modes de démonstration">
          <div className="stitch-mode-switch">
            <span className="active">Mode nominal</span>
            <span>Observation</span>
            <span>File vidée</span>
          </div>
          <div className="stitch-hero-action-row">
            <Link href="/demo/automatisations">Pause auto</Link>
            <Link href="/demo/documents">Export</Link>
          </div>
        </div>
      </header>

      <section className="stitch-section stitch-decisions-section" aria-labelledby="demo-decision-heading">
        <div className="stitch-section-title-row">
          <div className="stitch-title-with-badge">
            <h2 id="demo-decision-heading">File de Décisions Immédiates</h2>
            <span className="stitch-waiting-badge">5 en attente</span>
          </div>
          <span className="stitch-sort-label">Triée par valeur × urgence</span>
        </div>

        <div className="stitch-decision-stack">
          {DEMO_DECISIONS.map((item) => (
            <article className={`stitch-decision-row stitch-kind-${item.kind}`} key={item.id}>
              <span className="stitch-decision-code" aria-label={item.kind}>{item.code}</span>
              <div className="stitch-decision-body">
                <div className="stitch-decision-titleline">
                  <h3>{item.title}</h3>
                  <span className="stitch-inline-tag">{item.tag}</span>
                  <span className={item.kind === "facture" ? "stitch-age critical" : "stitch-age"}>{item.age}</span>
                </div>
                <p><strong>Statut :</strong> {item.detail}</p>
              </div>
              <div className="stitch-decision-actions">
                <Link className={item.priority === 1 ? "primary" : ""} href={item.href}>{item.action}</Link>
                <Link href={item.href}>Détails</Link>
              </div>
            </article>
          ))}
        </div>

        <div className="stitch-day-progress">
          <div className="stitch-progress-copy">
            <span className="stitch-progress-icon" aria-hidden="true" />
            <div><small>Progression de la journée</small><strong>4 décisions traitées sur 9 (44%) — <em>12 270 € sécurisés ce matin</em></strong></div>
          </div>
          <div className="stitch-progress-track"><span /></div>
        </div>
      </section>

      <section className="stitch-section" aria-labelledby="demo-money-heading">
        <div className="stitch-section-title-row stitch-title-with-subtitle">
          <div>
            <h2 id="demo-money-heading">Cockpit Financier & Cash-Flow</h2>
            <p>Vision consolidée des flux contractuels et des en-cours de facturation HVAC</p>
          </div>
          <span className="stitch-data-source">Actualisé démo · ERP / comptabilité</span>
        </div>

        <div className="stitch-money-grid">
          {DEMO_MONEY.map((item) => (
            <Link className={item.attention ? "stitch-money-card attention" : "stitch-money-card"} href={item.href} key={item.label}>
              <div className="stitch-money-head"><span>{item.label}</span><span>◫</span></div>
              <strong>{item.value}</strong>
              <p>{item.meta}</p>
              <div className="stitch-money-foot"><span>{item.footLabel}</span><strong>{item.footValue}</strong></div>
            </Link>
          ))}
        </div>
      </section>

      <section className="stitch-section" aria-labelledby="demo-field-heading">
        <div className="stitch-section-title-row stitch-title-with-subtitle">
          <div>
            <h2 id="demo-field-heading">Aujourd’hui sur le Terrain</h2>
            <p>Suivi opérationnel des interventions, étapes de tirage au vide et remontées terrain</p>
          </div>
          <span className="stitch-connection-pill"><span />4 tablettes connectées · 0 conflit de synchronisation</span>
        </div>

        <div className="stitch-field-grid">
          {DEMO_FIELD.map((row) => (
            <Link className="stitch-field-card" href="/demo/interventions" key={row.name}>
              <div className="stitch-field-person">
                <span className="stitch-field-avatar">{row.initials}</span>
                <div><strong>{row.name}</strong><span>{row.van} · {row.location}</span></div>
                <span className={`stitch-field-status ${row.tone}`}>{row.status}</span>
              </div>
              <div className="stitch-field-job">
                <strong>{row.title}</strong>
                <span>{row.site}</span>
                <b>{row.detail}</b>
              </div>
              <div className="stitch-field-foot">{row.foot}</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="stitch-regulatory-panel" aria-labelledby="demo-reg-heading">
        <div className="stitch-reg-header">
          <div>
            <h2 id="demo-reg-heading">Suivi F-Gas & Traçabilité CERFA 15497*04</h2>
            <p>Registre de démonstration · aucune qualification réglementaire réelle</p>
          </div>
          <span className="stitch-reg-capacity">Attestation de capacité · exemple de démonstration</span>
        </div>

        <div className="stitch-reg-grid">
          <article>
            <small>Bilan annuel fluides frigorigènes</small>
            <strong>482,4 kg</strong>
            <p>R134a, R404A/R449A, R32 et R410A suivis dans le jeu de données fictif.</p>
            <div><span>J-112 avant le 31 janvier</span><b>À préparer</b></div>
          </article>
          <article className="attention">
            <small>À compléter</small>
            <strong>2 fiches d’intervention</strong>
            <p>Informations manquantes sur deux interventions avant génération documentaire.</p>
            <div><span>Action humaine</span><b>2 fiches</b></div>
          </article>
          <article>
            <small>Parc outillage & balances</small>
            <strong>6 balances étalonnées</strong>
            <p>Dates d’étalonnage de démonstration associées aux équipements de mesure.</p>
            <div><span>Prochaine échéance</span><b>18 oct. 2026</b></div>
          </article>
        </div>
      </section>

      <footer className="stitch-dashboard-footer">
        <span>© 2026 SESIRA OS — Système d’exploitation génie climatique & froid commercial.</span>
        <span>Démonstration · aucune action externe</span>
      </footer>
    </div>
  );
}
