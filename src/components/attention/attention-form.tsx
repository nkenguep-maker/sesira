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
    <form action={formAction} className="space-y-7">
      <input type="hidden" name="quoteId" value={quoteId} />

      <label className="block space-y-2 text-sm">
        <span className="font-medium text-slate-200">Décision à prendre <span className="text-violet-300">*</span></span>
        <input
          name="title"
          required
          maxLength={200}
          defaultValue="Décision à prendre sur ce devis"
          disabled={pending}
          className="w-full rounded-xl border border-[var(--border)] bg-[#0a0e18] px-4 py-3 text-white outline-none transition focus:border-violet-400 disabled:opacity-60"
        />
      </label>

      <label className="block space-y-2 text-sm">
        <span className="font-medium text-slate-200">Pourquoi votre attention est nécessaire</span>
        <textarea
          name="explanation"
          rows={4}
          maxLength={2_000}
          placeholder="Ex. Le client demande un geste sur le prix."
          disabled={pending}
          className="w-full resize-y rounded-xl border border-[var(--border)] bg-[#0a0e18] px-4 py-3 leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400 disabled:opacity-60"
        />
      </label>

      <label className="block space-y-2 text-sm">
        <span className="font-medium text-slate-200">Prochaine action suggérée</span>
        <input
          name="suggestedAction"
          maxLength={500}
          placeholder="Ex. Appeler le client avant vendredi."
          disabled={pending}
          className="w-full rounded-xl border border-[var(--border)] bg-[#0a0e18] px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400 disabled:opacity-60"
        />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block space-y-2 text-sm">
          <span className="font-medium text-slate-200">Priorité</span>
          <select
            name="priority"
            defaultValue="NORMAL"
            disabled={pending}
            className="w-full rounded-xl border border-[var(--border)] bg-[#0a0e18] px-4 py-3 text-white outline-none transition focus:border-violet-400 disabled:opacity-60"
          >
            {ATTENTION_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>{attentionPriorityLabels[priority]}</option>
            ))}
          </select>
        </label>

        <label className="block space-y-2 text-sm">
          <span className="flex items-center gap-2 font-medium text-slate-200"><CalendarDays className="size-4 text-slate-500" />Échéance</span>
          <input
            type="date"
            name="dueOn"
            disabled={pending}
            className="w-full rounded-xl border border-[var(--border)] bg-[#0a0e18] px-4 py-3 text-white outline-none transition focus:border-violet-400 disabled:opacity-60"
          />
        </label>
      </div>

      {state.error ? <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{state.error}</p> : null}

      <div className="flex flex-col-reverse gap-3 border-t border-[var(--border)] pt-6 sm:flex-row sm:justify-end">
        <Link href={`/app/quotes/${quoteId}`} className="rounded-xl border border-[var(--border)] px-5 py-3 text-center text-sm font-medium text-slate-200 transition hover:bg-[var(--panel-soft)]">
          Annuler
        </Link>
        <button type="submit" disabled={pending} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-wait disabled:opacity-60">
          {pending ? <LoaderCircle className="size-4 animate-spin" /> : null}
          {pending ? "Ajout…" : "Ajouter à traiter"}
        </button>
      </div>
    </form>
  );
}
