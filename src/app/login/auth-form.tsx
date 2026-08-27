"use client";

import { useActionState, useState } from "react";

import { loginAction, signupAction, type AuthActionState } from "./actions";

const initialState: AuthActionState = {};

export function AuthForm() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loginState, loginFormAction, loginPending] = useActionState(loginAction, initialState);
  const [signupState, signupFormAction, signupPending] = useActionState(signupAction, initialState);
  const state = mode === "login" ? loginState : signupState;
  const pending = mode === "login" ? loginPending : signupPending;

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

        {state.error ? (
          <p role="alert" className=" border border-[var(--danger)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
            {state.error}
          </p>
        ) : null}

        {state.success ? (
          <p className=" border border-[var(--blue)] bg-[var(--blue-soft)] px-4 py-3 text-sm text-[var(--blue)]">
            {state.success}
          </p>
        ) : null}

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
