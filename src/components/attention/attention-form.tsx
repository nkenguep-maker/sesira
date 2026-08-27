"use client";

import { CalendarDays, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import {
  type AttentionActionState,
  createManualQuoteAttentionAction,
} from "@/app/app/attention/actions";
import { attentionPriorityLabels } from "@/lib/attention/format";
import { ATTENTION_PRIORITIES } from "@/lib/attention/schema";

const initialState: AttentionActionState = {};

export function AttentionForm({ quoteId }: { quoteId: string }) {
  const [state, formAction, pending] = useActionState(createManualQuoteAttentionAction, initialState);

  return (
    <form action={formAction} className="max-w-[640px] space-y-7">
      <input type="hidden" name="quoteId" value={quoteId} />

      <label className="block space-y-2 text-sm">
        <span className="text-[0.78125rem] font-semibold text-[var(--ink-mute)]">Décision à prendre <span className="text-[var(--blue)]">*</span></span>
        <input
          name="title"
          required
          maxLength={200}
          defaultValue="Décision à prendre sur ce devis"
          disabled={pending}
          className="sesira-field px-4 py-3 disabled:opacity-60"
        />
      </label>

      <label className="block space-y-2 text-sm">
        <span className="text-[0.78125rem] font-semibold text-[var(--ink-mute)]">Pourquoi votre attention est nécessaire</span>
        <textarea
          name="explanation"
          rows={4}
          maxLength={2_000}
          placeholder="Ex. Le client demande un geste sur le prix."
          disabled={pending}
          className="sesira-field resize-y px-4 py-3 leading-6 disabled:opacity-60"
        />
      </label>

      <label className="block space-y-2 text-sm">
        <span className="text-[0.78125rem] font-semibold text-[var(--ink-mute)]">Prochaine action suggérée</span>
        <input
          name="suggestedAction"
          maxLength={500}
          placeholder="Ex. Appeler le client avant vendredi."
          disabled={pending}
          className="sesira-field px-4 py-3 disabled:opacity-60"
        />
      </label>

      <div className="grid gap-5">
        <label className="block space-y-2 text-sm">
          <span className="text-[0.78125rem] font-semibold text-[var(--ink-mute)]">Priorité</span>
          <select
            name="priority"
            defaultValue="NORMAL"
            disabled={pending}
            className="sesira-field px-4 py-3 disabled:opacity-60"
          >
            {ATTENTION_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>{attentionPriorityLabels[priority]}</option>
            ))}
          </select>
        </label>

        <label className="block space-y-2 text-sm">
          <span className="flex items-center gap-2 text-[0.78125rem] font-semibold text-[var(--ink-mute)]"><CalendarDays className="size-4 text-[var(--ink-mute)]" />Échéance</span>
          <input
            type="date"
            name="dueOn"
            disabled={pending}
            className="sesira-field px-4 py-3 disabled:opacity-60"
          />
        </label>
      </div>

      {state.error ? <p role="alert" className=" border border-[var(--danger)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">{state.error}</p> : null}

      <div className="flex flex-col-reverse gap-3 border-t border-[var(--line)] pt-6 sm:flex-row">
        <Link href={`/app/quotes/${quoteId}`} className="sesira-secondary-action px-5">
          Annuler
        </Link>
        <button type="submit" disabled={pending} className="sesira-primary-action px-5 disabled:cursor-wait disabled:opacity-60">
          {pending ? <LoaderCircle className="size-4 animate-spin" /> : null}
          {pending ? "Ajout…" : "Ajouter à traiter"}
        </button>
      </div>
    </form>
  );
}
