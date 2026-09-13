"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { SesiraLogo } from "@/components/sesira/logo";
import { createClient } from "@/lib/supabase/client";
import {
  loginAction,
  requestPasswordResetAction,
  type AuthActionState,
} from "./actions";

const INITIAL_STATE: AuthActionState = {};

export default function LoginPage() {
  const [recovery, setRecovery] = useState(false);
  const [passkeyPending, setPasskeyPending] = useState(false);
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const [loginState, loginFormAction, loginPending] = useActionState(loginAction, INITIAL_STATE);
  const [recoveryState, recoveryFormAction, recoveryPending] = useActionState(
    requestPasswordResetAction,
    INITIAL_STATE,
  );

  const state = recovery ? recoveryState : loginState;
  const pending = recovery ? recoveryPending : loginPending;

  async function handlePasskeySignIn() {
    setPasskeyError(null);

    if (typeof window === "undefined" || !("PublicKeyCredential" in window)) {
      setPasskeyError("Les clés d’accès ne sont pas prises en charge sur cet appareil ou ce navigateur.");
      return;
    }

    setPasskeyPending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPasskey();

      if (error) {
        setPasskeyError(
          error.code === "passkey_disabled"
            ? "Les clés d’accès ne sont pas encore activées pour SESIRA."
            : "Connexion par clé d’accès impossible. Réessayez ou utilisez votre mot de passe.",
        );
        return;
      }

      window.location.assign("/app");
    } catch {
      setPasskeyError("Connexion par clé d’accès annulée ou indisponible sur cet appareil.");
    } finally {
      setPasskeyPending(false);
    }
  }

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
                  disabled={pending || passkeyPending}
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
                    disabled={pending || passkeyPending}
                  />
                </label>
              )}

              {state.error && <p className="form-error" role="alert">{state.error}</p>}

              <button className="button primary full" type="submit" disabled={pending || passkeyPending}>
                {pending
                  ? "Traitement…"
                  : recovery
                    ? "Envoyer le lien de récupération"
                    : "Se connecter"}
              </button>
            </form>
          )}

          {!recovery && !state.success ? (
            <>
              <div className="auth-divider"><span />OU<span /></div>
              <button
                className="button ghost full"
                type="button"
                onClick={handlePasskeySignIn}
                disabled={pending || passkeyPending}
              >
                {passkeyPending ? "Vérification…" : "Utiliser une clé d’accès / Face ID"}
              </button>
              {passkeyError ? <p className="form-error" role="alert">{passkeyError}</p> : null}
            </>
          ) : null}

          <button
            className="text-button recovery-link"
            type="button"
            onClick={() => {
              setPasskeyError(null);
              setRecovery((value) => !value);
            }}
            disabled={pending || passkeyPending}
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
