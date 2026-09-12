import type { Metadata } from "next";
import Link from "next/link";

import { LandingDashboardPreview } from "@/components/marketing/landing-dashboard-preview";
import { TodayPreview } from "@/components/marketing/today-preview";
import { SesiraLogo } from "@/components/sesira/logo";

import "./today-panels.css";

export const metadata: Metadata = {
  title: "SESIRA | Le suivi opérationnel des entreprises CVC",
  description:
    "SESIRA suit vos devis, interventions, factures, contrats et obligations CVC pour faire remonter chaque jour les décisions qui comptent.",
};

const PROOF = [
  { value: "5 max.", label: "décisions mises en avant le matin" },
  { value: "3", label: "zones critiques : vendre, exécuter, encaisser" },
  { value: "90 j", label: "d’observation avant de vous demander de changer" },
  { value: "0", label: "envoi automatique sans règle explicite" },
] as const;

const BENEFITS = [
  {
    number: "01",
    tag: "VENDRE",
    title: "Aucun devis ne disparaît dans le quotidien.",
    copy: "SESIRA repère les devis sans réponse, prépare la prochaine relance et fait remonter les réponses qui demandent votre décision.",
    href: "/demo/devis",
  },
  {
    number: "02",
    tag: "EXÉCUTER",
    title: "Ce qui est vendu rejoint vraiment le terrain.",
    copy: "Les affaires gagnées sans créneau, les interventions du jour et les rapports à valider restent visibles jusqu’à ce qu’un geste soit fait.",
    href: "/demo/interventions",
  },
  {
    number: "03",
    tag: "ENCAISSER",
    title: "Une facture échue ne devient plus un angle mort.",
    copy: "Échéance, promesse de paiement, litige : SESIRA reprend uniquement les faits connus et vous remet le bon dossier au bon moment.",
    href: "/demo/factures",
  },
  {
    number: "04",
    tag: "PRÉPARER",
    title: "Les échéances CVC cessent de vivre dans des fichiers séparés.",
    copy: "Équipements, fluides, attestations et documents à préparer rejoignent le même espace opérationnel, sans inventer de verdict réglementaire.",
    href: "/demo/obligations",
  },
] as const;

const SOLUTIONS = [
  { tag: "COMMERCIAL", title: "Devis & relances", copy: "Savoir quoi reprendre, quand, et pourquoi.", href: "/demo/devis" },
  { tag: "OPÉRATIONS", title: "Interventions", copy: "Vendu, planifié, en cours, terminé : une seule continuité.", href: "/demo/interventions" },
  { tag: "TRÉSORERIE", title: "Factures", copy: "Retards, promesses et litiges remis dans la file de travail.", href: "/demo/factures" },
  { tag: "RÉCURRENCE", title: "Maintenance", copy: "Contrats et renouvellements à préparer avant l’échéance.", href: "/demo/maintenance" },
  { tag: "CVC", title: "Obligations", copy: "Échéances, données manquantes et documents à joindre.", href: "/demo/obligations" },
  { tag: "AUTONOMIE", title: "Automatisations", copy: "Commencer en observation, puis ouvrir seulement ce que vous choisissez.", href: "/demo/automatisations" },
] as const;

const STORIES = [
  {
    tag: "SCÉNARIO 01 · DEVIS",
    title: "18 450 € envoyés. Sept jours de silence.",
    copy: "SESIRA voit que le devis n’a pas de réponse enregistrée, prépare une relance contextualisée et la place dans la file du dirigeant.",
    result: "Le message est prêt. L’envoi reste une décision humaine.",
    href: "/demo/devis",
  },
  {
    tag: "SCÉNARIO 02 · TERRAIN",
    title: "22 400 € gagnés. Aucun chantier planifié.",
    copy: "La vente est faite, mais aucun créneau n’existe. SESIRA transforme cet écart en sujet opérationnel visible jusqu’à planification.",
    result: "Le chiffre d’affaires vendu ne reste pas entre CRM et planning.",
    href: "/demo/interventions",
  },
  {
    tag: "SCÉNARIO 03 · FACTURE",
    title: "12 400 € échus. Une promesse dépassée.",
    copy: "La date promise est passée sans règlement enregistré. SESIRA prépare une relance factuelle, sans inventer de menace ni de pénalité.",
    result: "Le dossier revient au dirigeant avec le contexte utile.",
    href: "/demo/factures",
  },
] as const;

export default function HomePage() {
  return (
    <main className="cvc-shell">
      <nav className="cvc-nav" aria-label="Navigation principale">
        <Link href="/" aria-label="SESIRA" className="cvc-brand-link"><SesiraLogo /></Link>
        <div className="cvc-nav-links">
          <a href="#produit">Produit</a>
          <a href="#solutions">Solutions</a>
          <a href="#scenarios">Scénarios</a>
          <Link href="/demo">Démo</Link>
          <Link className="cvc-nav-login" href="/login">Connexion</Link>
          <Link className="cvc-nav-cta" href="/diagnostic">Calculer mes pertes</Link>
        </div>
      </nav>

      <header className="cvc-hero">
        <div className="cvc-hero-copy">
          <span className="cvc-kicker">LE PILOTAGE SIMPLE POUR LES ENTREPRISES CVC</span>
          <h1>5 choses à faire. Pas 50 écrans à surveiller.</h1>
          <p className="cvc-hero-lede">
            Chaque matin, SESIRA remet devant vous les cinq sujets qui comptent vraiment : devis, chantier, rapport terrain, facture et entretien.
          </p>
          <div className="cvc-actions">
            <Link className="cvc-main-cta" href="/diagnostic">Calculer ce qui se perd chez moi</Link>
            <Link className="cvc-ghost-cta" href="/demo">Explorer la démo <span aria-hidden="true">↗</span></Link>
          </div>
          <div className="cvc-hero-footnote">
            <span>Gratuit · sans compte · 3 minutes</span>
            <span>SESIRA prépare. Vous décidez.</span>
          </div>
        </div>

        <div className="cvc-hero-product">
          <div className="cvc-product-label"><span>APERÇU DU TABLEAU DE BORD</span><b>Données fictives · même logique que l’application</b></div>
          <LandingDashboardPreview />
        </div>
      </header>

      <section className="cvc-proof-strip" aria-label="Principes du produit">
        {PROOF.map((item) => <article key={item.label}><strong>{item.value}</strong><span>{item.label}</span></article>)}
      </section>

      <section className="cvc-benefits" aria-labelledby="benefits-title">
        <div className="cvc-section-intro">
          <span>CE QUE ÇA CHANGE</span>
          <h2 id="benefits-title">Moins de logiciel à regarder. Plus de travail qui avance.</h2>
          <p>SESIRA ne vous demande pas de surveiller un nouveau tableau de bord. Il transforme les écarts déjà présents dans vos outils en une file de décisions courte et exploitable.</p>
        </div>
        <div className="cvc-benefit-grid">
          {BENEFITS.map((item) => (
            <Link href={item.href} className="cvc-benefit-card" key={item.number}>
              <div><span>{item.number}</span><b>{item.tag}</b></div>
              <h3>{item.title}</h3>
              <p>{item.copy}</p>
              <strong>Voir dans la démo <i aria-hidden="true">↗</i></strong>
            </Link>
          ))}
        </div>
      </section>

      <section id="produit" className="cvc-product-section" aria-labelledby="product-title">
        <div className="cvc-product-section-copy">
          <span>SESIRA AUJOURD’HUI</span>
          <h2 id="product-title">Une seule vue pour comprendre ce qui compte en cinq secondes.</h2>
          <p>Pas un mur de rapports. Pas vingt graphiques. Une file de décisions, l’argent à surveiller, le terrain du jour et les obligations à préparer.</p>
          <ul>
            <li>Le contexte reste attaché au dossier.</li>
            <li>Une donnée absente n’est jamais remplacée par un faux zéro.</li>
            <li>Les décisions sensibles restent humaines.</li>
          </ul>
          <Link href="/demo">Ouvrir le produit avec des données de démonstration <span aria-hidden="true">↗</span></Link>
        </div>
        <div className="cvc-product-stage"><TodayPreview /></div>
      </section>

      <section id="solutions" className="cvc-solutions" aria-labelledby="solutions-title">
        <div className="cvc-section-intro compact">
          <span>UN FIL CONTINU</span>
          <h2 id="solutions-title">Du premier devis au dernier euro encaissé.</h2>
          <p>Chaque module répond à une question opérationnelle simple. Ensemble, ils empêchent les dossiers de tomber entre deux outils ou deux équipes.</p>
        </div>
        <div className="cvc-solution-grid">
          {SOLUTIONS.map((item) => (
            <Link href={item.href} key={item.title} className="cvc-solution-card">
              <span>{item.tag}</span>
              <h3>{item.title}</h3>
              <p>{item.copy}</p>
              <b aria-hidden="true">↗</b>
            </Link>
          ))}
        </div>
      </section>

      <section id="scenarios" className="cvc-stories" aria-labelledby="stories-title">
        <div className="cvc-stories-head">
          <div><span>SCÉNARIOS CVC · DONNÉES FICTIVES</span><h2 id="stories-title">Le produit devient clair quand on suit un dossier jusqu’au bout.</h2></div>
          <Link href="/demo">Explorer toute la démo <span aria-hidden="true">↗</span></Link>
        </div>
        <div className="cvc-story-grid">
          {STORIES.map((item) => (
            <Link href={item.href} className="cvc-story-card" key={item.tag}>
              <span>{item.tag}</span>
              <h3>{item.title}</h3>
              <p>{item.copy}</p>
              <div><b>Ce que SESIRA fait</b><strong>{item.result}</strong></div>
            </Link>
          ))}
        </div>
      </section>

      <section className="cvc-control-band" aria-labelledby="control-title">
        <div className="cvc-control-title"><span>QUI DÉCIDE</span><h2 id="control-title">SESIRA prépare. Vous décidez.</h2></div>
        <div className="cvc-control-points">
          <article><strong>01</strong><div><h3>Observation d’abord.</h3><p>SESIRA commence par lire et mesurer. Aucun envoi n’est nécessaire pour voir la valeur.</p></div></article>
          <article><strong>02</strong><div><h3>Autonomie graduelle.</h3><p>Vous choisissez les règles qui peuvent agir seules et celles qui doivent toujours attendre votre validation.</p></div></article>
          <article><strong>03</strong><div><h3>Pas de vérité inventée.</h3><p>Prix, litiges, preuves externes et verdicts réglementaires ne sont jamais fabriqués pour rendre l’écran plus rassurant.</p></div></article>
        </div>
      </section>

      <section className="cvc-now" aria-labelledby="now-title">
        <div className="cvc-now-copy">
          <span>POURQUOI MAINTENANT</span>
          <h2 id="now-title">Deux dates que vous n’avez pas choisies.</h2>
          <p>La pression administrative augmente pendant que les marges restent serrées. SESIRA rassemble ce qui doit être préparé sans prétendre faire à votre place ce qui reste votre responsabilité.</p>
        </div>
        <div className="cvc-now-dates">
          <article><span>FACTURATION ÉLECTRONIQUE</span><strong>1er septembre 2027</strong><p>Échéance d’émission pour les PME et microentreprises en France.</p></article>
          <article><span>FLUIDES</span><strong>31 janvier</strong><p>Le bilan annuel doit être préparé à partir des données disponibles de l’entreprise.</p></article>
        </div>
      </section>

      <section id="commencer" className="cvc-start-section">
        <div className="cvc-start-copy">
          <span>COMMENCER</span>
          <h2>Commencez par un constat, pas par un logiciel.</h2>
          <p>Pendant 90 jours, SESIRA observe vos demandes, devis et relances. Il n’envoie rien. À la fin, vous obtenez un constat daté : dossiers sans réponse, demandes jamais reprises et délais réellement observés.</p>
          <div className="cvc-start-benefits"><span>Sans engagement</span><span>Aucun changement de process imposé</span><span>Déduit de l’installation si vous continuez</span></div>
        </div>
        <div className="cvc-start-card">
          <span>CONSTAT 90 JOURS</span>
          <strong>590 €</strong>
          <p>Voir ce qui se perd avant de décider quoi automatiser.</p>
          <Link className="cvc-main-cta" href="/diagnostic">Calculer mon point de départ</Link>
          <Link className="cvc-start-demo" href="/demo">D’abord voir la démo <span aria-hidden="true">↗</span></Link>
        </div>
      </section>

      <section className="cvc-founder-short">
        <div className="cvc-founder-photo" aria-hidden="true">PN</div>
        <div><span>PAUL NKENGUE · FONDATEUR</span><p>J’ai passé des années en vente B2B à voir la même chose : ce n’est pas le gros problème qui fait perdre un dossier, c’est le devis que personne n’a relancé, le chantier que personne n’a planifié ou la facture que personne n’a reprise. SESIRA est construit autour de ces petits écarts coûteux.</p></div>
      </section>

      <footer className="cvc-footer">
        <div className="cvc-footer-brand"><SesiraLogo /><p>Le suivi, c’est SESIRA.<br />Les décisions, c’est vous.</p></div>
        <div className="cvc-footer-links"><div><span>PRODUIT</span><Link href="/demo">Démo</Link><Link href="/diagnostic">Diagnostic</Link><Link href="/automatisation">Automatisation</Link></div><div><span>ACCÈS</span><Link href="/login">Connexion</Link><Link href="/app">Application</Link></div></div>
        <div className="cvc-footer-note"><span>SESIRA · FRANCE</span><small>© 2026 SESIRA</small></div>
      </footer>
    </main>
  );
}
