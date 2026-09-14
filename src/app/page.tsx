import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { LandingDashboardPreview } from "@/components/marketing/landing-dashboard-preview";
import { SesiraLogo } from "@/components/sesira/logo";

import styles from "./landing-v5.module.css";

export const metadata: Metadata = {
  title: "SESIRA | Du devis au paiement, ne laissez rien se perdre",
  description:
    "Devis à relancer, affaires signées sans date, factures en retard et échéances à traiter. SESIRA fait remonter ce qui peut coûter de l’argent ou devenir un problème.",
  openGraph: {
    title: "SESIRA | Du devis au paiement, ne laissez rien se perdre",
    description:
      "SESIRA relie vente, planning, terrain, facturation, maintenance et échéances pour faire remonter ce qui demande une action.",
    type: "website",
  },
};

const MEDIA = {
  hero: "https://images.pexels.com/photos/34938442/pexels-photo-34938442.jpeg?auto=compress&cs=tinysrgb&w=1800",
  terrain: "https://images.pexels.com/photos/8960944/pexels-photo-8960944.jpeg?auto=compress&cs=tinysrgb&w=1800",
  office: "https://images.pexels.com/photos/10375970/pexels-photo-10375970.jpeg?auto=compress&cs=tinysrgb&w=1800",
  documents: "https://images.pexels.com/photos/3856116/pexels-photo-3856116.jpeg?auto=compress&cs=tinysrgb&w=1800",
} as const;

const WATCH_ITEMS = [
  {
    label: "COMMERCIAL",
    title: "Un devis attend une réponse",
    copy: "La relance remonte avec le client, le montant et la date du dernier échange.",
    action: "Relancer",
  },
  {
    label: "FACTURATION",
    title: "Une facture dépasse son échéance",
    copy: "Le retard reste visible jusqu’au règlement ou à une nouvelle promesse de paiement.",
    action: "Reprendre",
  },
  {
    label: "MAINTENANCE",
    title: "Un contrat arrive au renouvellement",
    copy: "Le client, le contrat, les équipements et les documents restent reliés.",
    action: "Préparer",
  },
  {
    label: "ÉQUIPEMENTS",
    title: "Une date de contrôle approche",
    copy: "L’équipement concerné et la date à surveiller remontent avant l’échéance.",
    action: "Planifier",
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
          <a href="#terrain">Terrain</a>
          <a href="#suivi">Suivi</a>
          <Link href="/diagnostic">Diagnostic</Link>
          <Link href="/demo">Démo</Link>
          <Link className={styles.navLogin} href="/login">Connexion</Link>
          <Link className={styles.navCta} href="/signup">Créer mon espace</Link>
        </div>
      </nav>

      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>POUR LES ENTREPRISES TECHNIQUES</span>
          <h1>Du devis au paiement, ne laissez rien se perdre.</h1>
          <p className={styles.heroLead}>
            SESIRA fait remonter les devis à relancer, les affaires signées sans date, les factures en retard et les échéances à traiter — avant qu’elles ne vous coûtent de l’argent ou deviennent un problème.
          </p>
          <div className={styles.heroActions}>
            <Link className={styles.primaryCta} href="/diagnostic">Voir ce que mon entreprise laisse passer</Link>
            <Link className={styles.secondaryCta} href="/demo">Voir SESIRA en action</Link>
          </div>
          <span className={styles.heroNote}>Le diagnostic part de vos chiffres. Les hypothèses restent visibles.</span>
        </div>

        <div className={styles.heroVisual} aria-label="Technicien sur site et suivi du jour">
          <div className={styles.heroPhoto}>
            <Image
              src={MEDIA.hero}
              alt="Technicien intervenant sur une installation de chauffage"
              width={1800}
              height={1350}
              quality={92}
              sizes="(max-width: 1050px) 100vw, 56vw"
              priority
            />
          </div>
          <div className={styles.floatingBadge}>
            <small>TERRAIN AUJOURD’HUI</small>
            <strong>4 interventions planifiées</strong>
            <span>Le bureau garde la vue d’ensemble.</span>
          </div>
          <div className={styles.todayCard}>
            <div className={styles.todayTop}>
              <span>À REPRENDRE AUJOURD’HUI</span>
              <b>3 sujets</b>
            </div>
            <div className={styles.todayList}>
              <div><i /><span>Facture Garage Montreuil</span><b>+12 j</b></div>
              <div><i /><span>Contrôle Clinique des Lilas</span><b>18 sept.</b></div>
              <div><i /><span>Devis Sophie Lefèvre</span><b>+7 j</b></div>
            </div>
          </div>
        </div>
      </header>

      <section className={styles.proof} aria-label="Ce que SESIRA relie">
        <article><strong>Vente</strong><span>Devis, options, réponses et relances.</span></article>
        <article><strong>Planning</strong><span>Ce qui est signé trouve une date.</span></article>
        <article><strong>Terrain</strong><span>Mission, photos, mesures et rapport.</span></article>
        <article><strong>Encaissement</strong><span>Le travail reste suivi jusqu’au paiement.</span></article>
      </section>

      <section id="produit" className={styles.productSection} aria-labelledby="product-title">
        <div className={styles.sectionHead}>
          <div>
            <span className={styles.sectionEyebrow}>LE PRODUIT</span>
            <h2 id="product-title">Ce qui demande une action remonte. Le reste reste calme.</h2>
            <p>Chaque matin, vous voyez les dossiers qui peuvent perdre du temps, de l’argent ou une échéance.</p>
          </div>
          <Link className={styles.textLink} href="/demo">Ouvrir la démo complète →</Link>
        </div>
        <Link href="/demo" className={styles.productStage} aria-label="Ouvrir le tableau de bord SESIRA">
          <LandingDashboardPreview />
        </Link>
      </section>

      <section id="terrain" className={styles.splitSection} aria-labelledby="terrain-title">
        <div className={styles.splitMedia}>
          <Image
            src={MEDIA.terrain}
            alt="Technicienne sur site utilisant une tablette"
            width={1800}
            height={1200}
            quality={92}
            sizes="(max-width: 1050px) 100vw, 52vw"
          />
          <div className={styles.mediaCaption}>
            <strong>Intervention sur site</strong>
            <span>Mission → photo → rapport</span>
          </div>
        </div>
        <div className={styles.splitCopy}>
          <span className={styles.sectionEyebrow}>BUREAU + TERRAIN</span>
          <h2 id="terrain-title">Le bureau planifie. L’équipe terrain fait le travail.</h2>
          <p>Chacun voit ce dont il a besoin. Le reste reste au bureau.</p>
          <div className={styles.bulletList}>
            <div><b>01</b><span><strong>Planning clair</strong><span>Intervention, adresse, créneau et technicien dans la même vue.</span></span></div>
            <div><b>02</b><span><strong>Application terrain simple</strong><span>Consignes, photos, mesures, signature et rapport.</span></span></div>
            <div><b>03</b><span><strong>Retour immédiat au bureau</strong><span>Le dossier continue sans ressaisie.</span></span></div>
          </div>
        </div>
      </section>

      <section className={`${styles.splitSection} ${styles.reverse}`} aria-labelledby="cash-title">
        <div className={styles.splitMedia}>
          <Image
            src={MEDIA.office}
            alt="Responsable d’entreprise suivant ses dossiers depuis le bureau"
            width={1800}
            height={1200}
            quality={92}
            sizes="(max-width: 1050px) 100vw, 52vw"
          />
          <div className={styles.mediaCaption}>
            <strong>Un dossier, jusqu’au paiement</strong>
            <span>Devis → intervention → facture</span>
          </div>
        </div>
        <div className={styles.splitCopy}>
          <span className={styles.sectionEyebrow}>CHIFFRE D’AFFAIRES</span>
          <h2 id="cash-title">Les dossiers oubliés coûtent de l’argent.</h2>
          <p>SESIRA garde le fil entre la proposition, le travail réalisé et l’encaissement.</p>
          <div className={styles.bulletList}>
            <div><b>01</b><span><strong>Devis à relancer</strong><span>Vous savez lesquels attendent une réponse et depuis combien de temps.</span></span></div>
            <div><b>02</b><span><strong>Vente sans date</strong><span>Une affaire signée ne disparaît pas entre le commercial et le planning.</span></span></div>
            <div><b>03</b><span><strong>Travail à encaisser</strong><span>Une facture échue reste visible jusqu’à la prochaine décision.</span></span></div>
          </div>
          <Link className={styles.textLink} href="/diagnostic">Calculer avec mes chiffres →</Link>
        </div>
      </section>

      <section className={styles.importSection} aria-labelledby="options-title">
        <div className={styles.importCopy}>
          <span className={styles.sectionEyebrow}>DEVIS À PLUSIEURS OPTIONS</span>
          <h2 id="options-title">Trois façons de faire. Un choix plus simple pour le client.</h2>
          <p>Gardez plusieurs variantes dans le même dossier, avec leurs révisions et leurs options. Le client choisit. Votre équipe garde la main.</p>
          <Link className={styles.textLink} href="/demo/devis">Voir un exemple dans la démo →</Link>
        </div>
        <div className={styles.importSteps} aria-label="Exemple de trois niveaux de devis">
          <div><strong>Essentiel</strong><span>Le nécessaire</span></div>
          <div><strong>Recommandé</strong><span>Le bon équilibre</span></div>
          <div><strong>Premium</strong><span>Le plus complet</span></div>
        </div>
      </section>

      <section id="suivi" className={styles.watchSection} aria-labelledby="watch-title">
        <div className={styles.watchIntro}>
          <span className={styles.sectionEyebrow}>CHIFFRE D’AFFAIRES + ÉCHÉANCES</span>
          <h2 id="watch-title">Protégez ce qui doit rentrer. Surveillez ce qui doit arriver.</h2>
          <p>Vous voyez la date, la raison et la prochaine action sans parcourir cinq écrans.</p>
        </div>
        <div className={styles.watchGrid}>
          {WATCH_ITEMS.map((item) => (
            <article className={styles.watchCard} key={item.label}>
              <small>{item.label}</small>
              <strong>{item.title}</strong>
              <p>{item.copy}</p>
              <em>{item.action} →</em>
            </article>
          ))}
        </div>

        <div className={styles.documentBand}>
          <div className={styles.documentPhoto}>
            <Image
              src={MEDIA.documents}
              alt="Technicien consultant son rapport sur tablette dans un atelier"
              width={1800}
              height={1200}
              quality={92}
              sizes="(max-width: 1050px) 100vw, 44vw"
            />
          </div>
          <div className={styles.documentCopy}>
            <span className={styles.sectionEyebrow}>DOCUMENTS</span>
            <h3>Déposez le fichier. Retrouvez-le dans le bon dossier.</h3>
            <p>Facture, contrat, rapport ou photo : SESIRA lit les informations utiles et propose le bon client, le bon équipement ou le bon dossier.</p>
            <div className={styles.documentTags}>
              <span>Factures</span><span>Contrats</span><span>Rapports</span><span>Photos</span><span>Équipements</span>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.importSection} aria-labelledby="data-title">
        <div className={styles.importCopy}>
          <span className={styles.sectionEyebrow}>VOS DONNÉES RESTENT LES VÔTRES</span>
          <h2 id="data-title">Entrez avec vos données. Repartez avec elles.</h2>
          <p>Importez vos clients, devis, factures, équipements et contrats. SESIRA prévoit aussi l’export complet de votre organisation.</p>
        </div>
        <div className={styles.importSteps} aria-label="Portabilité des données">
          <div><strong>Importer</strong><span>CSV</span></div>
          <div><strong>Exporter</strong><span>Données de l’organisation</span></div>
          <div><strong>Rester libre</strong><span>Pas de verrou sur vos données</span></div>
        </div>
      </section>

      <section className={styles.finalCta} aria-labelledby="final-title">
        <div>
          <span className={styles.sectionEyebrow}>COMMENCEZ PAR VOS CHIFFRES</span>
          <h2 id="final-title">Voyez d’abord ce que votre entreprise laisse peut-être passer.</h2>
          <p>Cinq réponses. Un calcul transparent. Ensuite, décidez si SESIRA mérite une place dans votre entreprise.</p>
        </div>
        <div className={styles.finalActions}>
          <Link className={styles.darkCta} href="/diagnostic">Faire le diagnostic</Link>
          <Link className={styles.secondaryCta} href="/signup">Créer mon espace</Link>
        </div>
      </section>

      <footer className={styles.footer}>
        <SesiraLogo />
        <span>SESIRA · France</span>
        <div className={styles.footerLinks}><Link href="/diagnostic">Diagnostic</Link><Link href="/login">Connexion</Link><Link href="/signup">Créer un compte</Link></div>
      </footer>
    </main>
  );
}
