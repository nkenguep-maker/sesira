"use client";

import Link from "next/link";
import { useActionState } from "react";

import { SesiraLogo } from "@/components/sesira/logo";
import { updatePasswordAction, type UpdatePasswordState } from "./actions";

const INITIAL_STATE: UpdatePasswordState = {};

export default function UpdatePasswordPage() {
  const [state, formAction, pending] = useActionState(updatePasswordAction, INITIAL_STATE);

  return (
    <main className="simple-auth-page">
      <div className="simple-auth-top"><SesiraLogo /></div>
      <section className="simple-auth-card">
        <span className="eyebrow">RÉCUPÉRATION DE COMPTE</span>
        <h1>Nouveau mot de passe</h1>
        <p>Choisissez un nouveau mot de passe pour votre espace SESIRA.</p>

        <form className="auth-form" action={formAction}>
          <label>
            <span>Nouveau mot de passe</span>
            <input
              name="password"
              type="password"
              minLength={8}
              autoComplete="new-password"
              required
              disabled={pending}
              aria-describedby={state.error ? "password-error" : undefined}
            />
          </label>
          <label>
            <span>Confirmer</span>
            <input
              name="confirmation"
              type="password"
              minLength={8}
              autoComplete="new-password"
              required
              disabled={pending}
              aria-describedby={state.error ? "password-error" : undefined}
            />
          </label>

          {state.error && (
            <p id="password-error" className="form-error" role="alert">{state.error}</p>
          )}

          <button className="button primary full" type="submit" disabled={pending}>
            {pending ? "Mise à jour…" : "Mettre à jour"}
          </button>
        </form>

        <Link href="/login" className="text-link">Retour à la connexion</Link>
      </section>
    </main>
  );
}
