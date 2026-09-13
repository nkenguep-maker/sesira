"use client";

import Link from "next/link";
import { useActionState } from "react";

import { SesiraLogo } from "@/components/sesira/logo";
import { signupAction, type AuthActionState } from "@/app/login/actions";

const INITIAL_STATE: AuthActionState = {};

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signupAction, INITIAL_STATE);

  return (
    <main className="auth-layout">
      <section className="auth-brand-panel">
        <SesiraLogo />
        <div className="auth-quote">
          <span>NOUVEL ESPACE</span>
          <h1>Créez l’espace de votre entreprise.<br />SESIRA prépare le reste.</h1>
        </div>
        <div className="auth-panel-foot">COMPTE ENTREPRISE · PROPRIÉTAIRE DE L’ESPACE</div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          <div className="mobile-auth-logo"><SesiraLogo /></div>
          <span className="eyebrow">CRÉER UN COMPTE ENTREPRISE</span>
          <h2>Votre espace SESIRA.</h2>
          <p>
            Créez un nouvel espace indépendant pour votre entreprise. Le premier compte devient
            propriétaire de cet espace et pourra ensuite gérer l’organisation.
          </p>

          {state.success ? (
            <>
              <div className="notice-card" role="status">
                <strong>Compte entreprise créé</strong>
                <span>{state.success}</span>
              </div>
              <Link href="/login" className="button primary full">Aller à la connexion</Link>
            </>
          ) : (
            <form className="auth-form" action={formAction}>
              <label>
                <span>Votre nom complet</span>
                <input
                  type="text"
                  name="fullName"
                  autoComplete="name"
                  placeholder="Jean Dupont"
                  minLength={2}
                  maxLength={120}
                  required
                  disabled={pending}
                />
              </label>

              <label>
                <span>Nom de l’entreprise</span>
                <input
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

              <label>
                <span>E-mail professionnel</span>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="vous@entreprise.com"
                  required
                  disabled={pending}
                />
              </label>

              <label>
                <span>Mot de passe</span>
                <input
                  type="password"
                  name="password"
                  autoComplete="new-password"
                  placeholder="8 caractères minimum"
                  minLength={8}
                  required
                  disabled={pending}
                />
              </label>

              {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}

              <button className="button primary full" type="submit" disabled={pending}>
                {pending ? "Création…" : "Créer mon espace entreprise"}
              </button>
            </form>
          )}

          <div className="auth-divider"><span />DÉJÀ UN COMPTE<span /></div>
          <Link href="/login" className="button ghost full">Se connecter</Link>

          <div className="auth-divider"><span />OU<span /></div>
          <Link href="/" className="button ghost full">Retour au site</Link>
        </div>
      </section>
    </main>
  );
}
