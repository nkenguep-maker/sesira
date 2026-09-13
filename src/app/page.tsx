import type { Metadata } from "next";
import Link from "next/link";

import { LandingDashboardPreview } from "@/components/marketing/landing-dashboard-preview";
import { SesiraLogo } from "@/components/sesira/logo";

import styles from "./coolify-landing.module.css";

export const metadata: Metadata = {
  title: "SESIRA | Ne ratez plus ce qui compte",
  description:
    "SESIRA montre aux entreprises d’intervention ce qui doit être fait aujourd’hui, ce qui arrive bientôt et ce qui coûte déjà de l’argent.",
  openGraph: {
    title: "SESIRA | Ne ratez plus ce qui compte",
    description:
      "Devis, factures, contrats, interventions et échéances : une seule liste pour savoir quoi reprendre avant qu’il soit trop tard.",
    type: "website",
  },
};

const HERO_PRIORITIES = [
  { kind: "CONTRÔLE", name: "Clinique des Lilas", value: "avant le 18 sept.", action: "Planifier", tone: "warm" },
  { kind: "FACTURE", name: "Garage Montreuil", value: "4 820 € · +12 j", action: "Relancer", tone: "ink" },
  { kind: "DEVIS", name: "Sophie Lefèvre", value: "11 400 € · +7 j", action: "Relancer", tone: "teal" },
] as const;

const SCENARIOS = [
  {
    tag: "COMMERCIAL",
    name: "Sophie Lefèvre",
    value: "7 jours",
    title: "Le devis attend toujours une réponse",
    context: "La date de relance reste visible jusqu’à ce que le dossier avance.",
    action: "Voir le devis · relancer",
    tone: "warm",
  },
  {
    tag: "ENCAISSEMENT",
    name: "Garage Montreuil",
    value: "4 820 €",
    title: "La facture est déjà en retard",
    context: "SESIRA garde l’échéance, le retard et la prochaine action dans le même dossier.",
    action: "Voir la facture · relancer",
    tone: "ink",
  },
  {
    tag: "MAINTENANCE",
    name: "Martin & Fils",
    value: "26 jours",
    title: "Le contrat arrive au renouvellement",
    context: "Le contrat, le client, les équipements et les documents restent reliés jusqu’au renouvellement.",
    action: "Voir le contrat · préparer",
    tone: "soft",
  },
  {
    tag: "RÉGLEMENTAIRE",
    name: "Clinique des Lilas",
    value: "18 sept.",
    title: "Un contrôle doit être fait avant la date limite",
    context: "La date, l’équipement concerné et la règle utilisée restent visibles au même endroit.",
    action: "Voir l’équipement · planifier",
    tone: "teal",
  },
] as const;

export default function HomePage() {
  return (
    <main className={styles.page}>
      <nav className={styles.nav} aria-label="Navigation principale">
        <Link href="/" aria-label="SESIRA" className={styles.brand}>
          <SesiraLogo />
        </Link>
        <div className={styles.navLinks}>
          <a href="#produit">Produit</a>
          <Link href="/demo">Démo</Link>
          <Link className={styles.navLogin} href="/login">Connexion</Link>
          <Link className={styles.navCta} href="/signup">Créer un compte entreprise</Link>
        </div>
      </nav>

      <header className="landing-five-hero">
        <div className="landing-five-hero__copy">
          <span className={styles.eyebrow}>SESIRA · POUR LES ENTREPRISES D’INTERVENTION</span>
          <h1>Ne ratez plus ce qui compte.</h1>
          <p>
            Devis sans réponse, facture en retard, contrat à renouveler, intervention à planifier ou contrôle à faire : SESIRA vous montre ce qui demande votre attention aujourd’hui.
          </p>
          <div className={styles.heroActions}>
            <Link className={styles.primaryCta} href="/demo">Voir ce que SESIRA surveille</Link>
            <Link className={styles.secondaryCta} href="/signup">Créer mon espace entreprise</Link>
          </div>
          <small>Une liste claire. Des dates. Une prochaine action.</small>
        </div>

        <Link href="/demo" className="landing-five-queue" aria-label="Ouvrir la démo SESIRA">
          <div className="landing-five-queue__top">
            <div><span>AUJOURD’HUI</span><strong>5 choses à traiter</strong></div>
            <b>5</b>
          </div>
          <div className="landing-five-queue__list">
            {HERO_PRIORITIES.map((item) => (
              <article key={`${item.kind}-${item.name}`}>
                <span className={`landing-five-queue__icon ${item.tone}`}>{item.kind.slice(0, 1)}</span>
                <div><small>{item.kind}</small><strong>{item.name}</strong><span>{item.value}</span></div>
                <b>{item.action}</b>
              </article>
            ))}
          </div>
          <div className="landing-five-queue__more">
            <span>+ Intervention terminée · facture à préparer</span>
            <span>+ Martin & Fils · renouvellement dans 26 jours</span>
          </div>
        </Link>
      </header>

      <section id="produit" className="landing-five-product" aria-labelledby="product-title">
        <div className="landing-five-section-head">
          <div>
            <span className={styles.sectionEyebrow}>VOTRE MATINÉE COMMENCE ICI</span>
            <h2 id="product-title">Une seule liste pour savoir quoi faire.</h2>
          </div>
          <Link href="/demo">Ouvrir la démo complète →</Link>
        </div>
        <Link href="/demo" className="landing-five-product__stage" aria-label="Ouvrir le tableau de bord de démonstration">
          <LandingDashboardPreview />
        </Link>
      </section>

      <section id="exemples" className="landing-five-examples" aria-labelledby="examples-title">
        <div className="landing-five-section-head">
          <div>
            <span className={styles.sectionEyebrow}>TOUTES LES ÉCHÉANCES</span>
            <h2 id="examples-title">Ce qui arrive bientôt. Ce qui est déjà en retard.</h2>
          </div>
          <p>Vente, encaissement, maintenance et réglementation restent dans la même vue.</p>
        </div>
        <div className="landing-five-example-grid">
          {SCENARIOS.map((scenario) => (
            <Link href="/demo" className={`landing-five-example ${scenario.tone}`} key={scenario.name + scenario.tag}>
              <div className="landing-five-example__top"><span>{scenario.tag}</span><small>{scenario.name}</small></div>
              <strong className="landing-five-example__value">{scenario.value}</strong>
              <h3>{scenario.title}</h3>
              <p>{scenario.context}</p>
              <div className="landing-five-example__action"><span>{scenario.action}</span><b aria-hidden="true">→</b></div>
            </Link>
          ))}
        </div>
      </section>

      <section className="landing-five-guardrails" aria-labelledby="why-title">
        <div className="landing-five-guardrails__head">
          <span className={styles.sectionEyebrow}>TOUJOURS COMPRENDRE POURQUOI</span>
          <h2 id="why-title">Une alerte doit être simple à vérifier.</h2>
        </div>
        <div className="landing-five-guardrails__grid">
          <article>
            <span>LA DATE</span>
            <strong>Vous voyez ce qui déclenche l’alerte.</strong>
            <p>Date limite, retard, renouvellement ou absence de réponse : la raison reste visible.</p>
          </article>
          <article>
            <span>L’ACTION</span>
            <strong>Vous savez quoi faire ensuite.</strong>
            <p>Planifier, relancer, préparer, vérifier ou décider. SESIRA remet le dossier devant la bonne personne.</p>
          </article>
        </div>
      </section>

      <section className="landing-five-guardrails" aria-labelledby="work-title">
        <div className="landing-five-guardrails__head">
          <span className={styles.sectionEyebrow}>DU BUREAU AU TERRAIN</span>
          <h2 id="work-title">Moins de recherche. Moins de ressaisie.</h2>
        </div>
        <div className="landing-five-guardrails__grid">
          <article>
            <span>TERRAIN</span>
            <strong>Le technicien voit seulement ce qu’il doit faire.</strong>
            <p>Mission, adresse, consignes, photos, mesures et signature. Rien de plus.</p>
          </article>
          <article>
            <span>DOCUMENTS</span>
            <strong>Déposez le document. SESIRA le range au bon endroit.</strong>
            <p>Facture, contrat, rapport ou photo : le bon client et les bonnes références restent reliés au dossier.</p>
          </article>
        </div>
      </section>

      <section id="essayer" className="landing-five-offer" aria-labelledby="offer-title">
        <div className="landing-five-offer__copy">
          <span className={styles.sectionEyebrow}>TESTEZ AVEC VOS PROPRES DONNÉES</span>
          <h2 id="offer-title">Vous ne repartez pas de zéro.</h2>
          <p>
            Importez vos clients, devis, factures, équipements et contrats depuis vos fichiers CSV. Ajoutez ensuite vos documents et voyez ce que SESIRA retrouve et relie dans votre entreprise.
          </p>
        </div>
        <div className="landing-five-offer__action">
          <div><strong>Votre entreprise</strong><span>un espace séparé, prêt à tester</span></div>
          <Link className={styles.darkCta} href="/signup">Créer un compte entreprise</Link>
          <Link className={styles.secondaryCta} href="/demo">Voir d’abord la démo</Link>
        </div>
      </section>

      <footer className="landing-five-footer">SESIRA · France</footer>
    </main>
  );
}
