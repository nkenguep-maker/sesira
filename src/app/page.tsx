import type { Metadata } from "next";
import Link from "next/link";

import { SesiraLogo } from "@/components/sesira/logo";

export const metadata: Metadata = {
  title: "SESIRA | Devis, chantiers, factures et entretien CVC",
  description:
    "SESIRA met vos devis, interventions, factures et contrats d'entretien au même endroit et vous montre ce qui attend une action.",
};

const TODAY_ITEMS = [
  {
    kind: "DEVIS",
    title: "18 450 € · Sophie Lefèvre",
    detail: "Envoyé il y a 6 jours. Personne n'a relancé.",
    action: "Relancer",
  },
  {
    kind: "INTERVENTION",
    title: "Dupont SARL",
    detail: "Chantier vendu. Aucune date au planning.",
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
    detail: "Le client avait annoncé un paiement vendredi.",
    action: "Suivre",
  },
  {
    kind: "ENTRETIEN",
    title: "Martin & Fils",
    detail: "Contrat d'entretien à renouveler dans 26 jours.",
    action: "Préparer",
  },
] as const;

const CORE_PRODUCTS = [
  {
    number: "01",
    title: "VENDRE",
    headline: "Les devis partis dont personne n'a de nouvelles.",
    detail: "SESIRA garde les devis, les relances, les réponses clients et les objections au même endroit.",
    outcome: "Vous savez qui rappeler aujourd'hui.",
  },
  {
    number: "02",
    title: "EXÉCUTER",
    headline: "Les chantiers vendus qui ne sont pas encore au planning.",
    detail: "Le devis, la date d'intervention, le technicien, les documents et le rapport restent liés au même client.",
    outcome: "Vous voyez ce qui doit encore être planifié ou validé.",
  },
  {
    number: "03",
    title: "ENCAISSER",
    headline: "Les factures parties dont l'argent n'est pas arrivé.",
    detail: "SESIRA suit les échéances, les retards, les promesses de paiement et les litiges sans décider à votre place.",
    outcome: "Vous savez quelle facture réclamer et laquelle laisser tranquille.",
  },
  {
    number: "04",
    title: "ENTRETENIR",
    headline: "Les contrats d'entretien qu'il ne faut pas laisser expirer.",
    detail: "Visites, prochaines dates, renouvellements et besoins futurs restent rattachés au client après le chantier.",
    outcome: "Vous préparez le renouvellement avant la date limite.",
  },
] as const;

const PLATFORM_LAYERS = [
  {
    title: "Trouver de nouveaux clients",
    text: "Leads, campagnes, contenus et conversations restent rattachés à la vente qu'ils ont réellement générée quand l'information existe.",
    tag: "NOUVEAUX CLIENTS",
  },
  {
    title: "Techniciens sur mobile",
    text: "Le technicien retrouve l'intervention, les informations utiles, les documents et le rapport à remplir depuis son téléphone.",
    tag: "TERRAIN",
  },
  {
    title: "Appels et messages",
    text: "Les demandes entrantes restent avec le bon client. Votre équipe voit ce qui a été dit et ce qui attend une réponse.",
    tag: "CLIENTS",
  },
  {
    title: "F-Gas, CERFA et e-facture",
    text: "SESIRA prépare les données à partir des interventions déjà saisies. Les validations et envois externes restent sous votre contrôle.",
    tag: "OBLIGATIONS",
  },
  {
    title: "Relances et tâches automatiques",
    text: "Une règle peut d'abord regarder, puis préparer, puis agir seule uniquement quand vous l'avez autorisée.",
    tag: "AUTOMATISATION",
  },
  {
    title: "Voir ce que SESIRA a fait",
    text: "Exécutions, erreurs, coûts et automatisations restent visibles pour que vous sachiez ce qui tourne réellement.",
    tag: "SUIVI",
  },
] as const;

const AUTOMATION_LEVELS = [
  ["01", "Observe", "SESIRA regarde ce qui se passe et compte ce qui reste en plan."],
  ["02", "Prépare", "SESIRA prépare le message ou la tâche sans l'envoyer."],
  ["03", "Vous validez", "Votre équipe relit et confirme avant que quelque chose parte."],
  ["04", "Automatique", "La règle agit seule uniquement dans les cas que vous avez autorisés."],
] as const;

const WORK_SPLIT = [
  ["Repérer les devis sans réponse", "Choisir le prix"],
  ["Préparer un message de relance", "Accorder une remise"],
  ["Repérer une facture en retard", "Décider quoi faire"],
  ["Préparer les données F-Gas et CERFA", "Valider ce qui part à l'extérieur"],
] as const;

const JOURNEY = [
  "Demande",
  "Devis",
  "Chantier",
  "Rapport",
  "Facture",
  "Entretien",
  "Nouvelle vente",
] as const;

export default function HomePage() {
  return (
    <main className="cvc-shell">
      <nav className="cvc-nav" aria-label="Navigation principale">
        <Link href="/" aria-label="SESIRA"><SesiraLogo /></Link>
        <div className="cvc-nav-links">
          <a href="#produit">Comment ça marche</a>
          <a href="#plateforme">Ce que SESIRA suit</a>
          <a href="#controle">Qui décide</a>
          <a href="#cvc">Pour le CVC</a>
          <Link className="cvc-nav-login" href="/login">Connexion</Link>
          <a className="button primary small" href="mailto:paul@sesira.fr?subject=Démo%20SESIRA">Demander une démo</a>
        </div>
      </nav>

      <header className="cvc-hero">
        <div className="cvc-hero-copy">
          <span className="cvc-kicker">SESIRA · POUR LES ENTREPRISES CVC DE 8 À 50 PERSONNES</span>
          <h1>Vos devis, vos chantiers et vos factures ne se parlent pas.</h1>
          <p className="cvc-hero-lede">
            Chaque matin, SESIRA vous dit quel devis relancer, quelle intervention planifier et quelle facture suivre. Vous n'avez plus à chercher dans les mails, le planning et les tableaux.
          </p>
          <div className="cvc-actions">
            <a className="button primary" href="mailto:paul@sesira.fr?subject=Démo%20SESIRA">Voir SESIRA avec mes propres cas</a>
            <Link className="cvc-text-link" href="/diagnostic">Faire le diagnostic gratuit</Link>
          </div>
          <small>Démo avec le fondateur · sans engagement</small>
        </div>

        <div className="cvc-hero-product">
          <div className="cvc-hero-product-meta">
            <span>AUJOURD'HUI</span>
            <b>5 choses à traiter</b>
          </div>
          <TodayPreview compact />
          <div className="cvc-hero-proof-row">
            <div><strong>1</strong><span>devis à relancer</span></div>
            <div><strong>1</strong><span>chantier à planifier</span></div>
            <div><strong>1</strong><span>facture à suivre</span></div>
          </div>
        </div>
      </header>

      <section id="produit" className="cvc-section cvc-journey-section">
        <div className="cvc-section-head cvc-section-head-wide">
          <span>01 · DU DEVIS AU CONTRAT D'ENTRETIEN</span>
          <h2>SESIRA suit le même client du premier devis au prochain entretien.</h2>
          <p>
            Le devis, le planning, le rapport du technicien, la facture et le contrat d'entretien restent liés. Quand quelque chose manque, vous le voyez.
          </p>
        </div>

        <div className="cvc-journey-line" aria-label="Étapes suivies par SESIRA">
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
            <span>DEVIS</span>
            <h3>18 450 € envoyés il y a 6 jours. Toujours aucune relance.</h3>
            <p>SESIRA remet le devis devant la bonne personne avant qu'il soit oublié.</p>
          </article>
          <article>
            <span>CHANTIER</span>
            <h3>Le client a signé. Le chantier n'est toujours pas au planning.</h3>
            <p>SESIRA montre la vente gagnée et la date d'intervention qui manque.</p>
          </article>
          <article>
            <span>FACTURE</span>
            <h3>12 400 € facturés. Le paiement annoncé vendredi n'est pas arrivé.</h3>
            <p>SESIRA garde la promesse de paiement visible pour que quelqu'un reprenne le client.</p>
          </article>
        </div>
      </section>

      <section id="plateforme" className="cvc-section cvc-platform-section">
        <div className="cvc-section-head cvc-section-head-wide">
          <span>02 · CE QUE SESIRA SUIT</span>
          <h2>Quatre choses que vous regardez déjà tous les jours.</h2>
          <p>Les devis, les chantiers, les factures et les contrats d'entretien restent ensemble du début à la fin.</p>
        </div>

        <div className="cvc-core-grid">
          {CORE_PRODUCTS.map((product) => (
            <article key={product.title}>
              <div className="cvc-core-top"><span>{product.number}</span><b>{product.title}</b></div>
              <h3>{product.headline}</h3>
              <p>{product.detail}</p>
              <div className="cvc-core-outcome"><span>AU QUOTIDIEN</span><strong>{product.outcome}</strong></div>
            </article>
          ))}
        </div>
      </section>

      <section id="aujourdhui" className="cvc-section cvc-today-section">
        <div className="cvc-section-head cvc-section-head-wide">
          <span>03 · SESIRA AUJOURD'HUI</span>
          <h2>Vous ouvrez SESIRA et vous voyez ce qu'il faut traiter aujourd'hui.</h2>
          <p>
            Un devis sans réponse. Un chantier sans date. Un rapport à valider. Une facture à réclamer. Un contrat d'entretien à renouveler.
          </p>
        </div>
        <TodayPreview />
      </section>

      <section className="cvc-section cvc-depth-section">
        <div className="cvc-section-head cvc-section-head-wide">
          <span>04 · LE RESTE DU TRAVAIL</span>
          <h2>Techniciens, appels, obligations et nouveaux clients restent rattachés au bon client.</h2>
          <p>SESIRA couvre aussi ce qui se passe avant le devis, sur le chantier et après la facture.</p>
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
          <span>05 · QUI FAIT QUOI</span>
          <h2>Le suivi, c'est SESIRA. Les décisions, c'est vous.</h2>
          <p>
            SESIRA peut repérer un devis oublié ou préparer une relance. Un prix, une remise, un litige ou un engagement important reste entre vos mains.
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
            <span>LE CLIENT HÉSITE SUR LE PRIX</span>
            <h3>Sophie Lefèvre · 18 450 € HT</h3>
            <blockquote>« Nous sommes toujours intéressés, mais le tarif dépasse un peu notre budget. »</blockquote>
            <p>SESIRA garde la réponse visible et prépare la suite. C'est vous qui décidez si vous rappelez, négociez ou laissez le devis tel quel.</p>
          </div>
          <div className="cvc-work-split">
            <div><b>SESIRA</b><b>VOUS</b></div>
            {WORK_SPLIT.map(([sesira, human]) => (
              <div key={sesira}><span>{sesira}</span><strong>{human}</strong></div>
            ))}
          </div>
        </div>
      </section>

      <section id="cvc" className="cvc-section cvc-cvc-section">
        <div className="cvc-cvc-grid">
          <div className="cvc-section-head">
            <span>06 · FAIT POUR LE CVC</span>
            <h2>Devis, planning, techniciens, fluides et entretien : SESIRA suit votre vrai travail.</h2>
            <p>
              Votre journée passe du devis au chantier, puis à la facture et au contrat d'entretien. SESIRA a été construit autour de ce travail-là.
            </p>
          </div>

          <div className="cvc-cvc-stack">
            <article><span>VENTE</span><strong>Devis, variantes, réponses clients et relances.</strong></article>
            <article><span>CHANTIERS</span><strong>Planning, techniciens, rapports et documents.</strong></article>
            <article><span>FACTURES</span><strong>Échéances, promesses de paiement et litiges.</strong></article>
            <article><span>ENTRETIEN</span><strong>Contrats, visites et renouvellements.</strong></article>
            <article><span>OBLIGATIONS</span><strong>F-Gas, CERFA, bilan annuel et facturation électronique.</strong></article>
          </div>
        </div>
      </section>

      <section className="cvc-section cvc-reg-section">
        <div className="cvc-reg-grid">
          <div>
            <span>DATES À SUIVRE</span>
            <h2>SESIRA prépare les données F-Gas, CERFA et e-facture à partir du travail déjà saisi.</h2>
          </div>
          <div className="cvc-reg-copy">
            <p>Le technicien remplit son intervention une fois. Les informations utiles restent disponibles pour préparer les documents et échéances qui suivent.</p>
            <div className="cvc-reg-points">
              <div><strong>F-Gas & CERFA</strong><span>Données d'intervention et éléments nécessaires au suivi annuel.</span></div>
              <div><strong>Facturation électronique</strong><span>Factures préparées pour passer par le prestataire prévu pour la transmission.</span></div>
              <div><strong>Vous gardez la main</strong><span>Les actions externes importantes restent soumises à votre validation.</span></div>
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
            <p>J'ai passé des années en vente B2B à voir la même chose : un devis est envoyé, tout le monde passe au suivant, puis personne ne rappelle le client. Le problème n'était pas le travail. Le travail avait déjà été fait.</p>
            <p>Je suis matheux de formation. Ici, ça sert à une chose : quand SESIRA ne sait pas, il l'écrit. Il n'invente pas un chiffre pour faire joli.</p>
          </div>
        </div>
      </section>

      <section id="demo" className="cvc-section cvc-cta-section">
        <div className="cvc-cta-panel">
          <div>
            <span>VOIR SESIRA AVEC VOS PROPRES CAS</span>
            <h2>On prend un devis, un chantier et une facture. Je vous montre ce que SESIRA en ferait.</h2>
            <p>La démo part de votre façon de travailler aujourd'hui. Vous voyez tout de suite ce qui vous serait utile.</p>
          </div>
          <div className="cvc-cta-actions">
            <a className="button primary" href="mailto:paul@sesira.fr?subject=Démo%20SESIRA">Demander une démo</a>
            <Link className="button cvc-secondary-button" href="/diagnostic">Faire le diagnostic gratuit</Link>
            <small>Avec le fondateur · PME CVC · sans engagement</small>
          </div>
        </div>
      </section>

      <footer className="cvc-footer">
        <SesiraLogo />
        <p>Le suivi, c'est SESIRA. Les décisions, c'est vous.</p>
        <div><a href="#plateforme">Ce que SESIRA suit</a><Link href="/diagnostic">Diagnostic</Link><Link href="/login">Connexion</Link></div>
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
          <div><span>AUJOURD'HUI</span><h3>À traiter aujourd'hui</h3><p>Les devis, chantiers et factures qui attendent quelque chose.</p></div>
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
