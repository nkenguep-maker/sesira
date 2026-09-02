import type { Metadata } from "next";
import Link from "next/link";

import { SesiraLogo } from "@/components/sesira/logo";

export const metadata: Metadata = {
  title: "SESIRA | Suivi des devis pour PME CVC",
  description:
    "SESIRA surveille les devis envoyés, prépare les relances et fait remonter les décisions importantes aux PME du chauffage, de la climatisation et des pompes à chaleur.",
};

const WORK_SPLIT = [
  ["Surveiller les devis", "Le prix"],
  ["Préparer les relances", "Une remise"],
  ["Repérer une réponse", "Une réclamation"],
  ["Tenir le suivi à jour", "Un litige"],
] as const;

export default function HomePage() {
  return (
    <main className="cvc-shell">
      <nav className="cvc-nav">
        <Link href="/" aria-label="SESIRA"><SesiraLogo /></Link>
        <div className="cvc-nav-links">
          <a href="#probleme">Le problème</a>
          <a href="#fonctionnement">Comment ça marche</a>
          <a href="#produit">Le produit</a>
          <a href="#fondateur">Fondateur</a>
          <Link className="button ghost small" href="/login">Connexion</Link>
          <Link className="button primary small" href="/diagnostic">Faire le calcul</Link>
        </div>
      </nav>

      <section className="cvc-hero">
        <div className="cvc-hero-copy">
          <span className="cvc-kicker">SESIRA · CHAUFFAGE · CLIMATISATION · POMPES À CHALEUR</span>
          <h1>Des devis déjà envoyés <em>dorment dans votre boîte mail.</em></h1>
          <p className="cvc-hero-lede">
            SESIRA surveille vos devis. Quand un client ne répond pas, il prépare la relance et vous la montre. Vous décidez. SESIRA envoie seulement quand vous l’autorisez.
          </p>
          <p className="cvc-hero-note">Vous ne pouvez pas prendre tous les chantiers. Le but est de ne pas perdre les bons.</p>
          <div className="cvc-actions">
            <Link className="button primary" href="/diagnostic">Voir si SESIRA est rentable chez moi</Link>
            <a className="cvc-text-link" href="#probleme">Comprendre en 2 minutes</a>
          </div>
          <small>Gratuit · sans compte · premier résultat en un clic</small>
        </div>

        <div className="cvc-quote-demo" aria-label="Exemple de devis surveillé par SESIRA">
          <div className="cvc-demo-top"><span>SESIRA REGARDE CE DEVIS</span><span>EXEMPLE</span></div>
          <h2>Sophie Lefèvre</h2>
          <p>Pompe à chaleur air eau · Rhône</p>
          <strong>18 450 € HT</strong>
          <dl>
            <div><dt>Envoyé</dt><dd>il y a 3 jours</dd></div>
            <div><dt>Le client a répondu</dt><dd>non</dd></div>
          </dl>
          <div className="cvc-demo-alert"><span /> <p><b>Aujourd’hui, SESIRA préparerait la relance.</b><br />Il attend votre feu vert.</p></div>
          <small>Rien n’est parti</small>
        </div>
      </section>

      <section id="probleme" className="cvc-section cvc-light">
        <div className="cvc-section-head">
          <span>01 · LE PROBLÈME</span>
          <h2>Ce devis, vous l’avez déjà payé.</h2>
          <p>La demande, le déplacement, le rendez vous et le chiffrage sont déjà faits quand le devis part. Ensuite, trop souvent, le suivi repose encore sur une boîte mail, un rappel personnel ou la mémoire de quelqu’un.</p>
        </div>
        <div className="cvc-flow" aria-label="Cycle d'un devis">
          <span>Le client appelle</span><b>→</b><span>Vous vous déplacez</span><b>→</b><span>Vous chiffrez</span><b>→</b><span>Le devis part</span><b>→</b><em>?</em>
        </div>
        <div className="cvc-problem-grid">
          <div>
            <h3>Ce point d’interrogation, c’est le travail de SESIRA.</h3>
            <p>Il regarde ce qui devait arriver ensuite et fait remonter ce qui risque de se perdre.</p>
          </div>
          <div className="cvc-example-card">
            <span>UN MOIS · EXEMPLE</span>
            <div><strong>47</strong><small>devis suivis</small></div>
            <div><strong>12</strong><small>sans réponse</small></div>
            <div><strong>148 k€</strong><small>encore ouverts</small></div>
            <div><strong>4</strong><small>à regarder aujourd’hui</small></div>
          </div>
        </div>
      </section>

      <section id="fonctionnement" className="cvc-section cvc-sand">
        <div className="cvc-section-head">
          <span>02 · COMMENT ÇA MARCHE</span>
          <h2>Rien ne part sans que vous l’ayez lu.</h2>
          <p>Au départ, SESIRA observe et prépare. Vous gardez le contrôle. L’automatisation vient seulement après, quand les règles sont claires et que vous avez confiance dans le comportement du système.</p>
        </div>
        <div className="cvc-steps">
          <article><span>01</span><h3>Il regarde</h3><p>SESIRA repère les devis restés sans réponse. Aucun message n’est envoyé.</p></article>
          <article><span>02</span><h3>Il vous montre</h3><p>Il prépare la relance et explique pourquoi ce dossier remonte maintenant.</p></article>
          <article className="featured"><span>03</span><h3>Vous validez</h3><p>Vous lisez, vous corrigez si nécessaire, puis vous décidez.</p></article>
          <article><span>04</span><h3>Il automatise</h3><p>Uniquement ce que vous avez explicitement autorisé.</p></article>
        </div>
      </section>

      <section className="cvc-section cvc-dark">
        <div className="cvc-section-head">
          <span>03 · LA FRONTIÈRE</span>
          <h2>Le répétitif à SESIRA. La décision à vous.</h2>
          <p>Le but n’est pas de sortir l’équipe du circuit. Le but est de ne lui laisser que ce qui mérite réellement une décision humaine.</p>
        </div>
        <div className="cvc-split-grid">
          <div className="cvc-decision-demo">
            <span>LE CLIENT TROUVE ÇA TROP CHER</span>
            <h3>Sophie Lefèvre · 18 450 € HT</h3>
            <blockquote>Nous sommes toujours intéressés, mais le tarif dépasse un peu notre budget.</blockquote>
            <p><b>Pourquoi SESIRA vous le montre</b><br />Parler d’argent avec un client, ce n’est pas au logiciel de décider à votre place.</p>
          </div>
          <div className="cvc-work-split">
            <div><b>SESIRA S’EN OCCUPE</b><b>VOUS DÉCIDEZ</b></div>
            {WORK_SPLIT.map(([sesira, human]) => <div key={sesira}><span>{sesira}</span><strong>{human}</strong></div>)}
          </div>
        </div>
      </section>

      <section id="produit" className="cvc-section cvc-light">
        <div className="cvc-section-head">
          <span>04 · CE QUE VOUS REGARDEZ</span>
          <h2>Trois choses demandent votre attention. Pas trente tableaux.</h2>
          <p>Le produit doit répondre à une question simple le matin : qu’est ce qui mérite vraiment que je m’en occupe aujourd’hui ?</p>
        </div>
        <div className="cvc-product-frame">
          <div className="cvc-product-top"><strong>MARDI · 08:17</strong><span>À regarder aujourd’hui · 3</span></div>
          <article><div><span>DEVIS</span><strong>18 450 € · Sophie Lefèvre</strong><p>Cliente intéressée, mais prix jugé élevé.</p></div><b>À vous de décider</b></article>
          <article><div><span>DEVIS</span><strong>9 800 € · Dupont SARL</strong><p>Aucune réponse depuis 6 jours. Relance prête.</p></div><b>Relance à valider</b></article>
          <article><div><span>FACTURE</span><strong>4 850 € · Résidence Les Tilleuls</strong><p>En retard et sans réponse au premier rappel.</p></div><b>À vérifier</b></article>
        </div>
      </section>

      <section className="cvc-section cvc-sand">
        <div className="cvc-roi-grid">
          <div className="cvc-section-head">
            <span>05 · LE CALCUL</span>
            <h2>On mesure le seuil. On ne promet pas le résultat.</h2>
            <p>SESIRA ne prétend pas savoir combien de devis supplémentaires vous signerez. Le calcul montre simplement combien de devis additionnels suffiraient à couvrir son coût avec vos propres chiffres.</p>
          </div>
          <div className="cvc-roi-card">
            <span>EXEMPLE AFFICHÉ</span>
            <strong>6 devis</strong>
            <p>Avec 45 devis par mois, 12 000 € de montant moyen et 30 % de marge, six devis supplémentaires sur 540 envoyés dans l’année couvriraient un coût annuel de 19 200 €.</p>
            <small>Ce n’est pas une prévision de résultat.</small>
            <Link className="button primary" href="/diagnostic">Faire le calcul avec mon volume</Link>
          </div>
        </div>
      </section>

      <section id="fondateur" className="cvc-section cvc-founder">
        <div className="cvc-founder-grid">
          <div>
            <span className="cvc-kicker">QUI EST DERRIÈRE SESIRA</span>
            <h2>Paul Nkengue</h2>
            <p className="cvc-founder-role">Fondateur de SESIRA<br /><b>Mathématicien · Expert en vente B2B</b></p>
          </div>
          <div className="cvc-founder-copy">
            <p>Je travaille depuis plusieurs années au contact direct d’entreprises et d’équipes commerciales. J’ai vu le même problème sous différentes formes : une demande arrive, un devis part, un client répond, puis la prochaine action dépend encore trop souvent de la mémoire de quelqu’un.</p>
            <p>La vente B2B m’a montré où le suivi se casse. Les mathématiques influencent la façon dont je veux construire SESIRA : mesurer ce qui se passe réellement, rendre les hypothèses visibles et ne jamais confondre une estimation avec un résultat.</p>
            <p>Je ne prétends pas connaître votre métier technique mieux que vous. En revanche, un devis important resté plusieurs semaines sans réponse et une relance mal gérée, je connais très bien ce risque. SESIRA est construit pour que ce type de dossier ne disparaisse plus du radar.</p>
          </div>
        </div>
      </section>

      <section className="cvc-section cvc-dark cvc-start">
        <div>
          <span className="cvc-kicker">POUR QUI</span>
          <h2>Pour les PME CVC qui ont déjà assez de devis pour que le suivi devienne un système.</h2>
          <p>SESIRA vise les entreprises qui envoient régulièrement des devis, gèrent plusieurs dossiers en parallèle et veulent savoir ce qui mérite une action sans ajouter un logiciel de plus à surveiller.</p>
        </div>
        <div className="cvc-start-card">
          <h3>Voyez d’abord si le problème est assez gros chez vous.</h3>
          <Link className="button primary" href="/diagnostic">Faire le calcul</Link>
          <a className="button ghost" href="mailto:paul@sesira.fr?subject=SESIRA%20pour%20mon%20entreprise%20CVC">Parler à Paul</a>
          <small>Sans engagement · sans carte bancaire</small>
        </div>
      </section>

      <footer className="cvc-footer"><SesiraLogo /><span>© 2026 SESIRA</span><Link href="/diagnostic">Calcul</Link><Link href="/login">Connexion</Link></footer>
    </main>
  );
}
