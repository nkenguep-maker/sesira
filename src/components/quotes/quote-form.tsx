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
    <form action={formAction} className="space-y-8">
      <div className="grid gap-5 md:grid-cols-2">
        <label className="block space-y-2 text-sm">
          <span className="flex items-center gap-2 font-medium text-slate-200">
            <UserRound className="size-4 text-slate-500" />
            Client <span className="text-violet-300">*</span>
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
            className="w-full rounded-xl border border-[var(--border)] bg-[#0a0e18] px-4 py-3 text-white outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-400/15 disabled:opacity-60"
          >
            <option value="">Choisir un client</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>{customer.label}</option>
            ))}
          </select>
        </label>

        <label className="block space-y-2 text-sm">
          <span className="flex items-center gap-2 font-medium text-slate-200">
            <FileText className="size-4 text-slate-500" />
            Demande liée
          </span>
          <select
            name="requestId"
            value={requestId}
            onChange={(event) => setRequestId(event.target.value)}
            disabled={pending || !customerId}
            className="w-full rounded-xl border border-[var(--border)] bg-[#0a0e18] px-4 py-3 text-white outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-400/15 disabled:opacity-60"
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
          <span className="font-medium text-slate-200">
            Montant <span className="text-violet-300">*</span>
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
              className="w-full rounded-xl border border-[var(--border)] bg-[#0a0e18] px-4 py-3 pr-12 text-lg font-semibold text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/15 disabled:opacity-60"
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-500">€</span>
          </div>
        </label>

        <label className="block space-y-2 text-sm">
          <span className="flex items-center gap-2 font-medium text-slate-200">
            <UserRound className="size-4 text-slate-500" />
            Propriétaire
          </span>
          <select
            name="ownerUserId"
            defaultValue={defaultOwnerId}
            disabled={pending}
            className="w-full rounded-xl border border-[var(--border)] bg-[#0a0e18] px-4 py-3 text-white outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-400/15 disabled:opacity-60"
          >
            <option value="">Non attribué</option>
            {owners.map((owner) => (
              <option key={owner.id} value={owner.id}>{owner.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-5 rounded-2xl border border-[var(--border)] bg-[#0a0e18] p-5 md:grid-cols-2">
        <DateField label="Date d’expiration" name="expiresOn" />
        <DateField label="Prochaine date utile" name="nextActionOn" />
      </div>

      <p className="text-sm leading-6 text-[var(--muted)]">
        Le devis sera créé en brouillon. Vous pourrez le marquer comme envoyé depuis sa fiche.
      </p>

      {state.error ? (
        <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-3 border-t border-[var(--border)] pt-6 sm:flex-row sm:justify-end">
        <Link
          href="/app/quotes"
          className="rounded-xl border border-[var(--border)] px-5 py-3 text-center text-sm font-medium text-slate-200 transition hover:bg-[var(--panel-soft)]"
        >
          Annuler
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-wait disabled:opacity-60"
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
      <span className="font-medium text-slate-200">
        {label} {required ? <span className="text-violet-300">*</span> : null}
      </span>
      <input
        name={name}
        required={required}
        maxLength={maxLength}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-xl border border-[var(--border)] bg-[#0a0e18] px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/15"
      />
    </label>
  );
}

function DateField({ label, name }: { label: string; name: string }) {
  return (
    <label className="block space-y-2 text-sm">
      <span className="flex items-center gap-2 font-medium text-slate-200">
        <CalendarDays className="size-4 text-slate-500" />
        {label}
      </span>
      <input
        type="date"
        name={name}
        className="w-full rounded-xl border border-[var(--border)] bg-[#070a12] px-4 py-3 text-white outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-400/15"
      />
    </label>
  );
}
