import type { Metadata } from "next";
import Link from "next/link";

import { SesiraLogo } from "@/components/sesira/logo";

export const metadata: Metadata = {
  title: "SESIRA | Comment fonctionne l'automatisation",
  description: "Ce que SESIRA peut préparer seul, ce que vous validez et ce qui reste toujours entre vos mains.",
};

const LEVELS = [
  ["01", "Observe", "SESIRA regarde ce qui se passe. Il n'envoie rien."],
  ["02", "Prépare", "La relance, le document ou la tâche est prêt. Rien ne part."],
  ["03", "Vous validez", "Votre équipe relit et confirme avant l'action."],
  ["04", "Automatique", "Seulement pour les cas simples que vous avez décidé d'autoriser."],
] as const;

export default function AutomationPage() {
  return (
    <main className="cvc-shell">
      <nav className="cvc-nav" aria-label="Navigation principale">
        <Link href="/" aria-label="SESIRA"><SesiraLogo /></Link>
        <div className="cvc-nav-links">
          <Link href="/">Accueil</Link>
          <Link className="cvc-nav-login" href="/login">Connexion</Link>
          <Link className="button primary small" href="/diagnostic">Calculer</Link>
        </div>
      </nav>

      <section className="cvc-follow-section">
        <div className="cvc-section-title">
          <span>COMMENT ÇA MARCHE</span>
          <h2>Vous choisissez jusqu&apos;où SESIRA peut aller seul.</h2>
        </div>
        <div className="cvc-follow-grid">
          {LEVELS.map(([number, title, text]) => (
            <article key={title}>
              <span>{number}</span>
              <h3>{title}</h3>
              <div><p>{text}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section className="cvc-control-brief">
        <div>
          <span>SESIRA PEUT PRÉPARER</span>
          <h2>Relances, rapports, documents.</h2>
        </div>
        <div>
          <p>Prix, remise, litige, réclamation, engagement important et validation réglementaire restent chez vous.</p>
        </div>
      </section>

      <section className="cvc-start-section">
        <div className="cvc-start-copy">
          <span>VOIR SUR UN CAS RÉEL</span>
          <h2>Apportez un devis. Je vous montre ce que SESIRA ferait.</h2>
        </div>
        <div className="cvc-start-card">
          <p>Démo avec le fondateur.</p>
          <small>Sans engagement.</small>
          <a className="button primary" href="mailto:paul@sesira.fr?subject=Démo%20automatisation%20SESIRA">Voir un cas en démo</a>
        </div>
      </section>

      <footer className="cvc-footer">
        <SesiraLogo />
        <p>Le suivi, c&apos;est SESIRA. Les décisions, c&apos;est vous.</p>
        <div><Link href="/">Accueil</Link><Link href="/login">Connexion</Link></div>
        <span>© 2026 SESIRA</span>
      </footer>
    </main>
  );
}
