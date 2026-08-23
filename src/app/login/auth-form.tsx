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
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-7 shadow-2xl shadow-black/30 md:p-9">
      <div className="mb-8 grid grid-cols-2 rounded-xl bg-[var(--panel-soft)] p-1 text-sm">
        {(["login", "signup"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setMode(item)}
            className={`rounded-lg px-4 py-2.5 transition ${
              mode === item ? "bg-[var(--brand)] text-white" : "text-[var(--muted)] hover:text-white"
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
          <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
            {state.error}
          </p>
        ) : null}

        {state.success ? (
          <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
            {state.success}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-[var(--brand)] px-4 py-3 font-semibold text-white transition hover:bg-violet-500 disabled:cursor-wait disabled:opacity-60"
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
      <span className="font-medium text-slate-200">{label}</span>
      <input
        required
        name={name}
        type={type}
        autoComplete={autoComplete}
        className="w-full rounded-xl border border-[var(--border)] bg-[#0a0e18] px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/15"
      />
    </label>
  );
}
