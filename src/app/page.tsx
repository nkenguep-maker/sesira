import type { Metadata } from "next";
import Link from "next/link";

import { SesiraLogo } from "@/components/sesira/logo";

export const metadata: Metadata = {
  title: "SESIRA | Pilotage opérationnel pour PME CVC",
  description:
    "SESIRA surveille les passages entre devis, interventions, rapports, factures et maintenance pour faire remonter ce qui s'est arrêté.",
};

const TODAY_ITEMS = [
  {
    kind: "DEVIS",
    title: "18 450 € · Sophie Lefèvre",
    detail: "Aucune réponse depuis 6 jours. Relance préparée.",
    action: "Relance à valider",
  },
  {
    kind: "INTERVENTION",
    title: "Dupont SARL",
    detail: "Vente gagnée. Aucune intervention planifiée.",
    action: "Planifier",
  },
  {
    kind: "RAPPORT TERRAIN",
    title: "Intervention #1842",
    detail: "Rapport complété. Une validation reste nécessaire.",
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

const PILLARS = [
  {
    number: "01",
    title: "VENDRE",
    headline: "Ce qui est parti et qui attend encore une réponse.",
    detail: "Demandes, devis, variantes, opportunités, relances, objections.",
    example: "18 450 € · pompe à chaleur air/eau · envoyé il y a six jours · aucune réponse · relance préparée",
  },
  {
    number: "02",
    title: "EXÉCUTER",
    headline: "Ce qui est vendu et qui n'est pas encore arrivé au terrain.",
    detail: "Interventions, planification, rapports terrain, validations, documents.",
    example: "Dupont SARL · vente gagnée · aucune intervention planifiée",
  },
  {
    number: "03",
    title: "ENCAISSER",
    headline: "Ce qui est fait et qui n'est pas encore payé — puis renouvelé.",
    detail: "Factures, échéances, promesses de paiement, litiges, contrats de maintenance, renouvellements.",
    example: "12 400 € · promesse de paiement vendredi",
  },
] as const;

const AUTOMATION_LEVELS = [
  ["01", "Observation", "SESIRA regarde et mesure."],
  ["02", "Shadow", "SESIRA montre ce qu'il aurait préparé."],
  ["03", "Approbation", "SESIRA prépare. Votre équipe valide."],
  ["04", "Automatique", "Uniquement pour les règles explicitement autorisées."],
] as const;

const WORK_SPLIT = [
  ["Surveiller les dossiers", "Décider d'un prix"],
  ["Préparer une relance", "Accorder une remise"],
  ["Repérer un retard", "Traiter un litige"],
  ["Faire remonter une exception", "Prendre un engagement contractuel"],
] as const;

export default function HomePage() {
  return (
    <main className="cvc-shell">
      <nav className="cvc-nav" aria-label="Navigation principale">
        <Link href="/" aria-label="SESIRA"><SesiraLogo /></Link>
        <div className="cvc-nav-links">
          <a href="#aujourdhui">Aujourd&apos;hui</a>
          <a href="#parcours">Le parcours</a>
          <a href="#controle">Le contrôle</a>
          <Link className="cvc-nav-login" href="/login">Connexion</Link>
          <Link className="button primary small" href="/diagnostic">Calculer</Link>
        </div>
      </nav>

      <header className="cvc-hero">
        <div className="cvc-hero-copy">
          <span className="cvc-kicker">SESIRA · POUR LES ENTREPRISES CVC DE 8 À 50 PERSONNES</span>
          <h1>Une PME perd rarement un dossier à cause d&apos;un gros problème. <em>Elle le perd entre deux étapes.</em></h1>
          <p className="cvc-hero-lede">
            Un devis parti sans relance. Une vente gagnée jamais planifiée. Un rapport terrain qui attend une validation depuis trois semaines. SESIRA surveille les passages entre vos étapes et fait remonter ce qui s&apos;est arrêté.
          </p>
          <div className="cvc-actions">
            <Link className="button primary" href="/diagnostic">Calculer ce qui se perd chez moi</Link>
            <a className="cvc-text-link" href="#aujourdhui">Voir SESIRA Aujourd&apos;hui</a>
          </div>
          <small>Gratuit · sans compte · 3 minutes</small>
        </div>

        <TodayPreview compact />
      </header>

      <section className="cvc-urgency" aria-labelledby="echeances-title">
        <div className="cvc-urgency-head">
          <span>POURQUOI MAINTENANT</span>
          <h2 id="echeances-title">Deux échéances arrivent. Elles ne dépendent pas de vous.</h2>
        </div>
        <div className="cvc-deadline-grid">
          <article>
            <span>01</span>
            <strong>1er septembre 2027</strong>
            <p>Vos factures devront être émises au format électronique, via une plateforme agréée. La réception est déjà obligatoire depuis le 1er septembre 2026.</p>
          </article>
          <article>
            <span>02</span>
            <strong>31 janvier · chaque année</strong>
            <p>Le bilan annuel de vos fluides frigorigènes est attendu par votre organisme agréé.</p>
          </article>
        </div>
        <div className="cvc-urgency-note">
          <b>Couche réglementaire en préparation pour l&apos;ouverture complète.</b>
          <p>SESIRA est conçu pour relier ces échéances au suivi opérationnel et préparer les éléments nécessaires. Le dépôt reste sous votre responsabilité.</p>
        </div>
      </section>

      <section id="aujourdhui" className="cvc-section cvc-today-section">
        <div className="cvc-section-head cvc-section-head-wide">
          <span>01 · SESIRA AUJOURD&apos;HUI</span>
          <h2>Commencez la journée par ce qui mérite réellement votre attention.</h2>
          <p>Pas trente tableaux à parcourir. SESIRA rassemble les exceptions issues du commercial, du terrain, de l&apos;administratif et de la maintenance dans une même vue de travail.</p>
        </div>
        <TodayPreview />
      </section>

      <section id="parcours" className="cvc-section cvc-platform-section">
        <div className="cvc-section-head cvc-section-head-wide">
          <span>02 · LE PARCOURS</span>
          <h2>Trois ruptures à surveiller. Pas quinze produits à comprendre.</h2>
          <p>SESIRA se lit comme votre activité : vendre, exécuter, encaisser. Chaque pilier commence là où une étape devrait naturellement déclencher la suivante.</p>
        </div>
        <div className="cvc-pillar-grid">
          {PILLARS.map((pillar) => (
            <article key={pillar.title}>
              <div className="cvc-pillar-top"><span>{pillar.number}</span><b>{pillar.title}</b></div>
              <h3>{pillar.headline}</h3>
              <p>{pillar.detail}</p>
              <div className="cvc-pillar-example">
                <span>EXEMPLE</span>
                <strong>{pillar.example}</strong>
              </div>
            </article>
          ))}
        </div>
        <div className="cvc-flow-line" aria-label="Parcours client SESIRA">
          <span>Demande</span><b>→</b><span>Devis</span><b>→</b><span>Intervention</span><b>→</b><span>Rapport</span><b>→</b><span>Facture</span><b>→</b><span>Maintenance</span>
        </div>
      </section>

      <section id="controle" className="cvc-section cvc-control-section">
        <div className="cvc-section-head cvc-section-head-wide cvc-section-head-dark">
          <span>03 · LE CONTRÔLE</span>
          <h2>Le répétitif à SESIRA. La décision à vous.</h2>
          <p>Le niveau d&apos;automatisation dépend de la confiance et de la politique de l&apos;entreprise, pas du prix de l&apos;abonnement.</p>
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
            <p>SESIRA fait remonter le dossier. La négociation reste une décision humaine.</p>
          </div>
          <div className="cvc-work-split">
            <div><b>SESIRA PRÉPARE</b><b>VOTRE ÉQUIPE DÉCIDE</b></div>
            {WORK_SPLIT.map(([sesira, human]) => (
              <div key={sesira}><span>{sesira}</span><strong>{human}</strong></div>
            ))}
          </div>
        </div>
      </section>

      <section id="commencer" className="cvc-section cvc-start-section">
        <div className="cvc-start-grid">
          <div className="cvc-offer-card">
            <span>04 · COMMENCER</span>
            <h2>Commencez par un constat, pas par un logiciel.</h2>
            <p>Pendant 90 jours, SESIRA observe vos demandes, vos devis et vos relances. Il n&apos;envoie rien, ne relance personne et ne modifie aucun dossier à votre place.</p>
            <p>À la fin, vous recevez un document daté : les devis restés sans suite, les demandes jamais reprises et vos délais réels de prise en charge.</p>
            <div className="cvc-offer-price"><strong>590 €</strong><span>90 jours · sans engagement</span></div>
            <small>Déduits de l&apos;installation si vous continuez.</small>
            <a className="button primary" href="mailto:paul@sesira.fr?subject=Constat%20SESIRA%2090%20jours">Demander mon constat sur 90 jours</a>
            <Link className="cvc-offer-secondary" href="/diagnostic">Ou calculer ce qui se perd chez moi →</Link>
          </div>

          <aside className="cvc-founder-card">
            <span>FONDATEUR</span>
            <h3>Paul Nkengue</h3>
            <p>J&apos;ai passé des années en vente B2B à regarder la même chose se produire : ce n&apos;est presque jamais le gros problème qui fait perdre un dossier. C&apos;est le devis qu&apos;on n&apos;a pas relancé, la demande qu&apos;on a lue puis jamais reprise, la vente gagnée qui n&apos;est jamais arrivée au planning.</p>
            <p>Les informations existaient. Ce qui manquait, c&apos;était un système capable de dire ce qui devait se passer ensuite — et de le signaler quand ça ne se passait pas.</p>
            <p className="cvc-founder-math">Ma formation de mathématicien tient dans une autre partie du produit : séparer ce qu&apos;on observe de ce qu&apos;on estime, et de ce qu&apos;on ne sait pas.</p>
          </aside>
        </div>
      </section>

      <footer className="cvc-footer">
        <SesiraLogo />
        <p>Automatisez le normal. Traitez l&apos;exception. Gardez la décision.</p>
        <div><Link href="/diagnostic">Diagnostic</Link><Link href="/login">Connexion</Link></div>
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
        <span>SESIRA · AUJOURD&apos;HUI</span>
        <b>EXEMPLE · DONNÉES FICTIVES</b>
      </div>
      <div className="cvc-product-body">
        <div className="cvc-product-heading">
          <div><span>AUJOURD&apos;HUI</span><h3>Vue d&apos;ensemble</h3><p>Ce qui mérite une action dans votre entreprise.</p></div>
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
