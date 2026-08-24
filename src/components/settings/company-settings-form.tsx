"use client";

import { CheckCircle2, LoaderCircle, LockKeyhole } from "lucide-react";
import { useActionState, useState } from "react";

import {
  updateOrganizationSettingsAction,
  type OrganizationSettingsActionState,
} from "@/app/app/settings/actions";

const initialState: OrganizationSettingsActionState = { revision: 0 };

export function CompanySettingsForm({
  organization,
  canManage,
}: {
  organization: {
    name: string;
    sectorKey: string;
    status: string;
    timezone: string;
    language: string;
    currency: string;
  };
  canManage: boolean;
}) {
  const [dirtyRevision, setDirtyRevision] = useState<number | null>(null);
  const [state, formAction, pending] = useActionState(
    updateOrganizationSettingsAction,
    initialState,
  );
  const dirty = dirtyRevision !== null && (state.status !== "success" || dirtyRevision >= state.revision);

  return (
    <form action={formAction} className="mt-6">
      <fieldset disabled={!canManage || pending} className="grid gap-5 md:grid-cols-2">
        <Field
          defaultValue={organization.name}
          error={state.fieldErrors?.name}
          label="Nom de l’entreprise"
          name="name"
          onDirty={() => setDirtyRevision(state.revision)}
          required
        />
        <Field
          defaultValue={organization.timezone}
          error={state.fieldErrors?.timezone}
          label="Fuseau horaire"
          name="timezone"
          list="sesira-timezones"
          onDirty={() => setDirtyRevision(state.revision)}
          required
        />
        <datalist id="sesira-timezones">
          <option value="Europe/Paris" />
          <option value="Europe/Brussels" />
          <option value="Europe/Berlin" />
          <option value="Europe/London" />
          <option value="Africa/Douala" />
          <option value="Indian/Mauritius" />
        </datalist>
        <Field
          defaultValue={organization.currency}
          error={state.fieldErrors?.currency}
          label="Devise"
          maxLength={3}
          name="currency"
          onDirty={() => setDirtyRevision(state.revision)}
          required
        />
        <ReadOnlyField label="Langue" value={organization.language.toUpperCase()} />
        <ReadOnlyField label="Secteur" value={formatSector(organization.sectorKey)} />
        <ReadOnlyField label="État du compte" value={formatOrganizationStatus(organization.status)} />
      </fieldset>

      {!canManage ? (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-300/15 bg-amber-300/5 p-4 text-sm">
          <LockKeyhole className="mt-0.5 size-4 shrink-0 text-amber-300" />
          <p className="leading-6 text-[var(--muted)]">
            Vous pouvez consulter ces informations. Seuls le propriétaire et les administrateurs
            peuvent les modifier.
          </p>
        </div>
      ) : null}

      {state.message ? (
        <div
          role={state.status === "error" ? "alert" : "status"}
          className={`mt-5 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
            state.status === "success"
              ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-200"
              : "border-rose-300/20 bg-rose-300/10 text-rose-200"
          }`}
        >
          {state.status === "success" ? <CheckCircle2 className="size-4 shrink-0" /> : null}
          {state.message}
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-3 border-t border-[var(--border)] pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-[var(--muted)]" aria-live="polite">
          {dirty ? "Modifications non enregistrées" : "Toutes les modifications sont enregistrées"}
        </p>
        <button
          type="submit"
          disabled={!canManage || !dirty || pending}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {pending ? <LoaderCircle className="size-4 animate-spin" /> : null}
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}

function Field({
  defaultValue,
  error,
  label,
  name,
  required,
  list,
  maxLength,
  onDirty,
}: {
  defaultValue: string;
  error?: string;
  label: string;
  name: string;
  required?: boolean;
  list?: string;
  maxLength?: number;
  onDirty: () => void;
}) {
  return (
    <label className="block space-y-2 text-sm">
      <span className="font-medium text-slate-200">{label}</span>
      <input
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
        defaultValue={defaultValue}
        id={name}
        list={list}
        maxLength={maxLength}
        name={name}
        onInput={onDirty}
        required={required}
        className="sesira-field px-4 py-3 disabled:cursor-not-allowed disabled:opacity-65 aria-invalid:border-rose-400"
      />
      {error ? <span id={`${name}-error`} className="block text-xs text-rose-300">{error}</span> : null}
    </label>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-2 text-sm">
      <p className="font-medium text-slate-200">{label}</p>
      <p className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-4 py-3 text-slate-400">
        {value}
      </p>
    </div>
  );
}

function formatOrganizationStatus(status: string) {
  return ({ TRIAL: "Essai", ACTIVE: "Actif", SUSPENDED: "Suspendu", ARCHIVED: "Archivé" } as Record<string, string>)[status] ?? "État inconnu";
}

function formatSector(sector: string) {
  return sector === "GENERIC" ? "Général" : sector.replaceAll("_", " ").toLocaleLowerCase("fr-FR");
}
