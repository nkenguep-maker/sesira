import type { Metadata } from "next";
import Link from "next/link";

import { SesiraLogo } from "@/components/sesira/logo";

export const metadata: Metadata = {
  title: "SESIRA | Suivi des devis, chantiers et factures CVC",
  description:
    "SESIRA montre chaque matin les devis à relancer, les interventions à planifier et les factures à reprendre.",
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
    kind: "RAPPORT TERRAIN",
    title: "Intervention #1842",
    detail: "Le technicien a terminé. Rapport à valider.",
    action: "Valider",
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

const TRACKED = [
  {
    tag: "VENDRE",
    title: "Les devis partis dont personne n'a de nouvelles.",
    value: "18 450 €",
    detail: "Envoyé il y a 6 jours · aucune relance",
  },
  {
    tag: "EXÉCUTER",
    title: "Les chantiers vendus qui ne sont pas encore au planning.",
    value: "Dupont SARL",
    detail: "Devis signé · aucune date prévue",
  },
  {
    tag: "ENCAISSER",
    title: "Les factures parties dont l'argent n'est pas arrivé.",
    value: "12 400 €",
    detail: "Paiement annoncé vendredi · toujours rien",
  },
] as const;

export default function HomePage() {
  return (
    <main className="cvc-shell">
      <nav className="cvc-nav" aria-label="Navigation principale">
        <Link href="/" aria-label="SESIRA">
          <SesiraLogo />
        </Link>
        <div className="cvc-nav-links">
          <a href="#aujourdhui">Aujourd&apos;hui</a>
          <a href="#suivi">Ce que ça suit</a>
          <a href="#commencer">Commencer</a>
          <Link className="cvc-nav-login" href="/login">Connexion</Link>
          <Link className="button primary small" href="/diagnostic">Calculer</Link>
        </div>
      </nav>

      <header className="cvc-hero">
        <div className="cvc-hero-copy">
          <span className="cvc-kicker">SESIRA · ENTREPRISES CVC DE 8 À 50 PERSONNES</span>
          <h1>Vous avez déjà fait le travail. Le devis est parti. Et puis plus rien.</h1>
          <p className="cvc-hero-lede">
            Chaque matin, SESIRA vous dit quel devis relancer, quelle intervention planifier, quelle facture réclamer.
          </p>
          <div className="cvc-actions">
            <Link className="button primary" href="/diagnostic">Calculer ce qui se perd chez moi</Link>
            <a className="cvc-text-link" href="#aujourdhui">Voir un écran</a>
          </div>
          <small>Gratuit · sans compte · 3 minutes</small>
        </div>

        <div className="cvc-hero-product" aria-hidden="true">
          <TodayPreview compact />
        </div>
      </header>

      <section className="cvc-now" aria-labelledby="now-title">
        <div>
          <span>POURQUOI MAINTENANT</span>
          <h2 id="now-title">Deux dates que vous n&apos;avez pas choisies.</h2>
        </div>
        <div className="cvc-now-dates">
          <article>
            <strong>1er septembre 2027</strong>
            <p>Vos factures devront être électroniques.</p>
          </article>
          <article>
            <strong>31 janvier, chaque année</strong>
            <p>Votre bilan de fluides est attendu.</p>
          </article>
        </div>
        <p className="cvc-now-note">
          SESIRA suit vos équipements et prépare les documents. <strong>Le dépôt reste le vôtre</strong> — aucun logiciel ne peut le faire à votre place, et méfiez-vous de ceux qui le promettent.
        </p>
        <small>Couche réglementaire livrée à l&apos;ouverture.</small>
      </section>

      <section id="aujourdhui" className="cvc-today-section">
        <div className="cvc-section-title">
          <span>SESIRA AUJOURD&apos;HUI</span>
          <h2>Ce matin, cinq choses sont restées en plan.</h2>
        </div>
        <TodayPreview />
      </section>

      <section id="suivi" className="cvc-follow-section">
        <div className="cvc-section-title">
          <span>CE QUE ÇA SUIT</span>
          <h2>Trois endroits où ça coince.</h2>
        </div>
        <div className="cvc-follow-grid">
          {TRACKED.map((item) => (
            <article key={item.tag}>
              <span>{item.tag}</span>
              <h3>{item.title}</h3>
              <div>
                <strong>{item.value}</strong>
                <p>{item.detail}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="cvc-control-brief">
        <div>
          <span>QUI DÉCIDE</span>
          <h2>SESIRA prépare. Vous décidez.</h2>
        </div>
        <div>
          <p>
            Relances, rapports, documents : SESIRA les prépare. Les prix, les remises, les litiges et les réclamations restent chez vous. Vous choisissez ce qu&apos;il fait tout seul, et quand.
          </p>
          <Link href="/automatisation">Comment fonctionne l&apos;automatisation →</Link>
        </div>
      </section>

      <section id="commencer" className="cvc-start-section">
        <div className="cvc-start-copy">
          <span>COMMENCER</span>
          <h2>Commencez par un constat, pas par un logiciel.</h2>
          <p>
            Pendant 90 jours, SESIRA lit vos demandes, vos devis et vos relances. Il n&apos;envoie rien, ne relance personne. À la fin, vous recevez un document daté : les devis restés sans réponse, les demandes jamais reprises, vos délais réels.
          </p>
        </div>
        <div className="cvc-start-card">
          <strong>590 €</strong>
          <p>90 jours · sans engagement</p>
          <small>Déduits de l&apos;installation si vous continuez.</small>
          <a className="button primary" href="mailto:paul@sesira.fr?subject=Constat%2090%20jours%20SESIRA">Demander mon constat</a>
        </div>
      </section>

      <section className="cvc-founder-short">
        <div className="cvc-founder-photo" aria-hidden="true">PN</div>
        <div>
          <span>Paul Nkengue, fondateur</span>
          <p>
            J&apos;ai passé des années en vente B2B à voir la même chose : ce n&apos;est jamais le gros problème qui fait perdre un dossier, c&apos;est le devis que personne n&apos;a relancé. Quand SESIRA ne sait pas quelque chose, il l&apos;écrit — il n&apos;invente pas un chiffre pour faire joli.
          </p>
        </div>
      </section>

      <footer className="cvc-footer">
        <SesiraLogo />
        <p>Le suivi, c&apos;est SESIRA. Les décisions, c&apos;est vous.</p>
        <div>
          <Link href="/diagnostic">Calculer</Link>
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
        <span>SESIRA · AUJOURD&apos;HUI</span>
        <b>EXEMPLE · DONNÉES FICTIVES</b>
      </div>
      <div className="cvc-product-body">
        <div className="cvc-product-heading">
          <div>
            <span>VENDREDI 4 SEPTEMBRE</span>
            <h3>5 choses à traiter</h3>
          </div>
          <div className="cvc-product-count"><strong>5</strong><span>à voir</span></div>
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
