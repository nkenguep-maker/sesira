"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { signupAction, type AuthActionState } from "@/app/login/actions";
import { SesiraLogo } from "@/components/sesira/logo";

import styles from "./signup.module.css";

const INITIAL_STATE: AuthActionState = {};

const VALUE_POINTS = [
  "Importez vos clients, équipements et contrats existants.",
  "Reliez planning, terrain, devis, factures et maintenance.",
  "Faites remonter les dossiers qui demandent vraiment une action.",
] as const;

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signupAction, INITIAL_STATE);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className={styles.page}>
      <aside className={styles.valuePanel} aria-label="Ce que votre espace SESIRA vous apporte">
        <div className={styles.logoWrap}>
          <SesiraLogo />
        </div>

        <div className={styles.valueCopy}>
          <span className={styles.eyebrow}>VOTRE ENTREPRISE, SOUS CONTRÔLE</span>
          <h1>Commencez avec vos données. SESIRA fait remonter ce qui compte.</h1>
          <p>
            Un espace de travail unique pour le bureau et le terrain, sans repartir de zéro.
          </p>

          <div className={styles.valueList}>
            {VALUE_POINTS.map((point) => (
              <div key={point}>
                <span aria-hidden="true">✓</span>
                <p>{point}</p>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.previewCard} aria-hidden="true">
          <div className={styles.previewTop}>
            <div>
              <small>À REPRENDRE AUJOURD’HUI</small>
              <strong>3 sujets</strong>
            </div>
            <span>SESIRA</span>
          </div>
          <div className={styles.previewRows}>
            <div><i className={styles.criticalDot} /><span>Facture Garage Montreuil</span><b>+12 j</b></div>
            <div><i className={styles.warningDot} /><span>Contrat maintenance</span><b>28 j</b></div>
            <div><i className={styles.calmDot} /><span>Intervention Clinique des Lilas</span><b>08:30</b></div>
          </div>
        </div>

        <div className={styles.panelFoot}>PLANNING · TERRAIN · DEVIS · FACTURES · MAINTENANCE</div>
      </aside>

      <section className={styles.formPanel}>
        <div className={styles.mobileTop}>
          <SesiraLogo />
          <Link href="/">Retour au site</Link>
        </div>

        <div className={styles.formWrap}>
          <div className={styles.topLine}>
            <span className={styles.eyebrow}>CRÉER VOTRE ESPACE</span>
            <span className={styles.loginPrompt}>Déjà un compte ? <Link href="/login">Se connecter</Link></span>
          </div>

          {state.success ? (
            <div className={styles.successState} role="status" aria-live="polite">
              <div className={styles.successIcon} aria-hidden="true">✓</div>
              <h2>Vérifiez votre boîte e-mail.</h2>
              <p>{state.success}</p>
              <div className={styles.successSteps}>
                <span><b>1</b> Ouvrez l’e-mail SESIRA.</span>
                <span><b>2</b> Confirmez votre adresse.</span>
                <span><b>3</b> Connectez-vous à votre espace.</span>
              </div>
              <Link href="/login" className={styles.primaryButton}>Aller à la connexion</Link>
              <Link href="/" className={styles.textLink}>Retour au site</Link>
            </div>
          ) : (
            <>
              <div className={styles.heading}>
                <h2>Créez votre espace entreprise.</h2>
                <p>
                  Quatre informations suffisent pour démarrer. Vous pourrez ensuite importer vos données et configurer votre équipe.
                </p>
              </div>

              <div className={styles.reassurance} aria-label="Informations sur l’inscription">
                <span>✓ Aucune carte bancaire demandée</span>
                <span>✓ Confirmation par e-mail</span>
              </div>

              <form className={styles.form} action={formAction}>
                <label htmlFor="fullName">
                  <span>Votre nom complet</span>
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
                  <span>Nom de l’entreprise</span>
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
                  <small id="password-help">Au moins 8 caractères.</small>
                </label>

                {state.error ? <p className={styles.error} role="alert">{state.error}</p> : null}

                <button className={styles.primaryButton} type="submit" disabled={pending}>
                  {pending ? "Création de votre espace…" : "Créer mon espace SESIRA"}
                </button>

                <p className={styles.confirmationNote}>
                  Un e-mail de confirmation vous sera envoyé avant votre première connexion.
                </p>
              </form>

              <div className={styles.mobileLogin}>
                Déjà un compte ? <Link href="/login">Se connecter</Link>
              </div>
              <Link href="/" className={styles.backLink}>← Retour au site</Link>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
