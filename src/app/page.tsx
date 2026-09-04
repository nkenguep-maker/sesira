import type { Metadata } from "next";
import Link from "next/link";

import { SesiraLogo } from "@/components/sesira/logo";

export const metadata: Metadata = {
  title: "SESIRA | Devis, chantiers, factures et entretien CVC",
  description:
    "SESIRA réunit devis, chantiers, factures et contrats d'entretien pour montrer chaque matin ce qui attend une action.",
};

const TODAY_ITEMS = [
  {
    kind: "DEVIS",
    title: "18 450 € · Sophie Lefèvre",
    detail: "Envoyé il y a 6 jours. Aucune relance faite.",
    action: "Relancer",
  },
  {
    kind: "CHANTIER",
    title: "Dupont SARL",
    detail: "Le client a signé. Aucune date au planning.",
    action: "Planifier",
  },
  {
    kind: "FACTURE",
    title: "12 400 €",
    detail: "Paiement annoncé vendredi. Rien reçu depuis.",
    action: "Suivre",
  },
  {
    kind: "ENTRETIEN",
    title: "Martin & Fils",
    detail: "Renouvellement dans 26 jours.",
    action: "Préparer",
  },
] as const;

const MORE_FEATURES = [
  {
    tag: "TERRAIN",
    title: "Techniciens sur mobile",
    text: "L'intervention, les documents et le rapport sont disponibles depuis le téléphone du technicien.",
  },
  {
    tag: "CLIENTS",
    title: "Appels et messages",
    text: "Les demandes entrantes restent attachées au bon client et au bon devis.",
  },
  {
    tag: "DOCUMENTS",
    title: "Rapports et pièces",
    text: "Rapports terrain, documents et validations restent avec le chantier concerné.",
  },
  {
    tag: "NOUVEAUX CLIENTS",
    title: "Campagnes et contenus",
    text: "Vous voyez quels contacts et quelles ventes viennent réellement de vos actions commerciales quand l'information existe.",
  },
  {
    tag: "OBLIGATIONS",
    title: "F-Gas, CERFA et e-facture",
    text: "SESIRA prépare les données à partir des interventions déjà saisies. Vous gardez la validation finale.",
  },
  {
    tag: "AUTOMATISATION",
    title: "Relances et tâches répétitives",
    text: "SESIRA peut d'abord préparer, puis agir seul uniquement sur les règles que vous avez autorisées.",
  },
] as const;

const AUTOMATION_STEPS = [
  ["Observe", "SESIRA regarde ce qui reste en plan."],
  ["Prépare", "Le message ou la tâche est prêt, rien ne part."],
  ["Vous validez", "Votre équipe confirme avant l'envoi."],
  ["Automatique", "Seulement pour les cas que vous avez autorisés."],
] as const;

export default function HomePage() {
  return (
    <main className="cvc-shell">
      <nav className="cvc-nav" aria-label="Navigation principale">
        <Link href="/" aria-label="SESIRA">
          <SesiraLogo />
        </Link>
        <div className="cvc-nav-links">
          <a href="#devis">Devis</a>
          <a href="#chantiers">Chantiers</a>
          <a href="#factures">Factures</a>
          <a href="#entretien">Entretien</a>
          <Link className="cvc-nav-login" href="/login">Connexion</Link>
          <a className="button primary small" href="mailto:paul@sesira.fr?subject=Démo%20SESIRA">Voir une démo</a>
        </div>
      </nav>

      <header className="cvc-hero">
        <div className="cvc-hero-copy">
          <span className="cvc-kicker">SESIRA · CHAUFFAGE · CLIMATISATION · POMPES À CHALEUR</span>
          <h1>Vos devis, vos chantiers et vos factures ne se parlent pas.</h1>
          <p className="cvc-hero-lede">
            SESIRA les réunit. Chaque matin, vous voyez quel devis rappeler, quel chantier planifier, quelle facture suivre et quel contrat d'entretien renouveler.
          </p>
          <div className="cvc-actions">
            <a className="button primary" href="mailto:paul@sesira.fr?subject=Démo%20SESIRA">Voir SESIRA avec mes cas</a>
            <Link className="cvc-text-link" href="/diagnostic">Faire le diagnostic gratuit</Link>
          </div>
          <small>Démo avec le fondateur · sans engagement</small>
        </div>

        <div className="cvc-hero-product">
          <TodayPreview compact />
        </div>
      </header>

      <section className="cvc-morning-strip" aria-label="Exemples de sujets remontés par SESIRA">
        <article>
          <span>DEVIS</span>
          <strong>18 450 €</strong>
          <p>6 jours sans réponse</p>
        </article>
        <article>
          <span>CHANTIER</span>
          <strong>1 signé</strong>
          <p>toujours sans date</p>
        </article>
        <article>
          <span>FACTURE</span>
          <strong>12 400 €</strong>
          <p>paiement annoncé vendredi</p>
        </article>
        <article>
          <span>ENTRETIEN</span>
          <strong>26 jours</strong>
          <p>avant renouvellement</p>
        </article>
      </section>

      <section className="cvc-section cvc-intro-section">
        <div className="cvc-section-head">
          <span>CE QUE VOUS DEVEZ SAVOIR LE MATIN</span>
          <h2>Qui rappeler. Quoi planifier. Quoi réclamer.</h2>
          <p>Les exemples ci-dessous utilisent des données fictives. Ils montrent le type de travail que SESIRA garde sous les yeux.</p>
        </div>
      </section>

      <section id="devis" className="cvc-feature-band">
        <div className="cvc-feature-copy">
          <span>01 · DEVIS</span>
          <h2>5 devis sans réponse. 61 300 € en attente.</h2>
          <p>SESIRA garde la date d'envoi, la réponse du client, la relance prévue et la prochaine action au même endroit.</p>
          <ul>
            <li>Voir les devis qui attendent encore une réponse.</li>
            <li>Préparer une relance sans l'envoyer à votre place.</li>
            <li>Garder une objection prix visible jusqu'à votre décision.</li>
          </ul>
        </div>
        <QuotePanel />
      </section>

      <section id="chantiers" className="cvc-feature-band reverse muted">
        <PlanningPanel />
        <div className="cvc-feature-copy">
          <span>02 · CHANTIERS</span>
          <h2>Le client a signé. Le chantier doit maintenant entrer au planning.</h2>
          <p>Le devis, la date, le technicien, les documents et le rapport restent attachés au même client.</p>
          <ul>
            <li>Repérer un chantier vendu sans date.</li>
            <li>Retrouver les informations utiles avant l'intervention.</li>
            <li>Voir les rapports terrain encore à valider.</li>
          </ul>
        </div>
      </section>

      <section id="factures" className="cvc-feature-band">
        <div className="cvc-feature-copy">
          <span>03 · FACTURES</span>
          <h2>22 400 € sont arrivés à échéance. Vous savez lesquels reprendre.</h2>
          <p>SESIRA garde les échéances, les promesses de paiement et les litiges visibles. La décision reste chez vous.</p>
          <ul>
            <li>Voir les factures qui viennent d'arriver à échéance.</li>
            <li>Noter une promesse de paiement et sa date.</li>
            <li>Sortir un litige du suivi normal jusqu'à votre décision.</li>
          </ul>
        </div>
        <InvoicePanel />
      </section>

      <section id="entretien" className="cvc-feature-band reverse muted">
        <MaintenancePanel />
        <div className="cvc-feature-copy">
          <span>04 · ENTRETIEN</span>
          <h2>Le chantier est fini. Le client peut encore rester plusieurs années.</h2>
          <p>SESIRA garde les visites, les dates et les renouvellements du contrat d'entretien avec le client.</p>
          <ul>
            <li>Voir les contrats qui arrivent à leur date de renouvellement.</li>
            <li>Préparer la prochaine visite avant qu'elle soit oubliée.</li>
            <li>Retrouver les besoins repérés lors des interventions précédentes.</li>
          </ul>
        </div>
      </section>

      <section className="cvc-today-dark">
        <div className="cvc-today-dark-inner">
          <div className="cvc-section-head light">
            <span>SESIRA AUJOURD'HUI</span>
            <h2>Ouvrez SESIRA le matin. La liste est déjà prête.</h2>
            <p>Devis sans réponse, chantier sans date, facture à reprendre, entretien à préparer : tout arrive dans la même vue.</p>
          </div>
          <TodayPreview />
        </div>
      </section>

      <section className="cvc-section cvc-more-section">
        <div className="cvc-section-head">
          <span>AUTOUR DU DEVIS, DU CHANTIER ET DE LA FACTURE</span>
          <h2>SESIRA suit aussi le travail autour.</h2>
        </div>
        <div className="cvc-more-grid">
          {MORE_FEATURES.map((item) => (
            <article key={item.title}>
              <span>{item.tag}</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="controle" className="cvc-control">
        <div className="cvc-control-inner">
          <div className="cvc-section-head light">
            <span>QUI DÉCIDE</span>
            <h2>SESIRA peut préparer une relance. Il ne baisse pas votre prix à votre place.</h2>
            <p>Prix, remise, litige, contrat important ou action réglementaire : vous gardez la main.</p>
          </div>

          <div className="cvc-control-example">
            <div className="cvc-client-message">
              <span>CLIENT · SOPHIE LEFÈVRE · DEVIS 18 450 € HT</span>
              <blockquote>« Nous sommes toujours intéressés, mais le tarif dépasse un peu notre budget. »</blockquote>
            </div>
            <div className="cvc-decision-note">
              <span>SESIRA</span>
              <strong>Réponse repérée. Relance commerciale mise en pause.</strong>
              <p>Votre équipe choisit ensuite de rappeler, négocier ou conserver le prix.</p>
            </div>
          </div>

          <div className="cvc-automation-row">
            {AUTOMATION_STEPS.map(([title, text], index) => (
              <article key={title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{title}</strong>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="cvc-section cvc-regulatory">
        <div className="cvc-regulatory-copy">
          <span>CVC · OBLIGATIONS MÉTIER</span>
          <h2>Les données F-Gas et CERFA viennent déjà du chantier.</h2>
          <p>SESIRA réutilise les informations de l'intervention pour préparer les éléments nécessaires. Les validations et les envois externes restent sous votre contrôle.</p>
        </div>
        <div className="cvc-regulatory-list">
          <div><strong>F-Gas</strong><span>Données de l'intervention regroupées.</span></div>
          <div><strong>CERFA</strong><span>Éléments du document préparés.</span></div>
          <div><strong>Facturation électronique</strong><span>Données prêtes pour le prestataire connecté.</span></div>
        </div>
      </section>

      <section className="cvc-founder">
        <div>
          <span>POURQUOI SESIRA</span>
          <h2>Paul Nkengue</h2>
          <strong>Mathématicien · Expert en vente B2B</strong>
        </div>
        <div>
          <p>J'ai vu la même situation encore et encore : le devis est bon, le client est intéressé, mais personne ne reprend le sujet au bon moment.</p>
          <p>La partie maths sert à une chose simple : si SESIRA ne sait pas, il l'affiche. Il n'invente pas un chiffre pour remplir l'écran.</p>
        </div>
      </section>

      <section id="demo" className="cvc-final-cta">
        <div>
          <span>DÉMO SESIRA</span>
          <h2>Prenez un devis, un chantier et une facture. Je vous montre ce que SESIRA en ferait.</h2>
        </div>
        <div className="cvc-final-actions">
          <a className="button primary" href="mailto:paul@sesira.fr?subject=Démo%20SESIRA">Demander une démo</a>
          <Link href="/diagnostic">Faire le diagnostic gratuit</Link>
        </div>
      </section>

      <footer className="cvc-footer">
        <SesiraLogo />
        <p>Le suivi, c'est SESIRA. Les décisions, c'est vous.</p>
        <div>
          <Link href="/diagnostic">Diagnostic</Link>
          <Link href="/login">Connexion</Link>
        </div>
        <span>© 2026 SESIRA</span>
      </footer>
    </main>
  );
}

function TodayPreview({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "cvc-today-preview compact" : "cvc-today-preview"} aria-label="Exemple de SESIRA Aujourd'hui">
      <div className="cvc-product-chrome">
        <div><i /><i /><i /></div>
        <span>SESIRA · AUJOURD'HUI</span>
        <b>EXEMPLE · DONNÉES FICTIVES</b>
      </div>
      <div className="cvc-product-body">
        <div className="cvc-product-heading">
          <div>
            <span>VENDREDI 4 SEPTEMBRE</span>
            <h3>4 choses à traiter</h3>
            <p>Avant de repartir dans les mails et le planning.</p>
          </div>
          <div className="cvc-product-count"><strong>4</strong><span>à voir</span></div>
        </div>
        <div className="cvc-today-list">
          {TODAY_ITEMS.map((item) => (
            <article key={`${item.kind}-${item.title}`}>
              <div className="cvc-today-copy">
                <span>{item.kind}</span>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </div>
              <b>{item.action}</b>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function QuotePanel() {
  const rows = [
    ["Sophie Lefèvre", "18 450 €", "6 j sans réponse"],
    ["Clima Pro", "14 900 €", "4 j sans réponse"],
    ["Martin & Fils", "11 250 €", "réponse reçue"],
    ["Résidence Voltaire", "9 800 €", "relance demain"],
    ["Benoît Martin", "6 900 €", "8 j sans réponse"],
  ] as const;
  return <DataPanel title="Devis à reprendre" meta="EXEMPLE"><div className="cvc-data-table">{rows.map(([name, amount, status]) => <div key={name}><span>{name}</span><strong>{amount}</strong><b>{status}</b></div>)}</div></DataPanel>;
}

function PlanningPanel() {
  const rows = [
    ["Dupont SARL", "PAC air/eau", "Sans date"],
    ["Résidence Hugo", "Climatisation", "12 sept."],
    ["Cabinet Lenoir", "Maintenance", "14 sept."],
    ["Martin & Fils", "Chaudière", "Sans date"],
  ] as const;
  return <DataPanel title="Planning chantier" meta="EXEMPLE"><div className="cvc-data-table planning">{rows.map(([name, job, date]) => <div key={name}><span>{name}<small>{job}</small></span><b>{date}</b></div>)}</div></DataPanel>;
}

function InvoicePanel() {
  const rows = [
    ["Dupont SARL", "12 400 €", "Promis vendredi"],
    ["SCI République", "6 800 €", "Échue hier"],
    ["Hôtel Magenta", "3 200 €", "Litige ouvert"],
  ] as const;
  return <DataPanel title="Factures à suivre" meta="EXEMPLE"><div className="cvc-data-table invoices">{rows.map(([name, amount, status]) => <div key={name}><span>{name}</span><strong>{amount}</strong><b>{status}</b></div>)}</div></DataPanel>;
}

function MaintenancePanel() {
  const rows = [
    ["Martin & Fils", "26 jours", "Renouvellement"],
    ["Cabinet Lenoir", "18 jours", "Visite annuelle"],
    ["SCI République", "42 jours", "Renouvellement"],
  ] as const;
  return <DataPanel title="Entretien à préparer" meta="EXEMPLE"><div className="cvc-data-table maintenance">{rows.map(([name, when, status]) => <div key={name}><span>{name}</span><strong>{when}</strong><b>{status}</b></div>)}</div></DataPanel>;
}

function DataPanel({ title, meta, children }: { title: string; meta: string; children: React.ReactNode }) {
  return (
    <div className="cvc-data-panel">
      <div className="cvc-data-panel-top"><span>{title}</span><b>{meta}</b></div>
      <div className="cvc-data-panel-body">{children}</div>
    </div>
  );
}
