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

      <section id="fondateur" className="landing-section">
        <div className="section-intro">
          <span className="eyebrow">03 · MOT DU FONDATEUR</span>
          <div>
            <h2>Le problème n’est pas le manque d’outils.<br />C’est ce qui se perd entre eux.</h2>
            <p className="method-copy">
              Je travaille depuis plusieurs années au contact direct de PME et de leurs équipes commerciales. J’ai mené des centaines de cycles de vente, suivi des opportunités pendant des semaines, repris des dossiers après plusieurs interlocuteurs et vu ce qui se passe quand une entreprise grandit plus vite que son organisation. Très souvent, les personnes sont bonnes et les outils sont déjà là. Pourtant un client répond dans une boite mail, un devis vit ailleurs, une relance dépend d’un rappel personnel et une décision importante reste dans la tête de quelqu’un.
            </p>
            <p className="method-copy">
              Au début, on compense avec de l’énergie et de la mémoire. Puis le volume augmente. Les petites pertes de contexte deviennent des devis oubliés, des réponses trop tardives, des tâches répétées et des responsables qui passent leur journée à demander où en sont les choses. C’est exactement là que SESIRA commence.
            </p>
            <p className="method-copy">
              Je n’ai pas voulu créer un logiciel de plus à ouvrir chaque matin. Je veux construire un système qui comprend ce qui est en cours dans l’entreprise, relie les informations utiles, repère ce qui risque d’être oublié et remet la bonne action devant la bonne personne au bon moment. Ensuite seulement, quand le contexte est suffisamment clair, SESIRA peut automatiser une partie du travail. Le but reste le même : moins de choses qui se perdent, moins de décisions prises à l’aveugle et une entreprise plus simple à piloter.
            </p>
            <p className="method-copy">
              <strong>Paul Nkengue</strong><br />
              Fondateur de SESIRA<br />
              <span className="eyebrow">Plus de 450 opportunités conclues en B2B · President’s Club 2025 · Expérience terrain auprès de PME européennes</span>
            </p>
          </div>
        </div>
      </section>

      <footer className="landing-footer"><SesiraLogo /><span>© 2026 SESIRA</span><Link href="/login">Connexion</Link></footer>
    </main>
  );
}
