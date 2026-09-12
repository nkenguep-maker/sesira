import type { Metadata } from "next";
import Link from "next/link";

import { LandingDashboardPreview } from "@/components/marketing/landing-dashboard-preview";
import { SesiraLogo } from "@/components/sesira/logo";

import styles from "./coolify-landing.module.css";

export const metadata: Metadata = {
  title: "SESIRA | Le suivi opérationnel des entreprises d’intervention",
  description:
    "SESIRA suit chaque dossier entre vente, planning, terrain, facturation et échéances, puis remet la prochaine décision devant la bonne personne.",
  openGraph: {
    title: "SESIRA | Le suivi opérationnel des entreprises d’intervention",
    description:
      "Du premier contact au renouvellement, SESIRA garde le contexte et fait remonter les dossiers qui attendent une décision.",
    type: "website",
  },
};

const HERO_PRIORITIES = [
  { kind: "DEVIS", name: "Sophie Lefèvre", value: "18 450 €", action: "Relancer", tone: "warm" },
  { kind: "FACTURE", name: "Garage Montreuil", value: "21 800 €", action: "Décider", tone: "ink" },
  { kind: "CHANTIER", name: "Dupont SARL", value: "22 400 €", action: "Planifier", tone: "teal" },
] as const;

const SCENARIOS = [
  {
    tag: "COMMERCIAL",
    name: "Sophie Lefèvre",
    value: "18 450 €",
    title: "Devis envoyé, réponse absente",
    context: "SESIRA garde la prochaine date de suivi, la réponse quand elle arrive et les objections qui nécessitent un humain.",
    action: "Relance · réponse · approbation",
    tone: "warm",
  },
  {
    tag: "OPÉRATIONS",
    name: "Dupont SARL",
    value: "22 400 €",
    title: "Vente gagnée, aucune date au planning",
    context: "L’affaire reste visible jusqu’à la planification, l’intervention et le rapport terrain.",
    action: "Planning · technicien · rapport",
    tone: "teal",
  },
  {
    tag: "ENCAISSEMENT",
    name: "Garage Montreuil",
    value: "21 800 €",
    title: "Promesse de règlement dépassée",
    context: "Facture, échéance, promesse de règlement et historique restent reliés au même dossier.",
    action: "Facture · échéance · suivi",
    tone: "ink",
  },
  {
    tag: "MAINTENANCE",
    name: "Martin & Fils",
    value: "26 jours",
    title: "Contrat proche de l’échéance",
    context: "Contrat, équipement, documents et échéance restent liés. Pour le CVC, SESIRA prépare aussi les éléments F-Gas et CERFA sans rendre de verdict réglementaire.",
    action: "Renouvellement · documents · CVC",
    tone: "soft",
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
          <Link href="/demo">Démo</Link>
          <a href="#exemples">Exemples</a>
          <a href="#tarifs">Tarifs</a>
          <Link className={styles.navLogin} href="/login">Connexion</Link>
          <Link className={styles.navCta} href="/diagnostic">Calculer ce qui se perd chez moi</Link>
        </div>
      </nav>

      <header className="landing-five-hero">
        <div className="landing-five-hero__copy">
          <span className={styles.eyebrow}>SESIRA · LE SUIVI OPÉRATIONNEL DES ENTREPRISES D’INTERVENTION</span>
          <h1>Chaque matin, voyez les dossiers qui attendent une décision.</h1>
          <p>
            SESIRA suit chaque dossier entre vente, terrain et encaissement. Il garde le contexte et remet la prochaine action devant la bonne personne.
          </p>
          <div className={styles.heroActions}>
            <Link className={styles.primaryCta} href="/diagnostic">Calculer ce qui se perd chez moi</Link>
            <Link className={styles.secondaryCta} href="/demo">Voir la démo</Link>
          </div>
          <small>Gratuit, sans compte, trois minutes.</small>
        </div>

        <Link href="/demo" className="landing-five-queue" aria-label="Ouvrir la démo SESIRA">
          <div className="landing-five-queue__top">
            <div><span>AUJOURD’HUI</span><strong>5 sujets à reprendre</strong></div>
            <b>5</b>
          </div>
          <div className="landing-five-queue__list">
            {HERO_PRIORITIES.map((item) => (
              <article key={item.name}>
                <span className={`landing-five-queue__icon ${item.tone}`}>{item.kind.slice(0, 1)}</span>
                <div><small>{item.kind}</small><strong>{item.name}</strong><span>{item.value}</span></div>
                <b>{item.action}</b>
              </article>
            ))}
          </div>
          <div className="landing-five-queue__more">
            <span>+ Rapport #1842 · Boulangerie Rivet</span>
            <span>+ Martin & Fils · renouvellement dans 26 jours</span>
          </div>
        </Link>
      </header>

      <section className="landing-five-product" aria-labelledby="product-title">
        <div className="landing-five-section-head">
          <div>
            <span className={styles.sectionEyebrow}>LE TABLEAU DE BORD</span>
            <h2 id="product-title">Les décisions du jour arrivent en premier.</h2>
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
            <span className={styles.sectionEyebrow}>DU PREMIER CONTACT AU RENOUVELLEMENT · DONNÉES FICTIVES</span>
            <h2 id="examples-title">Le même dossier reste suivi jusqu’à l’étape suivante.</h2>
          </div>
          <p>Commercial, planning, terrain, facturation et maintenance gardent le même contexte.</p>
        </div>
        <div className="landing-five-example-grid">
          {SCENARIOS.map((scenario) => (
            <Link href="/demo" className={`landing-five-example ${scenario.tone}`} key={scenario.name}>
              <div className="landing-five-example__top"><span>{scenario.tag}</span><small>{scenario.name}</small></div>
              <strong className="landing-five-example__value">{scenario.value}</strong>
              <h3>{scenario.title}</h3>
              <p>{scenario.context}</p>
              <div className="landing-five-example__action"><span>{scenario.action}</span><b aria-hidden="true">→</b></div>
            </Link>
          ))}
        </div>
      </section>

      <section className="landing-five-guardrails" aria-labelledby="guardrails-title">
        <div className="landing-five-guardrails__head">
          <span className={styles.sectionEyebrow}>AUTONOMIE ET VÉRITÉ</span>
          <h2 id="guardrails-title">Le produit avance seulement sur des faits et des règles explicites.</h2>
        </div>
        <div className="landing-five-guardrails__grid">
          <article>
            <span>ÉTAT RÉEL</span>
            <strong>Une donnée absente n’est jamais remplacée par un faux zéro.</strong>
            <p>Un statut inconnu reste inconnu. Une action externe non confirmée reste en attente ou indisponible.</p>
          </article>
          <article>
            <span>AUTONOMIE GRADUELLE</span>
            <strong>SESIRA prépare. Vous décidez.</strong>
            <p>Observation, proposition, approbation, puis automatique : vous choisissez jusqu’où chaque règle peut aller.</p>
          </article>
        </div>
      </section>

      <section id="tarifs" className="landing-five-offer" aria-labelledby="offer-title">
        <div className="landing-five-offer__copy">
          <span className={styles.sectionEyebrow}>OBSERVE · 90 JOURS</span>
          <h2 id="offer-title">Quatre-vingt-dix jours d’observation avant de changer quoi que ce soit.</h2>
          <p>
            Selon les données disponibles, SESIRA observe les demandes, devis, dossiers à planifier, interventions, factures et échéances. Aucune action externe pendant le constat. À la fin, vous obtenez un état daté de ce qui attendait une reprise.
          </p>
        </div>
        <div className="landing-five-offer__action">
          <div><strong>290 €</strong><span>constat 90 jours</span></div>
          <Link className={styles.darkCta} href="/diagnostic">Calculer ce qui se perd chez moi</Link>
          <Link className={styles.secondaryCta} href="/demo">Voir d’abord la démo</Link>
        </div>
      </section>

      <footer className="landing-five-footer">SESIRA · France</footer>
    </main>
  );
}
