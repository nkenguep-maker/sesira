import type { Metadata } from "next";
import Link from "next/link";

import { SesiraLogo } from "@/components/sesira/logo";

export const metadata: Metadata = {
  title: "SESIRA | Le système opérationnel des PME CVC",
  description:
    "SESIRA relie commercial, terrain, administratif, facturation, maintenance, croissance et obligations pour faire avancer chaque dossier jusqu'à la prochaine étape.",
};

const TODAY_ITEMS = [
  {
    kind: "DEVIS",
    title: "18 450 € · Sophie Lefèvre",
    detail: "Aucune réponse depuis 6 jours. Une relance est prête à être revue.",
    action: "Décider",
  },
  {
    kind: "INTERVENTION",
    title: "Dupont SARL",
    detail: "Vente gagnée. Aucune intervention n'est encore planifiée.",
    action: "Planifier",
  },
  {
    kind: "RAPPORT TERRAIN",
    title: "Intervention #1842",
    detail: "Rapport complété. Une validation humaine reste nécessaire.",
    action: "Valider",
  },
  {
    kind: "FACTURE",
    title: "12 400 €",
    detail: "Promesse de paiement attendue vendredi.",
    action: "Suivre",
  },
  {
    kind: "MAINTENANCE",
    title: "Martin & Fils",
    detail: "Renouvellement à examiner dans 26 jours.",
    action: "Examiner",
  },
] as const;

const CORE_PRODUCTS = [
  {
    number: "01",
    title: "VENDRE",
    headline: "Du premier contact à la décision commerciale.",
    detail: "Clients, opportunités, devis, variantes, relances, objections et prochaine action restent reliés au même dossier.",
    outcome: "Voir immédiatement ce qui attend encore une réponse ou une décision.",
  },
  {
    number: "02",
    title: "EXÉCUTER",
    headline: "De la vente gagnée au travail réellement réalisé.",
    detail: "Interventions, planification, terrain, rapports, validations et documents partagent le contexte commercial d'origine.",
    outcome: "Éviter qu'une vente gagnée se perde entre le bureau et le terrain.",
  },
  {
    number: "03",
    title: "ENCAISSER",
    headline: "De la facture émise au dossier réellement réglé.",
    detail: "Échéances, retards, promesses de paiement, litiges et décisions de suivi restent visibles sans automatiser les arbitrages sensibles.",
    outcome: "Savoir quels dossiers financiers demandent réellement une action.",
  },
  {
    number: "04",
    title: "ENTRETENIR",
    headline: "Du chantier ponctuel à la relation récurrente.",
    detail: "Contrats de maintenance, visites, besoins à venir et renouvellements prolongent le dossier au-delà de l'installation initiale.",
    outcome: "Transformer davantage de chantiers en relations longues.",
  },
] as const;

const PLATFORM_LAYERS = [
  {
    title: "Croissance",
    text: "Leads, campagnes, contenus, conversations et attribution séparant ce qui est observé, estimé ou inconnu.",
    tag: "ACQUISITION",
  },
  {
    title: "Terrain mobile",
    text: "Le technicien retrouve son intervention, le contexte utile, les documents et le rapport attendu depuis une interface pensée pour le terrain.",
    tag: "MOBILE",
  },
  {
    title: "Réception & conversations",
    text: "Les échanges entrants restent reliés au client et au dossier. Les interactions assistées gardent une reprise humaine claire.",
    tag: "CONVERSATIONS",
  },
  {
    title: "Obligations métier",
    text: "Préparation des données F-Gas, CERFA, bilan annuel et facturation électronique via les flux et prestataires prévus pour ces obligations.",
    tag: "RÉGLEMENTAIRE",
  },
  {
    title: "Automatisations",
    text: "Chaque règle progresse de l'observation à l'automatique selon une politique explicite, avec stop conditions et traces de décision.",
    tag: "CONTRÔLE",
  },
  {
    title: "Control Center",
    text: "Coûts, exécutions, erreurs, sécurité, récupération et comportement des automatisations restent pilotables depuis un même point.",
    tag: "PILOTAGE",
  },
] as const;

const AUTOMATION_LEVELS = [
  ["01", "Observation", "SESIRA regarde, mesure et structure les faits."],
  ["02", "Shadow", "SESIRA montre ce qu'il aurait préparé sans agir à l'extérieur."],
  ["03", "Approbation", "SESIRA prépare. Votre équipe valide avant l'action."],
  ["04", "Automatique", "Uniquement pour les règles bornées et explicitement autorisées."],
] as const;

const WORK_SPLIT = [
  ["Surveiller les dossiers", "Décider d'un prix"],
  ["Préparer une relance", "Accorder une remise"],
  ["Repérer un retard", "Traiter un litige"],
  ["Préparer des données réglementaires", "Valider une action externe"],
] as const;

const JOURNEY = [
  "Demande",
  "Devis",
  "Intervention",
  "Rapport",
  "Facture",
  "Maintenance",
  "Nouvelle opportunité",
] as const;

export default function HomePage() {
  return (
    <main className="cvc-shell">
      <nav className="cvc-nav" aria-label="Navigation principale">
        <Link href="/" aria-label="SESIRA"><SesiraLogo /></Link>
        <div className="cvc-nav-links">
          <a href="#produit">Produit</a>
          <a href="#plateforme">Plateforme</a>
          <a href="#controle">Contrôle</a>
          <a href="#cvc">Pour le CVC</a>
          <Link className="cvc-nav-login" href="/login">Connexion</Link>
          <a className="button primary small" href="mailto:paul@sesira.fr?subject=Démo%20SESIRA">Demander une démo</a>
        </div>
      </nav>

      <header className="cvc-hero">
        <div className="cvc-hero-copy">
          <span className="cvc-kicker">SESIRA · LE SYSTÈME OPÉRATIONNEL DES PME CVC</span>
          <h1>Votre entreprise sait ce qui doit se passer ensuite.</h1>
          <p className="cvc-hero-lede">
            SESIRA relie commercial, terrain, administratif, facturation, maintenance et croissance pour faire avancer chaque dossier jusqu'à la prochaine étape — et faire remonter ce qui s'est arrêté.
          </p>
          <div className="cvc-actions">
            <a className="button primary" href="mailto:paul@sesira.fr?subject=Démo%20SESIRA">Voir SESIRA en action</a>
            <Link className="cvc-text-link" href="/diagnostic">Faire le diagnostic gratuit</Link>
          </div>
          <small>Démo ciblée sur vos flux · diagnostic sans compte · aucune carte bancaire</small>
        </div>

        <div className="cvc-hero-product">
          <div className="cvc-hero-product-meta">
            <span>AUJOURD'HUI</span>
            <b>5 sujets demandent votre attention</b>
          </div>
          <TodayPreview compact />
          <div className="cvc-hero-proof-row">
            <div><strong>1</strong><span>décision sensible</span></div>
            <div><strong>2</strong><span>ruptures opérationnelles</span></div>
            <div><strong>2</strong><span>échéances à suivre</span></div>
          </div>
        </div>
      </header>

      <section id="produit" className="cvc-section cvc-journey-section">
        <div className="cvc-section-head cvc-section-head-wide">
          <span>01 · UNE SEULE CHAÎNE OPÉRATIONNELLE</span>
          <h2>Le problème n'est pas le manque d'outils. C'est ce qui se perd entre eux.</h2>
          <p>
            Le commercial connaît le devis. Le terrain connaît l'intervention. L'administratif connaît la facture. SESIRA conserve le fil entre les étapes et signale lorsqu'une transition attendue n'a pas eu lieu.
          </p>
        </div>

        <div className="cvc-journey-line" aria-label="Parcours client SESIRA">
          {JOURNEY.map((item, index) => (
            <div key={item} className="cvc-journey-step">
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{item}</strong>
              {index < JOURNEY.length - 1 ? <b aria-hidden="true">→</b> : null}
            </div>
          ))}
        </div>

        <div className="cvc-rupture-grid">
          <article>
            <span>RUPTURE 01</span>
            <h3>Un devis part. Personne ne reprend le dossier.</h3>
            <p>SESIRA garde la prochaine action visible et fait remonter les dossiers qui restent sans suite.</p>
          </article>
          <article>
            <span>RUPTURE 02</span>
            <h3>Une vente est gagnée. Le terrain ne reçoit pas la suite.</h3>
            <p>Le contexte commercial suit le dossier jusqu'à l'intervention, au rapport et aux documents.</p>
          </article>
          <article>
            <span>RUPTURE 03</span>
            <h3>Le travail est fait. L'argent ou le renouvellement n'arrive pas.</h3>
            <p>Factures, promesses, maintenance et prochaines opportunités restent dans la continuité du même client.</p>
          </article>
        </div>
      </section>

      <section id="plateforme" className="cvc-section cvc-platform-section">
        <div className="cvc-section-head cvc-section-head-wide">
          <span>02 · LES PRODUITS PHARES</span>
          <h2>Quatre espaces qui suivent la réalité de votre entreprise.</h2>
          <p>Pas une collection de modules sans lien. Chaque espace reprend le dossier là où le précédent l'a laissé.</p>
        </div>

        <div className="cvc-core-grid">
          {CORE_PRODUCTS.map((product) => (
            <article key={product.title}>
              <div className="cvc-core-top"><span>{product.number}</span><b>{product.title}</b></div>
              <h3>{product.headline}</h3>
              <p>{product.detail}</p>
              <div className="cvc-core-outcome"><span>CE QUE VOUS GAGNEZ</span><strong>{product.outcome}</strong></div>
            </article>
          ))}
        </div>
      </section>

      <section id="aujourdhui" className="cvc-section cvc-today-section">
        <div className="cvc-section-head cvc-section-head-wide">
          <span>03 · LA FEATURE SIGNATURE</span>
          <h2>SESIRA Aujourd'hui transforme toute la plateforme en une seule question : que dois-je traiter maintenant ?</h2>
          <p>
            Les exceptions commerciales, opérationnelles, financières et de maintenance remontent au même endroit avec leur contexte et la décision attendue.
          </p>
        </div>
        <TodayPreview />
      </section>

      <section className="cvc-section cvc-depth-section">
        <div className="cvc-section-head cvc-section-head-wide">
          <span>04 · LA PROFONDEUR DE PLATEFORME</span>
          <h2>Le dossier continue après la vente — SESIRA aussi.</h2>
          <p>Autour du cœur Vendre / Exécuter / Encaisser / Entretenir, la plateforme couvre les couches qui font fonctionner une PME CVC moderne.</p>
        </div>
        <div className="cvc-layer-grid">
          {PLATFORM_LAYERS.map((layer) => (
            <article key={layer.title}>
              <span>{layer.tag}</span>
              <h3>{layer.title}</h3>
              <p>{layer.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="controle" className="cvc-section cvc-control-section">
        <div className="cvc-section-head cvc-section-head-wide cvc-section-head-dark">
          <span>05 · AUTOMATISER SANS PERDRE LE CONTRÔLE</span>
          <h2>Automatisez le normal. Faites remonter l'exception. Gardez la décision.</h2>
          <p>
            L'intelligence de SESIRA propose, structure et prépare. L'autorisation reste déterministe et les décisions sensibles restent humaines.
          </p>
        </div>

        <div className="cvc-automation-grid">
          {AUTOMATION_LEVELS.map(([number, title, description]) => (
            <article key={title}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>

        <div className="cvc-control-grid">
          <div className="cvc-decision-card">
            <span>EXCEPTION COMMERCIALE</span>
            <h3>Sophie Lefèvre · 18 450 € HT</h3>
            <blockquote>« Nous sommes toujours intéressés, mais le tarif dépasse un peu notre budget. »</blockquote>
            <p>SESIRA fait remonter le contexte et prépare la suite. La négociation reste entre les mains de votre équipe.</p>
          </div>
          <div className="cvc-work-split">
            <div><b>SESIRA PRÉPARE</b><b>VOTRE ÉQUIPE DÉCIDE</b></div>
            {WORK_SPLIT.map(([sesira, human]) => (
              <div key={sesira}><span>{sesira}</span><strong>{human}</strong></div>
            ))}
          </div>
        </div>
      </section>

      <section id="cvc" className="cvc-section cvc-cvc-section">
        <div className="cvc-cvc-grid">
          <div className="cvc-section-head">
            <span>06 · PENSÉ POUR LE CVC</span>
            <h2>Votre métier ne s'arrête pas au CRM.</h2>
            <p>
              Une entreprise CVC vend, planifie, intervient, documente, facture, entretient, renouvelle et doit gérer des obligations métier. SESIRA a été pensé autour de cette chaîne complète.
            </p>
          </div>

          <div className="cvc-cvc-stack">
            <article><span>VENTE</span><strong>Devis, variantes, objections, relances et opportunités.</strong></article>
            <article><span>TERRAIN</span><strong>Interventions, techniciens, rapports et documents.</strong></article>
            <article><span>REVENUS</span><strong>Factures, échéances, promesses et litiges.</strong></article>
            <article><span>MAINTENANCE</span><strong>Contrats, visites, renouvellements et besoins futurs.</strong></article>
            <article><span>OBLIGATIONS</span><strong>Données F-Gas, CERFA, bilan annuel et flux de facturation électronique.</strong></article>
          </div>
        </div>
      </section>

      <section className="cvc-section cvc-reg-section">
        <div className="cvc-reg-grid">
          <div>
            <span>RÉGLEMENTAIRE</span>
            <h2>Les obligations rejoignent enfin le flux opérationnel.</h2>
          </div>
          <div className="cvc-reg-copy">
            <p>SESIRA prépare les données et les pièces nécessaires à partir du dossier déjà suivi dans la plateforme.</p>
            <div className="cvc-reg-points">
              <div><strong>F-Gas & CERFA</strong><span>Données d'intervention et éléments à préparer pour le suivi annuel.</span></div>
              <div><strong>Facturation électronique</strong><span>Flux préparés pour passer par le prestataire connecté prévu pour la transmission.</span></div>
              <div><strong>Validation humaine</strong><span>Aucune action réglementaire externe ne part sans validation explicite.</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="cvc-section cvc-founder-section">
        <div className="cvc-founder-grid">
          <div>
            <span>FONDATEUR</span>
            <h2>Paul Nkengue</h2>
            <strong>Mathématicien · Expert en vente B2B</strong>
          </div>
          <div>
            <p>SESIRA vient d'une observation répétée sur le terrain : les entreprises ne perdent pas seulement des dossiers parce qu'elles manquent d'information. Elles les perdent parce que personne ne voit qu'une étape attendue n'a jamais eu lieu.</p>
            <p>La vente apporte la compréhension du flux réel. Les mathématiques apportent une discipline simple : distinguer ce qui est observé, ce qui est estimé et ce qui reste inconnu.</p>
          </div>
        </div>
      </section>

      <section id="demo" className="cvc-section cvc-cta-section">
        <div className="cvc-cta-panel">
          <div>
            <span>VOIR SESIRA SUR VOTRE ENTREPRISE</span>
            <h2>Montrez-nous votre parcours actuel. Nous vous montrons où SESIRA prend le relais.</h2>
            <p>Pas de prix d'appel artificiel. La démonstration sert à cadrer votre flux, vos priorités et le périmètre réellement utile.</p>
          </div>
          <div className="cvc-cta-actions">
            <a className="button primary" href="mailto:paul@sesira.fr?subject=Démo%20SESIRA">Demander une démo</a>
            <Link className="button cvc-secondary-button" href="/diagnostic">Faire le diagnostic gratuit</Link>
            <small>Founder-led · ciblé PME CVC · sans engagement</small>
          </div>
        </div>
      </section>

      <footer className="cvc-footer">
        <SesiraLogo />
        <p>Automatisez le normal. Traitez l'exception. Gardez la décision.</p>
        <div><a href="#plateforme">Plateforme</a><Link href="/diagnostic">Diagnostic</Link><Link href="/login">Connexion</Link></div>
        <span>© 2026 SESIRA</span>
      </footer>
    </main>
  );
}

function TodayPreview({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "cvc-today-preview compact" : "cvc-today-preview"} aria-label="Exemple de la vue SESIRA Aujourd'hui">
      <div className="cvc-product-chrome">
        <div><i /><i /><i /></div>
        <span>SESIRA · AUJOURD'HUI</span>
        <b>EXEMPLE · DONNÉES FICTIVES</b>
      </div>
      <div className="cvc-product-body">
        <div className="cvc-product-heading">
          <div><span>AUJOURD'HUI</span><h3>Vue d'ensemble</h3><p>Ce qui mérite une action dans votre entreprise.</p></div>
          <div className="cvc-product-count"><strong>5</strong><span>à traiter</span></div>
        </div>
        <div className="cvc-today-list">
          {TODAY_ITEMS.map((item) => (
            <article key={`${item.kind}-${item.title}`}>
              <div className="cvc-today-copy"><span>{item.kind}</span><strong>{item.title}</strong><p>{item.detail}</p></div>
              <b>{item.action}</b>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
