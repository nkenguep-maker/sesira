"use client";

import { Building2, LoaderCircle, UserRound } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import {
  createCustomerAction,
  type CustomerActionState,
} from "@/app/app/customers/actions";

const initialState: CustomerActionState = {};

export function CustomerForm() {
  const [customerType, setCustomerType] = useState<"PERSON" | "COMPANY">("PERSON");
  const [state, formAction, pending] = useActionState(createCustomerAction, initialState);

  return (
    <form action={formAction} className="space-y-8">
      <fieldset>
        <legend className="text-sm font-medium text-slate-200">Type de client</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <TypeOption
            checked={customerType === "PERSON"}
            description="Un particulier ou un contact individuel"
            icon={UserRound}
            label="Particulier"
            onChange={() => setCustomerType("PERSON")}
            value="PERSON"
          />
          <TypeOption
            checked={customerType === "COMPANY"}
            description="Une société ou une organisation"
            icon={Building2}
            label="Entreprise"
            onChange={() => setCustomerType("COMPANY")}
            value="COMPANY"
          />
        </div>
      </fieldset>

      <div className="grid gap-5 md:grid-cols-2">
        <Field
          autoComplete="name"
          label={customerType === "PERSON" ? "Nom complet" : "Contact principal"}
          name="displayName"
          placeholder="Amina Diallo"
          required
        />
        <Field
          autoComplete="organization"
          label="Entreprise"
          name="companyName"
          placeholder="Atelier Horizon"
          required={customerType === "COMPANY"}
        />
        <Field
          autoComplete="email"
          label="Email"
          name="email"
          placeholder="amina@exemple.fr"
          type="email"
        />
        <Field
          autoComplete="tel"
          label="Téléphone"
          name="phone"
          placeholder="+33 6 12 34 56 78"
          type="tel"
        />
      </div>

      {state.error ? (
        <p
          role="alert"
          className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200"
        >
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-3 border-t border-[var(--border)] pt-6 sm:flex-row sm:justify-end">
        <Link
          href="/app/customers"
          className="sesira-secondary-action px-5"
        >
          Annuler
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="sesira-primary-action px-5 disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? <LoaderCircle className="size-4 animate-spin" /> : null}
          {pending ? "Création…" : "Créer le client"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  autoComplete,
  required = false,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder: string;
  autoComplete: string;
  required?: boolean;
}) {
  return (
    <label className="block space-y-2 text-sm">
      <span className="font-medium text-slate-200">
        {label} {required ? <span className="text-violet-300">*</span> : null}
      </span>
      <input
        required={required}
        name={name}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="sesira-field px-4 py-3"
      />
    </label>
  );
}

function TypeOption({
  checked,
  description,
  icon: Icon,
  label,
  onChange,
  value,
}: {
  checked: boolean;
  description: string;
  icon: typeof UserRound;
  label: string;
  onChange: () => void;
  value: "PERSON" | "COMPANY";
}) {
  return (
    <label
      className={`sesira-choice flex cursor-pointer gap-3 rounded-2xl border p-4 transition ${
        checked
          ? "border-violet-400/50 bg-violet-400/10"
          : "border-[var(--border)] bg-[var(--background)] hover:border-slate-500"
      }`}
    >
      <input
        className="sr-only"
        type="radio"
        name="type"
        value={value}
        checked={checked}
        onChange={onChange}
      />
      <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${checked ? "bg-violet-400/20" : "bg-slate-800"}`}>
        <Icon className={`size-4 ${checked ? "text-violet-200" : "text-slate-400"}`} />
      </span>
      <span>
        <span className="block text-sm font-medium text-white">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">{description}</span>
      </span>
    </label>
  );
}
