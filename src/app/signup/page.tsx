"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { signupAction, type AuthActionState } from "@/app/login/actions";
import { SesiraLogo } from "@/components/sesira/logo";

import styles from "./signup.module.css";

const INITIAL_STATE: AuthActionState = {};

const VALUE_POINTS = [
  "Vos dossiers importants remontent au bon moment.",
  "Bureau, terrain, devis et factures restent reliés.",
  "Vous pouvez reprendre vos données existantes par CSV.",
] as const;

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signupAction, INITIAL_STATE);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <SesiraLogo />
        <Link href="/">Retour au site</Link>
      </header>

      <div className={styles.shell}>
        <aside className={styles.valuePanel} aria-label="Pourquoi créer un espace SESIRA">
          <div>
            <span className={styles.eyebrow}>SESIRA</span>
            <h1>Votre entreprise.<br />Les priorités au bon moment.</h1>
            <p>Créez votre espace et testez SESIRA avec vos propres clients, équipements et documents.</p>
          </div>

          <div className={styles.valueList}>
            {VALUE_POINTS.map((point) => (
              <div key={point}>
                <span aria-hidden="true">✓</span>
                <p>{point}</p>
              </div>
            ))}
          </div>

          <div className={styles.panelFoot}>PLANNING · TERRAIN · GESTION · MAINTENANCE</div>
        </aside>

        <section className={styles.formPanel}>
          {state.success ? (
            <div className={styles.successState} role="status" aria-live="polite">
              <div className={styles.successIcon} aria-hidden="true">✓</div>
              <span className={styles.eyebrow}>COMPTE CRÉÉ</span>
              <h2>Confirmez votre e-mail.</h2>
              <p>{state.success}</p>
              <Link href="/login" className={styles.primaryButton}>Aller à la connexion</Link>
            </div>
          ) : (
            <>
              <div className={styles.formHead}>
                <div>
                  <span className={styles.eyebrow}>CRÉER VOTRE ESPACE</span>
                  <h2>Commencez maintenant.</h2>
                  <p>Quatre informations, puis vous entrez dans SESIRA.</p>
                </div>
                <span className={styles.loginPrompt}>Déjà un compte ? <Link href="/login">Se connecter</Link></span>
              </div>

              <form className={styles.form} action={formAction}>
                <div className={styles.twoColumns}>
                  <label htmlFor="fullName">
                    <span>Votre nom</span>
                    <input
                      id="fullName"
                      type="text"
                      name="fullName"
                      autoComplete="name"
                      placeholder="Jean Dupont"
                      minLength={2}
                      maxLength={120}
                      required
                      disabled={pending}
                      autoFocus
                    />
                  </label>

                  <label htmlFor="organizationName">
                    <span>Entreprise</span>
                    <input
                      id="organizationName"
                      type="text"
                      name="organizationName"
                      autoComplete="organization"
                      placeholder="Dupont Climatisation"
                      minLength={2}
                      maxLength={160}
                      required
                      disabled={pending}
                    />
                  </label>
                </div>

                <label htmlFor="email">
                  <span>E-mail professionnel</span>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    inputMode="email"
                    placeholder="vous@entreprise.com"
                    required
                    disabled={pending}
                  />
                </label>

                <label htmlFor="password">
                  <span>Mot de passe</span>
                  <div className={styles.passwordField}>
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      name="password"
                      autoComplete="new-password"
                      placeholder="8 caractères minimum"
                      minLength={8}
                      required
                      disabled={pending}
                      aria-describedby="password-help"
                    />
                    <button
                      type="button"
                      className={styles.passwordToggle}
                      onClick={() => setShowPassword((value) => !value)}
                      disabled={pending}
                      aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    >
                      {showPassword ? "Masquer" : "Afficher"}
                    </button>
                  </div>
                  <small id="password-help">8 caractères minimum</small>
                </label>

                {state.error ? <p className={styles.error} role="alert">{state.error}</p> : null}

                <div className={styles.reassurance} aria-label="Informations sur l’inscription">
                  <span>Sans carte bancaire</span>
                  <i aria-hidden="true" />
                  <span>Confirmation par e-mail</span>
                </div>

                <button className={styles.primaryButton} type="submit" disabled={pending}>
                  {pending ? "Création…" : "Créer mon espace SESIRA"}
                </button>
              </form>

              <div className={styles.mobileLogin}>
                Déjà un compte ? <Link href="/login">Se connecter</Link>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
