import Link from "next/link";
import { SesiraLogo } from "@/components/sesira/logo";

export default function HomePage() {
  return (
    <main className="landing-shell">
      <nav className="landing-nav">
        <SesiraLogo />
        <div className="landing-nav-links">
          <a href="#produit">Produit</a>
          <a href="#methode">Méthode</a>
          <Link href="/diagnostic">Diagnostic</Link>
          <a href="#fondateur">Qui construit SESIRA</a>
          <Link className="button ghost small" href="/login">Connexion</Link>
          <Link className="button primary small" href="/diagnostic">Faire le diagnostic</Link>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">OPERATING SYSTEM · PME</span>
          <h1>Votre entreprise,<br /><em>enfin lisible.</em></h1>
          <p>SESIRA réunit vos clients, vos devis, votre suivi et vos opérations dans un système simple à lire et simple à piloter.</p>
          <div className="hero-actions">
            <Link href="/diagnostic" className="button primary">Faire le diagnostic</Link>
            <Link href="/login" className="text-link">Ouvrir SESIRA <span>↘</span></Link>
          </div>
        </div>
        <div className="hero-system" aria-label="Aperçu de l’application SESIRA">
          <div className="system-top"><span>SESIRA / AUJOURD’HUI</span><span className="live-dot">ACTIF</span></div>
          <div className="system-grid">
            <div className="system-score"><small>À traiter</small><strong>—</strong><span>Les données apparaîtront après connexion.</span></div>
            <div className="system-list">
              <div><span>Clients</span><b>non connecté</b></div>
              <div><span>Devis</span><b>non connecté</b></div>
              <div><span>Email</span><b>à configurer</b></div>
              <div><span>Suivi</span><b>à configurer</b></div>
            </div>
          </div>
          <div className="system-line" />
        </div>
      </section>

      <section id="produit" className="landing-section">
        <div className="section-intro"><span className="eyebrow">01 · PRODUIT</span><h2>Une seule lecture du travail.</h2></div>
        <div className="feature-grid">
          <article><span>01</span><h3>Voir</h3><p>Une vue opérationnelle nette, sans multiplier les tableaux et les outils.</p></article>
          <article><span>02</span><h3>Décider</h3><p>Les priorités importantes remontent avant le bruit quotidien.</p></article>
          <article><span>03</span><h3>Suivre</h3><p>Clients, devis, emails et actions restent reliés au même contexte.</p></article>
        </div>
      </section>

      <section id="methode" className="landing-section dark-section">
        <div className="section-intro"><span className="eyebrow">02 · MÉTHODE</span><h2>Connecter d’abord.<br />Automatiser ensuite.</h2></div>
        <p className="method-copy">SESIRA n’invente pas vos données. L’application affiche ce qui est réellement connecté et signale clairement ce qui ne l’est pas encore.</p>
      </section>

      <section id="fondateur" className="landing-section founder-section">
        <div className="section-intro founder-intro">
          <span className="eyebrow">03 · QUI CONSTRUIT SESIRA</span>
          <div>
            <h2>Une observation née du terrain.<br />Une équipe construite autour du problème.</h2>
            <p className="founder-lede">
              J’ai passé plus de dix ans au contact d’entreprises de tailles très différentes, de la prospection au recouvrement en passant par la vente, le service client et l’onboarding. Derrière des métiers différents, j’ai retrouvé le même moment de rupture : quelque chose devait arriver ensuite, mais aucun système ne s’assurait que cela arrive.
            </p>
            <p className="founder-copy">
              Une demande attend une réponse. Un devis part puis disparaît du radar. Un contrat est signé mais son démarrage se décale. Un message important reste dans une boite de réception. Une facture arrive à échéance et la relance dépend encore de la mémoire de quelqu’un. C’est de cette répétition qu’est né SESIRA.
            </p>
            <p className="founder-copy">
              Aujourd’hui, SESIRA ne repose pas sur l’expérience d’une seule personne. Notre équipe réunit des compétences en vente B2B, relation client, opérations, cybersécurité, produit, logiciel et automatisation. Des disciplines différentes avec une même obsession : comprendre ce qui doit arriver ensuite et empêcher que cela se perde.
            </p>
          </div>
        </div>

        <div className="founder-proof-grid">
          <article>
            <span className="eyebrow">FONDATEUR</span>
            <h3>Le problème vécu sous plusieurs angles.</h3>
            <p>Plus de 10 ans dans la tech, la vente et la cybersécurité. Plus de 1 000 entreprises accompagnées, de 10 à 2 000 salariés. Une expérience du cycle client qui va de la prospection au recouvrement.</p>
          </article>
          <article>
            <span className="eyebrow">ÉQUIPE</span>
            <h3>Les compétences nécessaires pour l’exécuter.</h3>
            <p>Vente B2B, relation client, opérations, cybersécurité, produit, logiciel et automatisation sont réunis autour d’un même système plutôt qu’empilés comme des fonctions séparées.</p>
          </article>
          <article>
            <span className="eyebrow">PME PARTENAIRES</span>
            <h3>La réalité du métier dans la boucle de conception.</h3>
            <p>Des dirigeants et équipes de PME partenaires confrontent SESIRA à leurs demandes, devis, emails, interventions et contraintes réelles. Ils testent nos hypothèses et nous aident à adapter le produit avant de généraliser une fonctionnalité.</p>
          </article>
        </div>

        <div className="founder-partner-statement">
          <span className="eyebrow">NOTRE BOUCLE DE CONCEPTION</span>
          <p>Nous apportons la technologie et la méthode. Nos partenaires apportent la réalité du terrain.</p>
          <p>SESIRA doit s’adapter au fonctionnement d’une PME, pas demander à la PME de se transformer pour s’adapter au logiciel.</p>
        </div>

        <div className="founder-signature">
          <strong>Paul Nkengue</strong>
          <span>Fondateur de SESIRA</span>
          <small>Plus de 10 ans dans la tech, la vente et la cybersécurité · Plus de 1 000 entreprises accompagnées · Mathématicien de formation</small>
        </div>
      </section>

      <footer className="landing-footer"><SesiraLogo /><span>© 2026 SESIRA</span><Link href="/diagnostic">Diagnostic</Link><Link href="/login">Connexion</Link></footer>
    </main>
  );
}
