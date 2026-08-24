"use client";

import { LoaderCircle } from "lucide-react";
import { useActionState } from "react";

import { type QuoteActionState, updateQuoteStatusAction } from "@/app/app/quotes/actions";
import { quoteStatusLabels } from "@/lib/quotes/format";
import type { QuoteStatus } from "@/lib/quotes/schema";

const initialState: QuoteActionState = {};

export function QuoteStatusForm({
  quoteId,
  options,
}: {
  quoteId: string;
  options: readonly QuoteStatus[];
}) {
  const [state, formAction, pending] = useActionState(updateQuoteStatusAction, initialState);

  if (!options.length) {
    return <p className="text-sm leading-6 text-[var(--muted)]">Ce devis a atteint son statut final.</p>;
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="quoteId" value={quoteId} />
      <label className="block space-y-2 text-sm">
        <span className="font-medium text-slate-200">Nouveau statut</span>
        <select
          name="status"
          defaultValue=""
          required
          disabled={pending}
          className="sesira-field px-4 py-3 disabled:opacity-60"
        >
          <option value="" disabled>Choisir un statut</option>
          {options.map((status) => (
            <option key={status} value={status}>{quoteStatusLabels[status]}</option>
          ))}
        </select>
      </label>
      {state.error ? <p role="alert" className="text-sm text-rose-300">{state.error}</p> : null}
      {state.success ? <p role="status" className="text-sm text-emerald-300">{state.success}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="sesira-primary-action w-full px-4 disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : null}
        {pending ? "Mise à jour…" : "Mettre à jour"}
      </button>
    </form>
  );
}
