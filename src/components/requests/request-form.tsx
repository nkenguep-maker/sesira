"use client";

import { FileText, LoaderCircle, UserRound } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import {
  createRequestAction,
  type RequestActionState,
} from "@/app/app/requests/actions";
import { requestSourceLabels } from "@/lib/requests/format";
import { REQUEST_SOURCES } from "@/lib/requests/schema";

type RequestFormOption = {
  id: string;
  label: string;
};

const initialState: RequestActionState = {};

export function RequestForm({
  customers,
  services,
  defaultCustomerId = "",
  cancelHref = "/app/requests",
}: {
  customers: RequestFormOption[];
  services: RequestFormOption[];
  defaultCustomerId?: string;
  cancelHref?: string;
}) {
  const [state, formAction, pending] = useActionState(createRequestAction, initialState);

  return (
    <form action={formAction} className="max-w-[640px] space-y-7">
      <div className="grid gap-5">
        <SelectField
          icon={UserRound}
          label="Client"
          name="customerId"
          options={customers}
          placeholder="Choisir un client"
          required
          defaultValue={defaultCustomerId}
        />
        <SelectField
          icon={FileText}
          label="Type de demande"
          name="serviceCatalogItemId"
          options={services}
          placeholder="À préciser plus tard"
        />
        <Field
          autoComplete="off"
          label="Titre de la demande"
          name="title"
          placeholder="Remplacement du système de chauffage"
          required
        />
        <label className="block space-y-2 text-sm">
          <span className="text-[0.78125rem] font-semibold text-[var(--ink-mute)]">
            Source <span className="text-[var(--blue)]">*</span>
          </span>
          <select
            name="source"
            defaultValue="MANUAL"
            required
            className="sesira-field px-4 py-3"
          >
            {REQUEST_SOURCES.map((source) => (
              <option key={source} value={source}>
                {requestSourceLabels[source]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block space-y-2 text-sm">
        <span className="text-[0.78125rem] font-semibold text-[var(--ink-mute)]">Description</span>
        <textarea
          name="description"
          rows={6}
          maxLength={5_000}
          placeholder="Décrivez simplement le besoin, les délais ou les informations déjà reçues."
          className="sesira-field resize-y px-4 py-3 leading-6"
        />
        <span className="block text-xs text-[var(--muted)]">Les informations pourront être complétées ensuite.</span>
      </label>

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
          href={cancelHref}
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
          {pending ? "Création…" : "Créer la demande"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  placeholder,
  autoComplete,
  required = false,
}: {
  label: string;
  name: string;
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
        placeholder={placeholder}
        autoComplete={autoComplete}
        maxLength={200}
        className="sesira-field px-4 py-3"
      />
    </label>
  );
}

function SelectField({
  icon: Icon,
  label,
  name,
  options,
  placeholder,
  required = false,
  defaultValue = "",
}: {
  icon: typeof UserRound;
  label: string;
  name: string;
  options: RequestFormOption[];
  placeholder: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <label className="block space-y-2 text-sm">
      <span className="flex items-center gap-2 text-[0.78125rem] font-semibold text-[var(--ink-mute)]">
        <Icon className="size-4 text-[var(--ink-mute)]" />
        {label} {required ? <span className="text-[var(--blue)]">*</span> : null}
      </span>
      <select
        name={name}
        required={required}
        defaultValue={defaultValue}
        className="sesira-field px-4 py-3"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
