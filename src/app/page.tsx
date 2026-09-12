import type { Metadata } from "next";
import Link from "next/link";

import { LandingDashboardPreview } from "@/components/marketing/landing-dashboard-preview";
import { SesiraLogo } from "@/components/sesira/logo";

import styles from "./coolify-landing.module.css";

export const metadata: Metadata = {
  title: "SESIRA | Le suivi des entreprises d’intervention",
  description:
    "SESIRA montre chaque matin les devis à relancer, les factures à reprendre et les dossiers d’intervention qui demandent une décision.",
  openGraph: {
    title: "SESIRA | Le suivi des entreprises d’intervention",
    description:
      "Vous avez déjà fait le travail. SESIRA remet devant vous les dossiers qui n’ont pas avancé.",
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
    tag: "DEVIS",
    name: "Sophie Lefèvre",
    value: "18 450 €",
    title: "Sept jours de silence après envoi",
    context: "Aucune réponse enregistrée et aucune relance faite.",
    action: "Remettre le devis dans la file",
    tone: "warm",
  },
  {
    tag: "CHANTIER",
    name: "Dupont SARL",
    value: "22 400 €",
    title: "Vente gagnée, aucune date au planning",
    context: "Le client a signé mais le chantier n’a toujours pas de créneau.",
    action: "Faire décider le planning",
    tone: "teal",
  },
  {
    tag: "FACTURE",
    name: "Garage Montreuil",
    value: "21 800 €",
    title: "Promesse de règlement dépassée",
    context: "Le dossier revient avec l’historique du suivi au lieu de repartir de zéro.",
    action: "Décider de la prochaine relance",
    tone: "ink",
  },
  {
    tag: "ENTRETIEN",
    name: "Martin & Fils",
    value: "26 jours",
    title: "Contrat proche de l’échéance",
    context: "Le renouvellement et les pièces du dossier doivent être préparés avant l’urgence.",
    action: "Préparer le renouvellement",
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
          <span className={styles.eyebrow}>SESIRA · LE SUIVI DES ENTREPRISES QUI ENVOIENT DES TECHNICIENS</span>
          <h1>Vous avez déjà fait le travail.<br />Le devis est parti. Et puis plus rien.</h1>
          <p>
            Chaque matin, SESIRA vous dit quel devis relancer et quelle facture réclamer.
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
            <h2 id="product-title">Les dossiers qui demandent une décision, au même endroit.</h2>
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
            <span className={styles.sectionEyebrow}>EXEMPLES · DONNÉES FICTIVES</span>
            <h2 id="examples-title">Les petits écarts qui coûtent cher.</h2>
          </div>
          <p>Une seule série de dossiers circule dans toute la démonstration.</p>
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
          <span className={styles.sectionEyebrow}>CE QUE SESIRA NE FAIT PAS</span>
          <h2 id="guardrails-title">Deux règles visibles dans le produit.</h2>
        </div>
        <div className="landing-five-guardrails__grid">
          <article>
            <span>DONNÉE MANQUANTE</span>
            <strong>Une donnée absente n’est jamais remplacée par un faux zéro.</strong>
            <p>Si le statut n’est pas connu, SESIRA le laisse inconnu au lieu de fabriquer une certitude.</p>
          </article>
          <article>
            <span>DÉCISION</span>
            <strong>SESIRA prépare. Vous décidez.</strong>
            <p>Les arbitrages sensibles et les actions externes restent sous les règles que vous avez choisies.</p>
          </article>
        </div>
      </section>

      <section id="tarifs" className="landing-five-offer" aria-labelledby="offer-title">
        <div className="landing-five-offer__copy">
          <span className={styles.sectionEyebrow}>OBSERVE · 90 JOURS</span>
          <h2 id="offer-title">Quatre-vingt-dix jours d’observation avant de changer quoi que ce soit.</h2>
          <p>
            SESIRA observe vos demandes, devis et relances. Il n’envoie rien. À la fin, vous obtenez un constat daté de ce qui n’a pas été repris.
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
