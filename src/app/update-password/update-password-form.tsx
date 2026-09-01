"use client";

import { useActionState } from "react";

import { updatePasswordAction, type UpdatePasswordState } from "./actions";

const initialState: UpdatePasswordState = {};

export function UpdatePasswordForm() {
  const [state, formAction, pending] = useActionState(updatePasswordAction, initialState);

  return (
    <form action={formAction} className="mt-7 space-y-5">
      <PasswordField label="Nouveau mot de passe" name="password" autoComplete="new-password" />
      <PasswordField label="Confirmer le mot de passe" name="confirmation" autoComplete="new-password" />
      {state.error ? <p role="alert" className="border border-[var(--danger)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">{state.error}</p> : null}
      <button type="submit" disabled={pending} className="w-full bg-[var(--brand)] px-4 py-3 font-semibold text-white transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60">
        {pending ? "Mise à jour…" : "Choisir ce mot de passe"}
      </button>
    </form>
  );
}

function PasswordField({ label, name, autoComplete }: { label: string; name: string; autoComplete: string }) {
  return (
    <label className="block space-y-2 text-sm">
      <span className="text-[0.78125rem] font-semibold text-[var(--ink-mute)]">{label}</span>
      <input required minLength={8} name={name} type="password" autoComplete={autoComplete} className="sesira-field px-4 py-3" />
    </label>
  );
}
