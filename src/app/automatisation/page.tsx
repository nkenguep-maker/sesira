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
    <main className="cvc-shell cvc-automation-page">
      <nav className="cvc-nav" aria-label="Navigation principale">
        <Link href="/" aria-label="SESIRA"><SesiraLogo /></Link>
        <div className="cvc-nav-links">
          <Link href="/">Accueil</Link>
          <Link className="cvc-nav-login" href="/login">Connexion</Link>
          <Link className="button primary small" href="/diagnostic">Calculer</Link>
        </div>
      </nav>

      <header className="cvc-automation-hero">
        <span>COMMENT ÇA MARCHE</span>
        <h1>Vous choisissez jusqu'où SESIRA peut aller seul.</h1>
        <p>Une relance peut d'abord être observée, puis préparée, puis validée par votre équipe. L'automatique vient seulement sur les cas que vous avez décidés.</p>
      </header>

      <section className="cvc-automation-levels">
        {LEVELS.map(([number, title, text]) => (
          <article key={title}>
            <span>{number}</span>
            <h2>{title}</h2>
            <p>{text}</p>
          </article>
        ))}
      </section>

      <section className="cvc-automation-split">
        <div>
          <span>SESIRA PEUT PRÉPARER</span>
          <p>Une relance. Un rapport. Un document. Une tâche répétitive.</p>
        </div>
        <div>
          <span>VOUS GARDEZ LA MAIN</span>
          <p>Prix, remise, litige, réclamation, engagement important et validation réglementaire.</p>
        </div>
      </section>

      <section className="cvc-automation-back">
        <Link href="/">← Retour à SESIRA</Link>
        <a className="button primary" href="mailto:paul@sesira.fr?subject=Démo%20automatisation%20SESIRA">Voir un cas en démo</a>
      </section>
    </main>
  );
}
