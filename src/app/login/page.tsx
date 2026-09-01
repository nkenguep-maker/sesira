"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { SesiraLogo } from "@/components/sesira/logo";

export default function LoginPage() {
  const [recovery, setRecovery] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <main className="auth-layout">
      <section className="auth-brand-panel">
        <SesiraLogo />
        <div className="auth-quote"><span>SESIRA</span><h1>Le travail reste clair,<br />même quand l'entreprise accélère.</h1></div>
        <div className="auth-panel-foot">UN SYSTÈME · UNE VUE · UNE PRIORITÉ</div>
      </section>
      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          <div className="mobile-auth-logo"><SesiraLogo /></div>
          <span className="eyebrow">ACCÈS SÉCURISÉ</span>
          <h2>{recovery ? "Retrouver l'accès" : "Bon retour."}</h2>
          <p>{recovery ? "Saisissez l'adresse e-mail associée à votre espace SESIRA." : "Connectez-vous à votre espace de travail."}</p>

          {submitted ? (
            <div className="notice-card">
              <strong>{recovery ? "Demande prête à être envoyée" : "Interface prête"}</strong>
              <span>Le branchement Supabase doit être assuré par le core SESIRA. Aucun faux succès n'est simulé dans cette version UI.</span>
              <button className="text-button" onClick={() => setSubmitted(false)}>Revenir au formulaire</button>
            </div>
          ) : (
            <form className="auth-form" onSubmit={onSubmit}>
              <label><span>E-mail</span><input type="email" name="email" autoComplete="email" placeholder="vous@entreprise.com" required /></label>
              {!recovery && <label><span>Mot de passe</span><input type="password" name="password" autoComplete="current-password" placeholder="••••••••••" required /></label>}
              <button className="button primary full" type="submit">{recovery ? "Préparer l'e-mail de récupération" : "Se connecter"}</button>
            </form>
          )}

          <button className="text-button recovery-link" onClick={() => { setRecovery(!recovery); setSubmitted(false); }}>
            {recovery ? "Retour à la connexion" : "Mot de passe oublié ?"}
          </button>
          <div className="auth-divider"><span />OU<span /></div>
          <Link href="/" className="button ghost full">Retour au site</Link>
        </div>
      </section>
    </main>
  );
}
