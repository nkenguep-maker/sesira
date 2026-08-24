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
    <form action={formAction} className="space-y-8">
      <div className="grid gap-5 md:grid-cols-2">
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
          <span className="font-medium text-slate-200">
            Source <span className="text-violet-300">*</span>
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
        <span className="font-medium text-slate-200">Description</span>
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
          className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200"
        >
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-3 border-t border-[var(--border)] pt-6 sm:flex-row sm:justify-end">
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
      <span className="font-medium text-slate-200">
        {label} {required ? <span className="text-violet-300">*</span> : null}
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
      <span className="flex items-center gap-2 font-medium text-slate-200">
        <Icon className="size-4 text-slate-500" />
        {label} {required ? <span className="text-violet-300">*</span> : null}
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
