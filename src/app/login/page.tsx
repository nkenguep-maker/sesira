"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { SesiraLogo } from "@/components/sesira/logo";
import {
  loginAction,
  requestPasswordResetAction,
  type AuthActionState,
} from "./actions";

const INITIAL_STATE: AuthActionState = {};

export default function LoginPage() {
  const [recovery, setRecovery] = useState(false);
  const [loginState, loginFormAction, loginPending] = useActionState(loginAction, INITIAL_STATE);
  const [recoveryState, recoveryFormAction, recoveryPending] = useActionState(
    requestPasswordResetAction,
    INITIAL_STATE,
  );

  const state = recovery ? recoveryState : loginState;
  const pending = recovery ? recoveryPending : loginPending;

  return (
    <main className="auth-layout">
      <section className="auth-brand-panel">
        <SesiraLogo />
        <div className="auth-quote">
          <span>SESIRA</span>
          <h1>Le travail reste clair,<br />même quand l’entreprise accélère.</h1>
        </div>
        <div className="auth-panel-foot">UN SYSTÈME · UNE VUE · UNE PRIORITÉ</div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          <div className="mobile-auth-logo"><SesiraLogo /></div>
          <span className="eyebrow">ACCÈS SÉCURISÉ</span>
          <h2>{recovery ? "Retrouver l’accès" : "Bon retour."}</h2>
          <p>
            {recovery
              ? "Saisissez l’adresse e-mail associée à votre espace SESIRA."
              : "Connectez-vous à votre espace de travail."}
          </p>

          {state.success && (
            <div className="notice-card" role="status">
              <strong>E-mail envoyé</strong>
              <span>{state.success}</span>
            </div>
          )}

          {!state.success && (
            <form className="auth-form" action={recovery ? recoveryFormAction : loginFormAction}>
              <label>
                <span>E-mail</span>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="vous@entreprise.com"
                  required
                  disabled={pending}
                />
              </label>

              {!recovery && (
                <label>
                  <span>Mot de passe</span>
                  <input
                    type="password"
                    name="password"
                    autoComplete="current-password"
                    placeholder="••••••••••"
                    minLength={8}
                    required
                    disabled={pending}
                  />
                </label>
              )}

              {state.error && <p className="form-error" role="alert">{state.error}</p>}

              <button className="button primary full" type="submit" disabled={pending}>
                {pending
                  ? "Traitement…"
                  : recovery
                    ? "Envoyer le lien de récupération"
                    : "Se connecter"}
              </button>
            </form>
          )}

          <button
            className="text-button recovery-link"
            type="button"
            onClick={() => setRecovery((value) => !value)}
            disabled={pending}
          >
            {recovery ? "Retour à la connexion" : "Mot de passe oublié ?"}
          </button>

          <div className="auth-divider"><span />OU<span /></div>
          <Link href="/" className="button ghost full">Retour au site</Link>
        </div>
      </section>
    </main>
  );
}
