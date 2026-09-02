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
          <a href="#fondateur">Fondateur</a>
          <Link className="button ghost small" href="/login">Connexion</Link>
          <Link className="button primary small" href="/login">Ouvrir SESIRA</Link>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">OPERATING SYSTEM · PME</span>
          <h1>Votre entreprise,<br /><em>enfin lisible.</em></h1>
          <p>SESIRA réunit vos clients, vos devis, votre suivi et vos opérations dans un système simple à lire et simple à piloter.</p>
          <div className="hero-actions">
            <Link href="/login" className="button primary">Entrer dans SESIRA</Link>
            <a href="#produit" className="text-link">Voir le système <span>↘</span></a>
          </div>
        </div>
        <div className="hero-system" aria-label="Aperçu de l’application SESIRA">
          <div className="system-top"><span>SESIRA / AUJOURD’HUI</span><span className="live-dot">ACTIF</span></div>
          <div className="system-grid">
            <div className="system-score"><small>À traiter</small><strong>—</strong><span>Les données apparaîtront après connexion.</span></div>
            <div className="system-list">
              <div><span>Clients</span><b>non connecté</b></div>
              <div><span>Devis</span><b>non connecté</b></div>
              <div><span>E-mail</span><b>à configurer</b></div>
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
          <article><span>03</span><h3>Suivre</h3><p>Clients, devis, e-mails et actions restent reliés au même contexte.</p></article>
        </div>
      </section>

      <section id="methode" className="landing-section dark-section">
        <div className="section-intro"><span className="eyebrow">02 · MÉTHODE</span><h2>Connecter d’abord.<br />Automatiser ensuite.</h2></div>
        <p className="method-copy">SESIRA n’invente pas vos données. L’application affiche ce qui est réellement connecté et signale clairement ce qui ne l’est pas encore.</p>
      </section>

      <section id="fondateur" className="landing-section">
        <div className="section-intro">
          <span className="eyebrow">03 · MOT DU FONDATEUR</span>
          <div>
            <h2>Le problème n’est pas le manque d’outils.<br />C’est ce qui passe entre eux.</h2>
            <p className="method-copy">
              Après plusieurs années dans la vente B2B, j’ai vu le même problème revenir dans beaucoup de PME : les outils existent, les équipes travaillent, les clients écrivent — mais le suivi se perd. Un devis n’est pas relancé, une demande reste dans un e-mail, une opportunité dépend de la mémoire de quelqu’un.
            </p>
            <p className="method-copy">
              J’ai créé SESIRA pour être la couche qui veille sur le fonctionnement quotidien de l’entreprise : observer ce qui se passe, faire remonter ce qui demande une action et préparer ou automatiser le travail répétitif sans retirer le contrôle à l’équipe.
            </p>
            <p className="eyebrow">PAUL NKENGUE · FONDATEUR, SESIRA</p>
          </div>
        </div>
      </section>

      <footer className="landing-footer"><SesiraLogo /><span>© 2026 SESIRA</span><Link href="/login">Connexion</Link></footer>
    </main>
  );
}
