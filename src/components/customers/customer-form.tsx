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
    <form action={formAction} className="max-w-[640px] space-y-7">
      <fieldset>
        <legend className="text-sm text-[0.78125rem] font-semibold text-[var(--ink-mute)]">Type de client</legend>
        <div className="mt-3 grid gap-px border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2">
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

      <div className="grid gap-5">
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
          className=" border border-[var(--danger)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]"
        >
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-3 border-t border-[var(--line)] pt-6 sm:flex-row">
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
      <span className="text-[0.78125rem] font-semibold text-[var(--ink-mute)]">
        {label} {required ? <span className="text-[var(--blue)]">*</span> : null}
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
      className={`sesira-choice flex cursor-pointer gap-3 bg-[var(--surface)] p-4 transition ${
        checked
          ? "outline outline-2 outline-[var(--blue)]"
          : "hover:bg-[#f7f9fa]"
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
      <span className="grid size-9 shrink-0 place-items-center">
        <Icon className={`size-4 ${checked ? "text-[var(--blue)]" : "text-[var(--ink-mute)]"}`} />
      </span>
      <span>
        <span className="block text-sm text-[0.78125rem] font-semibold text-[var(--ink-mute)]">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">{description}</span>
      </span>
    </label>
  );
}
