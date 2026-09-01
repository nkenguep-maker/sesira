"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { SesiraLogo } from "@/components/sesira/logo";

export default function UpdatePasswordPage() {
  const [readyForCore, setReadyForCore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    if (password !== confirmation) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setReadyForCore(true);
  }

  return (
    <main className="simple-auth-page">
      <div className="simple-auth-top"><SesiraLogo /></div>
      <section className="simple-auth-card">
        <span className="eyebrow">RÉCUPÉRATION DE COMPTE</span>
        <h1>Nouveau mot de passe</h1>
        <p>Choisissez un nouveau mot de passe pour votre espace SESIRA.</p>

        {readyForCore ? (
          <div className="notice-card">
            <strong>Formulaire validé</strong>
            <span>La saisie est valide. Le core doit maintenant appeler la mutation Supabase de la session de récupération avant d’afficher un succès réel.</span>
            <button className="text-button" type="button" onClick={() => setReadyForCore(false)}>Modifier le mot de passe</button>
          </div>
        ) : (
          <form className="auth-form" onSubmit={submit} noValidate>
            <label>
              <span>Nouveau mot de passe</span>
              <input name="password" type="password" minLength={8} autoComplete="new-password" required aria-describedby={error ? "password-error" : undefined} />
            </label>
            <label>
              <span>Confirmer</span>
              <input name="confirmation" type="password" minLength={8} autoComplete="new-password" required aria-describedby={error ? "password-error" : undefined} />
            </label>
            {error && <p id="password-error" className="form-error" role="alert">{error}</p>}
            <button className="button primary full" type="submit">Mettre à jour</button>
          </form>
        )}

        <Link href="/login" className="text-link">Retour à la connexion</Link>
      </section>
    </main>
  );
}
