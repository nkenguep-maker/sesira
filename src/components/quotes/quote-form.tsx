"use client";

import { CalendarDays, FileText, LoaderCircle, UserRound } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import { createQuoteAction, type QuoteActionState } from "@/app/app/quotes/actions";

type FormOption = {
  id: string;
  label: string;
};

type RequestOption = FormOption & {
  customerId: string | null;
};

const initialState: QuoteActionState = {};

export function QuoteForm({
  customers,
  requests,
  owners,
  defaultCustomerId = "",
  defaultRequestId = "",
  defaultOwnerId = "",
}: {
  customers: FormOption[];
  requests: RequestOption[];
  owners: FormOption[];
  defaultCustomerId?: string;
  defaultRequestId?: string;
  defaultOwnerId?: string;
}) {
  const [state, formAction, pending] = useActionState(createQuoteAction, initialState);
  const [customerId, setCustomerId] = useState(defaultCustomerId);
  const [requestId, setRequestId] = useState(defaultRequestId);
  const availableRequests = requests.filter((request) => request.customerId === customerId);

  return (
    <form action={formAction} className="max-w-[640px] space-y-7">
      <div className="grid gap-5">
        <label className="block space-y-2 text-sm">
          <span className="flex items-center gap-2 text-[0.78125rem] font-semibold text-[var(--ink-mute)]">
            <UserRound className="size-4 text-[var(--ink-mute)]" />
            Client <span className="text-[var(--blue)]">*</span>
          </span>
          <select
            name="customerId"
            required
            value={customerId}
            onChange={(event) => {
              setCustomerId(event.target.value);
              setRequestId("");
            }}
            disabled={pending}
            className="sesira-field px-4 py-3 disabled:opacity-60"
          >
            <option value="">Choisir un client</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>{customer.label}</option>
            ))}
          </select>
        </label>

        <label className="block space-y-2 text-sm">
          <span className="flex items-center gap-2 text-[0.78125rem] font-semibold text-[var(--ink-mute)]">
            <FileText className="size-4 text-[var(--ink-mute)]" />
            Demande liée
          </span>
          <select
            name="requestId"
            value={requestId}
            onChange={(event) => setRequestId(event.target.value)}
            disabled={pending || !customerId}
            className="sesira-field px-4 py-3 disabled:opacity-60"
          >
            <option value="">Aucune demande liée</option>
            {availableRequests.map((request) => (
              <option key={request.id} value={request.id}>{request.label}</option>
            ))}
          </select>
        </label>

        <Field label="Titre du devis" name="title" placeholder="Remplacement du système de chauffage" required />
        <Field label="Référence" name="reference" placeholder="DEV-2026-0042" maxLength={100} />

        <label className="block space-y-2 text-sm">
          <span className="text-[0.78125rem] font-semibold text-[var(--ink-mute)]">
            Montant <span className="text-[var(--blue)]">*</span>
          </span>
          <div className="relative">
            <input
              name="amount"
              required
              inputMode="decimal"
              min="0.01"
              max="999999999999.99"
              step="0.01"
              placeholder="18 450,00"
              disabled={pending}
              className="sesira-field px-4 py-3 pr-12 text-lg font-semibold disabled:opacity-60"
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[var(--ink-mute)]">€</span>
          </div>
        </label>

        <label className="block space-y-2 text-sm">
          <span className="flex items-center gap-2 text-[0.78125rem] font-semibold text-[var(--ink-mute)]">
            <UserRound className="size-4 text-[var(--ink-mute)]" />
            Propriétaire
          </span>
          <select
            name="ownerUserId"
            defaultValue={defaultOwnerId}
            disabled={pending}
            className="sesira-field px-4 py-3 disabled:opacity-60"
          >
            <option value="">Non attribué</option>
            {owners.map((owner) => (
              <option key={owner.id} value={owner.id}>{owner.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-5 border-t border-[var(--line)] pt-6">
        <DateField label="Date d’expiration" name="expiresOn" />
        <DateField label="Prochaine date utile" name="nextActionOn" />
      </div>

      <p className="text-sm leading-6 text-[var(--muted)]">
        Le devis sera créé en brouillon. Vous pourrez le marquer comme envoyé depuis sa fiche.
      </p>

      {state.error ? (
        <p role="alert" className=" border border-[var(--danger)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-3 border-t border-[var(--line)] pt-6 sm:flex-row">
        <Link
          href="/app/quotes"
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
          {pending ? "Création…" : "Créer le devis"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  placeholder,
  required = false,
  maxLength = 200,
}: {
  label: string;
  name: string;
  placeholder: string;
  required?: boolean;
  maxLength?: number;
}) {
  return (
    <label className="block space-y-2 text-sm">
      <span className="text-[0.78125rem] font-semibold text-[var(--ink-mute)]">
        {label} {required ? <span className="text-[var(--blue)]">*</span> : null}
      </span>
      <input
        name={name}
        required={required}
        maxLength={maxLength}
        placeholder={placeholder}
        autoComplete="off"
        className="sesira-field px-4 py-3"
      />
    </label>
  );
}

function DateField({ label, name }: { label: string; name: string }) {
  return (
    <label className="block space-y-2 text-sm">
      <span className="flex items-center gap-2 text-[0.78125rem] font-semibold text-[var(--ink-mute)]">
        <CalendarDays className="size-4 text-[var(--ink-mute)]" />
        {label}
      </span>
      <input
        type="date"
        name={name}
        className="sesira-field px-4 py-3"
      />
    </label>
  );
}
