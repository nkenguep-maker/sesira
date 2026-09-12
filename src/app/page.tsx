import type { Metadata } from "next";
import Link from "next/link";

import { LandingDashboardPreview } from "@/components/marketing/landing-dashboard-preview";
import { SesiraLogo } from "@/components/sesira/logo";

import styles from "./coolify-landing.module.css";

export const metadata: Metadata = {
  title: "SESIRA | Le suivi opérationnel des entreprises CVC",
  description:
    "SESIRA suit vos devis, interventions, factures, contrats et obligations CVC pour faire remonter chaque jour les décisions qui comptent.",
};

type PlaceholderProps = {
  label: string;
  title: string;
  detail: string;
  className?: string;
};

function ImagePlaceholder({ label, title, detail, className = "" }: PlaceholderProps) {
  return (
    <div className={`${styles.imagePlaceholder} ${className}`} role="img" aria-label={`${title} — emplacement image`}>
      <div className={styles.placeholderContent}>
        <span>{label}</span>
        <strong>{title}</strong>
        <small>{detail}</small>
      </div>
    </div>
  );
}

const SERVICES = [
  {
    tag: "COMMERCIAL",
    title: "Devis & relances",
    copy: "Repérer les devis sans réponse, préparer la prochaine relance et remettre le bon dossier devant la bonne personne.",
    href: "/demo/devis",
    image: "Photo dirigeant CVC / devis client",
  },
  {
    tag: "OPÉRATIONS",
    title: "Interventions",
    copy: "Faire le lien entre ce qui a été vendu, ce qui doit être planifié et ce qui s’est réellement passé sur le terrain.",
    href: "/demo/interventions",
    image: "Photo technicien CVC sur site",
  },
  {
    tag: "TRÉSORERIE",
    title: "Factures",
    copy: "Reprendre les échéances, promesses de paiement et litiges sans transformer le suivi en tableur de plus.",
    href: "/demo/factures",
    image: "Photo bureau / suivi facturation",
  },
  {
    tag: "CVC",
    title: "Maintenance & obligations",
    copy: "Rassembler contrats, équipements, fluides, attestations et documents à préparer dans le même flux de travail.",
    href: "/demo/obligations",
    image: "Photo installation CVC / maintenance",
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

const PROJECTS = [
  {
    tag: "SCÉNARIO · DEVIS",
    title: "18 450 € envoyés. Sept jours de silence.",
    image: "Photo commerciale / client CVC",
  },
  {
    tag: "SCÉNARIO · TERRAIN",
    title: "22 400 € gagnés. Aucun chantier planifié.",
    image: "Photo chantier / équipe terrain",
  },
  {
    tag: "SCÉNARIO · FACTURE",
    title: "12 400 € échus. Une promesse dépassée.",
    image: "Photo administratif / trésorerie",
  },
  {
    tag: "SCÉNARIO · ENTRETIEN",
    title: "Un contrat approche de l’échéance sans préparation.",
    image: "Photo maintenance préventive CVC",
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

const RESOURCES = [
  {
    tag: "GUIDE",
    title: "Les 5 angles morts qui coûtent le plus cher à une PME CVC",
    image: "Visuel éditorial / dirigeant CVC",
  },
  {
    tag: "MÉTHODE",
    title: "Passer de devis signés à des chantiers réellement planifiés",
    image: "Visuel éditorial / planning terrain",
  },
  {
    tag: "TRÉSORERIE",
    title: "Reprendre une facture en retard sans perdre le contexte client",
    image: "Visuel éditorial / finance PME",
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
          <ImagePlaceholder
            className={styles.heroImage}
            label="IMAGE HERO · PLACEHOLDER"
            title="Dirigeant et technicien CVC devant une installation"
            detail="Remplacer par une photo premium, réelle, française, avec espace négatif suffisant pour la composition."
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
        <article><strong>90 jours</strong><span>d’observation avant de vous demander de changer</span></article>
        <article><strong>3 zones</strong><span>vendre, exécuter, encaisser</span></article>
        <article><strong>0 action</strong><span>externe sans règle explicite</span></article>
      </section>

      <section className={styles.about} aria-labelledby="about-title">
        <div className={styles.aboutCopy}>
          <span className={styles.sectionEyebrow}>POURQUOI SESIRA</span>
          <h2 id="about-title">Le problème n’est pas votre logiciel. C’est ce qui tombe entre deux logiciels.</h2>
          <p>
            Une PME CVC travaille déjà avec des mails, devis, agendas, factures et dossiers réglementaires. SESIRA ne remplace pas tout : il relie les moments où un dossier devrait avancer mais n’avance plus.
          </p>
          <div className={styles.aboutList}>
            <div><b>✓</b><span>Le devis reste visible jusqu’à réponse ou décision.</span></div>
            <div><b>✓</b><span>Une vente gagnée sans créneau revient au bon moment.</span></div>
            <div><b>✓</b><span>Une facture ou une échéance ne disparaît pas après le premier rappel.</span></div>
          </div>
          <Link href="/demo" className={styles.textLink}>Explorer le produit <span aria-hidden="true">→</span></Link>
        </div>
        <div className={styles.aboutMedia}>
          <ImagePlaceholder className={styles.tall} label="IMAGE 01 · PLACEHOLDER" title="Technicien CVC en intervention" detail="Portrait vertical / environnement réel / uniforme neutre." />
          <ImagePlaceholder className={styles.smallTop} label="IMAGE 02 · PLACEHOLDER" title="Dirigeant PME CVC au bureau" detail="Photo naturelle, devis ou planning visible en arrière-plan." />
          <ImagePlaceholder className={styles.smallBottom} label="IMAGE 03 · PLACEHOLDER" title="Installation technique" detail="Groupe froid, PAC, CTA ou chaufferie moderne." />
        </div>
      </section>

      <section id="services" className={styles.services} aria-labelledby="services-title">
        <div className={styles.servicesHead}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionEyebrow}>CE QUE SESIRA SUIT</span>
            <h2 id="services-title">Un même fil, du premier devis au dernier euro encaissé.</h2>
            <p>Chaque zone répond à une question très simple : qu’est-ce qui doit avancer maintenant, et qui doit décider ?</p>
          </div>
          <Link href="/demo" className={styles.textLink}>Voir toute la démo <span aria-hidden="true">→</span></Link>
        </div>
        <div className={styles.serviceGrid}>
          {SERVICES.map((service, index) => (
            <Link href={service.href} className={styles.serviceCard} key={service.title}>
              <ImagePlaceholder className={styles.serviceImage} label={`IMAGE 0${index + 4} · PLACEHOLDER`} title={service.image} detail="Ratio paysage, traitement photo cohérent avec le reste du site." />
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
        <ImagePlaceholder className={styles.processImage} label="IMAGE 08 · PLACEHOLDER" title="Équipe CVC au travail, photo large" detail="Image principale de la section fonctionnement. Privilégier interaction humaine + contexte technique." />
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
          <p>Chaque scénario correspond à un moment concret où le dossier devrait avancer mais reste bloqué entre deux actions.</p>
        </div>
        <div className={styles.projectGrid}>
          {PROJECTS.map((project, index) => (
            <Link href="/demo" className={styles.projectCard} key={project.title}>
              <ImagePlaceholder label={`IMAGE ${String(index + 9).padStart(2, "0")} · PLACEHOLDER`} title={project.image} detail="Photo documentaire CVC / entreprise française." />
              <div className={styles.projectOverlay}><span>{project.tag}</span><strong>{project.title}</strong></div>
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
          <div className={styles.trustStats}>
            <article><strong>5</strong><span>sujets maximum mis en avant pour commencer la journée</span></article>
            <article><strong>90 j</strong><span>d’observation pour mesurer avant d’automatiser</span></article>
            <article><strong>0</strong><span>action externe présentée comme faite sans preuve ou règle</span></article>
          </div>
        </section>
      </div>

      <section className={styles.testimonials} aria-labelledby="testimonials-title">
        <ImagePlaceholder className={styles.testimonialImage} label="IMAGE 13 · PLACEHOLDER" title="Portrait client / dirigeant CVC" detail="À remplacer par une vraie photo lorsque le premier témoignage client publiable sera disponible." />
        <div className={styles.testimonialsCopy}>
          <span className={styles.sectionEyebrow}>PREUVE CLIENT</span>
          <h2 id="testimonials-title">La place est prête pour une vraie voix client — pas pour une fausse citation.</h2>
          <p>Cette section reprendra le principe testimonial de la référence, mais elle restera factuelle tant qu’un témoignage publiable n’est pas disponible.</p>
          <div className={styles.quotePlaceholder}>
            <span>TÉMOIGNAGE CLIENT · À REMPLACER</span>
            <blockquote>« Ici viendra une citation réelle sur un résultat mesuré : devis repris, délais réduits, factures remises dans le suivi ou charge administrative économisée. »</blockquote>
            <small>Nom · société · fonction — uniquement après accord de publication.</small>
          </div>
        </div>
      </section>

      <section className={styles.resources} aria-labelledby="resources-title">
        <div className={styles.sectionHeader}>
          <span className={styles.sectionEyebrow}>RESSOURCES</span>
          <h2 id="resources-title">Des contenus utiles pour mieux voir où se perd le travail.</h2>
          <p>La structure reprend le bloc éditorial de la référence. Les cartes sont prêtes pour accueillir de vrais articles, études ou retours terrain.</p>
        </div>
        <div className={styles.resourceGrid}>
          {RESOURCES.map((resource, index) => (
            <article className={styles.resourceCard} key={resource.title}>
              <ImagePlaceholder className={styles.resourceImage} label={`IMAGE ${index + 14} · PLACEHOLDER`} title={resource.image} detail="Illustration éditoriale ou photo métier." />
              <div className={styles.resourceBody}><span>{resource.tag}</span><h3>{resource.title}</h3></div>
            </article>
          ))}
        </div>
      </section>

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
          <div><span>PRODUIT</span><Link href="/demo">Démo</Link><Link href="/diagnostic">Diagnostic</Link><Link href="/automatisation">Automatisation</Link></div>
          <div><span>ACCÈS</span><Link href="/login">Connexion</Link><a href="#services">Solutions</a><a href="#fonctionnement">Fonctionnement</a></div>
        </div>
        <div className={styles.footerMeta}><span>SESIRA · France</span><span>© 2026 SESIRA</span></div>
      </footer>
    </main>
  );
}
