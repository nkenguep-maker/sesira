"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";

import { SesiraLogo } from "@/components/sesira/logo";
import { createClient } from "@/lib/supabase/client";
import {
  loginAction,
  requestPasswordResetAction,
  type AuthActionState,
} from "./actions";
import styles from "./login.module.css";

const INITIAL_STATE: AuthActionState = {};

const VALUE_POINTS = [
  "Vos priorités du jour au même endroit.",
  "Bureau et terrain restent reliés.",
  "Devis, factures, contrats et maintenance suivis jusqu’au bout.",
] as const;

export default function LoginPage() {
  const router = useRouter();
  const [recovery, setRecovery] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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

      router.replace("/app");
      router.refresh();
    } catch {
      setPasskeyError("Connexion par clé d’accès annulée ou indisponible sur cet appareil.");
    } finally {
      setPasskeyPending(false);
    }
  }

  function toggleRecovery() {
    setPasskeyError(null);
    setRecovery((value) => !value);
  }

  return (
    <main className={styles.page}>
      <div className={styles.topbar}>
        <SesiraLogo />
        <Link href="/">Retour au site</Link>
      </div>

      <section className={styles.shell}>
        <aside className={styles.valuePanel} aria-label="SESIRA">
          <div>
            <span className={styles.eyebrow}>SESIRA</span>
            <h1>Tout ce qui compte, au bon moment.</h1>
            <p>Retrouvez votre activité, vos équipes et les dossiers à reprendre.</p>
          </div>

          <div className={styles.valueList}>
            {VALUE_POINTS.map((point) => (
              <div key={point}>
                <span aria-hidden="true">✓</span>
                <p>{point}</p>
              </div>
            ))}
          </div>

          <div className={styles.panelFoot}>PLANNING · TERRAIN · FACTURATION · MAINTENANCE</div>
        </aside>

        <section className={styles.formPanel}>
          <div className={styles.formWrap}>
            <div className={styles.formHead}>
              <div>
                <span className={styles.eyebrow}>{recovery ? "RÉCUPÉRATION" : "CONNEXION"}</span>
                <h2>{recovery ? "Retrouvez votre accès." : "Bon retour."}</h2>
                <p>
                  {recovery
                    ? "Saisissez l’e-mail associé à votre espace SESIRA."
                    : "Connectez-vous à votre espace de travail."}
                </p>
              </div>

              {!recovery ? (
                <span className={styles.signupPrompt}>
                  Nouveau ? <Link href="/signup">Créer un compte</Link>
                </span>
              ) : null}
            </div>

            {state.success ? (
              <div className={styles.successState} role="status" aria-live="polite">
                <div className={styles.successIcon} aria-hidden="true">✓</div>
                <h3>E-mail envoyé.</h3>
                <p>{state.success}</p>
                <button className={styles.primaryButton} type="button" onClick={toggleRecovery}>
                  Retour à la connexion
                </button>
              </div>
            ) : (
              <>
                <form className={styles.form} action={recovery ? recoveryFormAction : loginFormAction}>
                  <label htmlFor="email">
                    <span>E-mail</span>
                    <input
                      id="email"
                      type="email"
                      name="email"
                      autoComplete="email"
                      inputMode="email"
                      placeholder="vous@entreprise.com"
                      required
                      disabled={pending || passkeyPending}
                      autoFocus
                    />
                  </label>

                  {!recovery ? (
                    <label htmlFor="password">
                      <div className={styles.labelRow}>
                        <span>Mot de passe</span>
                        <button
                          className={styles.forgotButton}
                          type="button"
                          onClick={toggleRecovery}
                          disabled={pending || passkeyPending}
                        >
                          Mot de passe oublié ?
                        </button>
                      </div>
                      <div className={styles.passwordField}>
                        <input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          name="password"
                          autoComplete="current-password"
                          placeholder="••••••••••"
                          minLength={8}
                          required
                          disabled={pending || passkeyPending}
                        />
                        <button
                          className={styles.passwordToggle}
                          type="button"
                          onClick={() => setShowPassword((value) => !value)}
                          disabled={pending || passkeyPending}
                          aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                        >
                          {showPassword ? "Masquer" : "Afficher"}
                        </button>
                      </div>
                    </label>
                  ) : null}

                  {state.error ? <p className={styles.error} role="alert">{state.error}</p> : null}

                  <button className={styles.primaryButton} type="submit" disabled={pending || passkeyPending}>
                    {pending
                      ? "Traitement…"
                      : recovery
                        ? "Envoyer le lien"
                        : "Se connecter"}
                  </button>
                </form>

                {!recovery ? (
                  <>
                    <div className={styles.divider}><span />ou<span /></div>
                    <button
                      className={styles.secondaryButton}
                      type="button"
                      onClick={handlePasskeySignIn}
                      disabled={pending || passkeyPending}
                    >
                      {passkeyPending ? "Vérification…" : "Clé d’accès / Face ID"}
                    </button>
                    {passkeyError ? <p className={styles.error} role="alert">{passkeyError}</p> : null}
                  </>
                ) : (
                  <button
                    className={styles.textButton}
                    type="button"
                    onClick={toggleRecovery}
                    disabled={pending || passkeyPending}
                  >
                    ← Retour à la connexion
                  </button>
                )}

                {!recovery ? (
                  <div className={styles.mobileSignup}>
                    Nouveau sur SESIRA ? <Link href="/signup">Créer un compte entreprise</Link>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
