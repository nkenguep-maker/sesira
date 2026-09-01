"use client";

import { useActionState, useState } from "react";

import { loginAction, requestPasswordResetAction, signupAction, type AuthActionState } from "./actions";

const initialState: AuthActionState = {};

export function AuthForm() {
  const [mode, setMode] = useState<"login" | "signup" | "recovery">("login");
  const [loginState, loginFormAction, loginPending] = useActionState(loginAction, initialState);
  const [signupState, signupFormAction, signupPending] = useActionState(signupAction, initialState);
  const [recoveryState, recoveryFormAction, recoveryPending] = useActionState(requestPasswordResetAction, initialState);
  const state = mode === "login" ? loginState : mode === "signup" ? signupState : recoveryState;
  const pending = mode === "login" ? loginPending : mode === "signup" ? signupPending : recoveryPending;

  if (mode === "recovery") {
    return (
      <div className="border border-[var(--line)] bg-[var(--surface)] p-7 md:p-9">
        <button type="button" onClick={() => setMode("login")} className="mb-7 text-sm font-semibold text-[var(--blue)] hover:underline">
          ← Retour à la connexion
        </button>
        <h2 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">Mot de passe oublié</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          Indiquez l’adresse de votre compte. Nous vous enverrons un lien pour choisir un nouveau mot de passe.
        </p>
        <form action={recoveryFormAction} className="mt-7 space-y-5">
          <Field label="Email professionnel" name="email" type="email" autoComplete="email" />
          <AuthMessage state={state} />
          <button type="submit" disabled={pending} className="w-full bg-[var(--brand)] px-4 py-3 font-semibold text-white transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60">
            {pending ? "Envoi en cours…" : "Recevoir le lien"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="border border-[var(--line)] bg-[var(--surface)] p-7 md:p-9">
      <div className="mb-8 grid grid-cols-2  bg-[var(--panel-soft)] p-1 text-sm">
        {(["login", "signup"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setMode(item)}
            className={` px-4 py-2.5 transition ${
              mode === item ? "bg-[var(--brand)] text-white" : "text-[var(--muted)] hover:text-[var(--blue)]"
            }`}
          >
            {item === "login" ? "Connexion" : "Créer un compte"}
          </button>
        ))}
      </div>

      <form action={mode === "login" ? loginFormAction : signupFormAction} className="space-y-5">
        {mode === "signup" ? (
          <>
            <Field label="Votre nom" name="fullName" autoComplete="name" />
            <Field label="Entreprise" name="organizationName" autoComplete="organization" />
          </>
        ) : null}

        <Field label="Email professionnel" name="email" type="email" autoComplete="email" />
        <Field
          label="Mot de passe"
          name="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />

        {mode === "login" ? (
          <button type="button" onClick={() => setMode("recovery")} className="text-sm font-semibold text-[var(--blue)] hover:underline">
            Mot de passe oublié ?
          </button>
        ) : null}

        <AuthMessage state={state} />

        <button
          type="submit"
          disabled={pending}
          className="w-full  bg-[var(--brand)] px-4 py-3 font-semibold text-white transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? "Veuillez patienter…" : mode === "login" ? "Se connecter" : "Créer mon espace"}
        </button>
      </form>
    </div>
  );
}

function AuthMessage({ state }: { state: AuthActionState }) {
  if (state.error) {
    return <p role="alert" className="border border-[var(--danger)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">{state.error}</p>;
  }

  if (state.success) {
    return <p role="status" className="border border-[var(--blue)] bg-[var(--blue-soft)] px-4 py-3 text-sm text-[var(--blue)]">{state.success}</p>;
  }

  return null;
}

function Field({
  label,
  name,
  type = "text",
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block space-y-2 text-sm">
      <span className="text-[0.78125rem] font-semibold text-[var(--ink-mute)]">{label}</span>
      <input
        required
        name={name}
        type={type}
        autoComplete={autoComplete}
        className="sesira-field px-4 py-3"
      />
    </label>
  );
}
