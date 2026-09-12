import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";

import { LandingDashboardPreview } from "@/components/marketing/landing-dashboard-preview";
import { SesiraLogo } from "@/components/sesira/logo";

import styles from "./coolify-landing.module.css";

export const metadata: Metadata = {
  title: "SESIRA | Le suivi opérationnel des entreprises CVC",
  description:
    "SESIRA suit vos devis, interventions, factures, contrats et obligations CVC pour faire remonter chaque jour les décisions qui comptent.",
  openGraph: {
    title: "SESIRA | 5 choses à faire. Pas 50 écrans à surveiller.",
    description:
      "Le suivi opérationnel des entreprises CVC : devis, planning, terrain, factures et obligations dans une même continuité.",
    type: "website",
  },
};

type PhotoProps = {
  image: "team" | "planning";
  label: string;
  className?: string;
  position?: string;
};

function LandingPhoto({ image, label, className = "", position = "center" }: PhotoProps) {
  const style = {
    backgroundImage: `url(/api/landing-image/${image})`,
    backgroundPosition: position,
  } satisfies CSSProperties;

  return <div className={`landing-native-photo ${className}`} style={style} role="img" aria-label={label} />;
}

const SERVICES = [
  {
    tag: "COMMERCIAL",
    title: "Devis & relances",
    copy: "Repérer les devis sans réponse, préparer la prochaine relance et remettre le bon dossier devant la bonne personne.",
    href: "/demo/devis",
    tone: "warm",
    icon: "D",
    metric: "7",
    unit: "devis à suivre",
    note: "2 sans réponse depuis plus de 7 jours",
  },
  {
    tag: "OPÉRATIONS",
    title: "Interventions",
    copy: "Faire le lien entre ce qui a été vendu, ce qui doit être planifié et ce qui s’est réellement passé sur le terrain.",
    href: "/demo/interventions",
    tone: "teal",
    icon: "T",
    metric: "5",
    unit: "interventions aujourd’hui",
    note: "1 rapport attend encore une validation",
  },
  {
    tag: "TRÉSORERIE",
    title: "Factures",
    copy: "Reprendre les échéances, promesses de paiement et litiges sans transformer le suivi en tableur de plus.",
    href: "/demo/factures",
    tone: "ink",
    icon: "€",
    metric: "21,8 k€",
    unit: "échus",
    note: "2 échéances demandent une décision",
  },
  {
    tag: "CVC",
    title: "Maintenance & obligations",
    copy: "Voir au même endroit les contrats à renouveler, les équipements, les fluides, les attestations et les documents à préparer.",
    href: "/demo/obligations",
    tone: "soft",
    icon: "M",
    metric: "3",
    unit: "échéances < 60 j",
    note: "contrats et dossiers à préparer",
  },
] as const;

const STEPS = [
  {
    no: "01.",
    title: "SESIRA observe ce qui existe déjà",
    copy: "Demandes, devis, interventions, factures et échéances sont lus sans vous demander de changer vos habitudes le premier jour.",
  },
  {
    no: "02.",
    title: "Les écarts deviennent visibles",
    copy: "Un devis silencieux, une vente sans planning ou une promesse de paiement dépassée revient dans une file courte.",
  },
  {
    no: "03.",
    title: "Le contexte reste attaché au dossier",
    copy: "Vous voyez ce qui s’est passé, depuis quand, et l’action proposée sans reconstruire l’historique dans plusieurs outils.",
  },
  {
    no: "04.",
    title: "Vous choisissez ce qui peut devenir autonome",
    copy: "Observation d’abord. Autonomie graduelle ensuite. Les décisions sensibles restent humaines tant que vous le décidez.",
  },
] as const;

const SCENARIOS = [
  {
    tag: "DEVIS",
    value: "18 450 €",
    title: "Sept jours de silence après envoi",
    context: "Aucune réponse enregistrée, aucune relance faite.",
    action: "Remettre le devis dans la file",
    tone: "warm",
  },
  {
    tag: "TERRAIN",
    value: "22 400 €",
    title: "Vente gagnée, aucun chantier planifié",
    context: "Le client a signé mais aucune date n’est encore posée.",
    action: "Faire décider le planning",
    tone: "teal",
  },
  {
    tag: "FACTURE",
    value: "12 400 €",
    title: "Échéance dépassée après une promesse",
    context: "Le suivi ne doit pas repartir de zéro après le premier rappel.",
    action: "Reprendre avec tout le contexte",
    tone: "ink",
  },
  {
    tag: "ENTRETIEN",
    value: "26 jours",
    title: "Contrat proche de l’échéance",
    context: "Renouvellement, équipement et pièces du dossier doivent être préparés.",
    action: "Préparer avant l’urgence",
    tone: "soft",
  },
] as const;

const FEATURES = [
  {
    icon: "01",
    title: "Une file courte",
    copy: "Maximum cinq sujets mis en avant pour commencer la journée sans parcourir cinquante écrans.",
  },
  {
    icon: "02",
    title: "Des faits, pas des suppositions",
    copy: "Une donnée absente n’est jamais remplacée par un faux zéro ou une conclusion rassurante.",
  },
  {
    icon: "03",
    title: "Le terrain dans la même continuité",
    copy: "Planning, intervention, rapport et validation restent liés au dossier commercial et financier.",
  },
  {
    icon: "04",
    title: "Des règles explicites",
    copy: "Aucun envoi automatique ou action externe n’est présenté comme acquis sans règle configurée.",
  },
] as const;

const HANDOFFS = [
  { no: "01", label: "Devis", risk: "sans réponse" },
  { no: "02", label: "Planning", risk: "sans date" },
  { no: "03", label: "Terrain", risk: "sans rapport" },
  { no: "04", label: "Facture", risk: "sans suivi" },
  { no: "05", label: "Entretien", risk: "sans préparation" },
] as const;

export default function HomePage() {
  return (
    <main className={styles.page}>
      <nav className={styles.nav} aria-label="Navigation principale">
        <Link href="/" aria-label="SESIRA" className={styles.brand}>
          <SesiraLogo />
        </Link>
        <div className={styles.navLinks}>
          <a href="#services">Solutions</a>
          <a href="#fonctionnement">Fonctionnement</a>
          <a href="#cas">Cas d’usage</a>
          <Link href="/demo">Démo</Link>
          <Link className={styles.navLogin} href="/login">Connexion</Link>
          <Link className={styles.navCta} href="/diagnostic">Calculer mes pertes</Link>
        </div>
      </nav>

      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>LE SUIVI OPÉRATIONNEL POUR LES ENTREPRISES CVC</span>
          <h1>5 choses à faire. Pas 50 écrans à surveiller.</h1>
          <p className={styles.heroLead}>
            SESIRA suit les dossiers qui se perdent entre devis, planning, terrain, facturation et obligations — puis remet chaque matin les sujets qui demandent vraiment votre attention.
          </p>
          <div className={styles.heroActions}>
            <Link className={styles.primaryCta} href="/diagnostic">Calculer ce qui se perd chez moi</Link>
            <Link className={styles.secondaryCta} href="/demo"><span aria-hidden="true">▶</span> Voir la démo</Link>
          </div>
          <div className={styles.heroNotes}>
            <span>Gratuit · sans compte · 3 minutes</span>
            <span>SESIRA prépare. Vous décidez.</span>
          </div>
        </div>

        <div className={styles.heroVisual}>
          <LandingPhoto
            image="team"
            className={styles.heroImage}
            label="Équipe CVC en environnement technique"
          />
          <Link href="/demo" className={styles.playCard}>
            <span className={styles.playIcon} aria-hidden="true">▶</span>
            <span><strong>Voir SESIRA en action</strong><span>Démo produit · données fictives</span></span>
          </Link>
          <div className={styles.trustCard}>
            <span>AUJOURD’HUI</span>
            <strong>5</strong>
            <p>sujets maximum mis en avant pour commencer la journée.</p>
          </div>
        </div>
      </header>

      <section className={styles.quickProof} aria-label="Repères SESIRA">
        <article><strong>5 max.</strong><span>décisions mises en avant le matin</span></article>
        <article><strong>90 jours</strong><span>pour mesurer les dossiers qui ne sont pas repris</span></article>
        <article><strong>4 zones</strong><span>vendre, exécuter, encaisser, préparer</span></article>
        <article><strong>0 action</strong><span>externe sans règle explicite</span></article>
      </section>

      <section className={styles.about} aria-labelledby="about-title">
        <div className={styles.aboutCopy}>
          <span className={styles.sectionEyebrow}>POURQUOI SESIRA</span>
          <h2 id="about-title">Le problème n’est pas votre logiciel. C’est ce qui tombe entre deux étapes.</h2>
          <p>
            Une PME CVC travaille déjà avec des mails, devis, agendas, factures et dossiers réglementaires. SESIRA relie les moments où un dossier devrait avancer mais n’avance plus.
          </p>
          <div className={styles.aboutList}>
            <div><b>✓</b><span>Le devis reste visible jusqu’à réponse ou décision.</span></div>
            <div><b>✓</b><span>Une vente gagnée sans créneau revient au bon moment.</span></div>
            <div><b>✓</b><span>Une facture ou une échéance ne disparaît pas après le premier rappel.</span></div>
          </div>
          <Link href="/demo" className={styles.textLink}>Explorer le produit <span aria-hidden="true">→</span></Link>
        </div>
        <div className="landing-handoff-map" aria-label="Les cinq passages de relais suivis par SESIRA">
          <div className="landing-handoff-map__head">
            <span>LE DOSSIER AVANCE</span>
            <strong>SESIRA surveille les passages de relais.</strong>
          </div>
          <div className="landing-handoff-map__flow">
            {HANDOFFS.map((item, index) => (
              <div className="landing-handoff-step" key={item.no}>
                <div className="landing-handoff-step__top"><span>{item.no}</span>{index < HANDOFFS.length - 1 ? <i aria-hidden="true">→</i> : null}</div>
                <strong>{item.label}</strong>
                <small>{item.risk}</small>
              </div>
            ))}
          </div>
          <div className="landing-handoff-map__footer"><span>Quand une étape s’arrête, le dossier revient dans la file avec son contexte.</span><b>Pas de trou entre les outils.</b></div>
        </div>
      </section>

      <section id="services" className={styles.services} aria-labelledby="services-title">
        <div className={styles.servicesHead}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionEyebrow}>CE QUE SESIRA SUIT</span>
            <h2 id="services-title">Un même fil, du premier devis au dernier euro encaissé.</h2>
            <p>Chaque zone répond à une question simple : qu’est-ce qui doit avancer maintenant, et qui doit décider ?</p>
          </div>
          <Link href="/demo" className={styles.textLink}>Voir toute la démo <span aria-hidden="true">→</span></Link>
        </div>
        <div className={styles.serviceGrid}>
          {SERVICES.map((service) => (
            <Link href={service.href} className={styles.serviceCard} key={service.title}>
              <div className={`landing-service-signal-native ${service.tone}`} aria-label={`${service.metric} ${service.unit}. ${service.note}. Données fictives.`}>
                <div className="landing-service-signal-native__top"><span>{service.icon}</span><small>DONNÉES FICTIVES</small></div>
                <div className="landing-service-signal-native__metric"><strong>{service.metric}</strong><span>{service.unit}</span></div>
                <div className="landing-service-signal-native__foot"><span>{service.note}</span><i aria-hidden="true"><b /><b /><b /></i></div>
              </div>
              <div className={styles.serviceBody}>
                <span>{service.tag}</span>
                <h3>{service.title}</h3>
                <p>{service.copy}</p>
                <b>Découvrir dans la démo →</b>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section id="fonctionnement" className={styles.process} aria-labelledby="process-title">
        <LandingPhoto image="planning" className={styles.processImage} label="Responsable d’exploitation CVC organisant le planning terrain" />
        <div className={styles.processCopy}>
          <span className={styles.sectionEyebrow}>COMMENT ÇA MARCHE</span>
          <h2 id="process-title">SESIRA observe, remet le contexte, puis vous laisse décider.</h2>
          <p>Pas de grand chantier de transformation avant de voir de la valeur. Le produit commence par ce qui existe déjà.</p>
          <div className={styles.steps}>
            {STEPS.map((step) => (
              <article className={styles.step} key={step.no}>
                <span className={styles.stepNo}>{step.no}</span>
                <div><h3>{step.title}</h3><p>{step.copy}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.product} aria-labelledby="product-title">
        <div className={styles.productCopy}>
          <span className={styles.sectionEyebrow}>LE PRODUIT</span>
          <h2 id="product-title">Le tableau de bord montre ce qui compte. Pas tout ce qui existe.</h2>
          <p>Une file de décisions, l’argent à surveiller, le terrain du jour et les obligations à préparer. Le reste reste accessible sans encombrer l’accueil.</p>
          <div className={styles.productPoints}>
            <span>✓ Une donnée absente n’est jamais remplacée par un faux zéro.</span>
            <span>✓ Les décisions sensibles restent humaines.</span>
            <span>✓ Le contexte reste attaché au dossier.</span>
          </div>
          <Link href="/demo" className={styles.textLink}>Ouvrir la démo complète →</Link>
        </div>
        <div className={styles.productStage}>
          <LandingDashboardPreview />
        </div>
      </section>

      <section id="cas" className={styles.projects} aria-labelledby="projects-title">
        <div className={styles.sectionHeader}>
          <span className={styles.sectionEyebrow}>CAS D’USAGE · DONNÉES FICTIVES</span>
          <h2 id="projects-title">Les petits écarts qui finissent par coûter cher.</h2>
          <p>Quatre situations concrètes où le dossier devrait avancer mais reste bloqué entre deux actions.</p>
        </div>
        <div className="landing-scenario-grid">
          {SCENARIOS.map((scenario) => (
            <Link href="/demo" className={`landing-scenario-card ${scenario.tone}`} key={scenario.title}>
              <div className="landing-scenario-card__top"><span>{scenario.tag}</span><small>EXEMPLE</small></div>
              <strong className="landing-scenario-card__value">{scenario.value}</strong>
              <h3>{scenario.title}</h3>
              <p>{scenario.context}</p>
              <div className="landing-scenario-card__action"><span>{scenario.action}</span><b aria-hidden="true">→</b></div>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.features} aria-labelledby="features-title">
        <div className={styles.featuresCopy}>
          <span className={styles.sectionEyebrow}>CE QUI DÉFINIT SESIRA</span>
          <h2 id="features-title">Simple devant. Rigoureux derrière.</h2>
          <p>La simplicité de l’écran ne doit pas être obtenue en inventant de la certitude. SESIRA garde visibles les limites, les données manquantes et les décisions humaines.</p>
        </div>
        <div className={styles.featureGrid}>
          {FEATURES.map((feature) => (
            <article className={styles.featureCard} key={feature.icon}>
              <span className={styles.featureIcon}>{feature.icon}</span>
              <h3>{feature.title}</h3>
              <p>{feature.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <div className={styles.trustBand}>
        <section className={styles.trust} aria-labelledby="trust-title">
          <div className={styles.trustCopy}>
            <span className={styles.sectionEyebrow}>QUI DÉCIDE</span>
            <h2 id="trust-title">SESIRA prépare. Vous décidez.</h2>
            <p>Le produit peut gagner en autonomie uniquement là où vous avez défini la règle. Il ne fabrique ni succès provider, ni preuve externe, ni verdict réglementaire.</p>
          </div>
          <div className="landing-guardrail-grid">
            <article><span>01</span><strong>Décision humaine</strong><p>Les arbitrages sensibles restent entre vos mains.</p></article>
            <article><span>02</span><strong>Preuve explicite</strong><p>Une action externe n’est jamais présentée comme faite sans preuve.</p></article>
            <article><span>03</span><strong>Autonomie graduelle</strong><p>Vous choisissez les règles qui peuvent s’exécuter sans validation.</p></article>
          </div>
        </section>
      </div>

      <section className={styles.cta}>
        <div className={styles.ctaCopy}>
          <span className={styles.sectionEyebrow}>COMMENCER</span>
          <h2>Commencez par un constat, pas par un logiciel.</h2>
          <p>Pendant 90 jours, SESIRA observe vos demandes, devis et relances. Il n’envoie rien. À la fin, vous obtenez un constat daté de ce qui n’a pas été repris.</p>
        </div>
        <div className={styles.ctaActions}>
          <div className={styles.ctaPrice}><strong>590 €</strong><span>constat 90 jours</span></div>
          <Link className={styles.darkCta} href="/diagnostic">Calculer mon point de départ</Link>
          <Link className={styles.secondaryCta} href="/demo">D’abord voir la démo</Link>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerIntro}>
          <SesiraLogo />
          <p>Le suivi, c’est SESIRA. Les décisions, c’est vous.</p>
        </div>
        <div className={styles.footerLinks}>
          <div><span>PRODUIT</span><Link href="/demo">Démo</Link><Link href="/diagnostic">Diagnostic</Link><Link href="/demo/automatisations">Automatisations</Link></div>
          <div><span>ACCÈS</span><Link href="/login">Connexion</Link><a href="#services">Solutions</a><a href="#fonctionnement">Fonctionnement</a></div>
        </div>
        <div className={styles.footerMeta}><span>SESIRA · France</span><span>© 2026 SESIRA</span></div>
      </footer>
    </main>
  );
}
