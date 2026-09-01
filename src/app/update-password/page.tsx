"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { SesiraLogo } from "@/components/sesira/logo";

export default function UpdatePasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setSubmitted(true); }

  return (
    <main className="simple-auth-page">
      <div className="simple-auth-top"><SesiraLogo /></div>
      <section className="simple-auth-card">
        <span className="eyebrow">RÉCUPÉRATION DE COMPTE</span>
        <h1>Nouveau mot de passe</h1>
        <p>Choisissez un nouveau mot de passe pour votre espace SESIRA.</p>
        {submitted ? (
          <div className="notice-card"><strong>Interface prête</strong><span>La mise à jour réelle du mot de passe reste à relier à la session de récupération Supabase du core.</span></div>
        ) : (
          <form className="auth-form" onSubmit={submit}>
            <label><span>Nouveau mot de passe</span><input type="password" minLength={8} autoComplete="new-password" required /></label>
            <label><span>Confirmer</span><input type="password" minLength={8} autoComplete="new-password" required /></label>
            <button className="button primary full" type="submit">Mettre à jour</button>
          </form>
        )}
        <Link href="/login" className="text-link">Retour à la connexion</Link>
      </section>
    </main>
  );
}
