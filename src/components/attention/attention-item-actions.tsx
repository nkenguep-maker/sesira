"use client";

import { Check, LoaderCircle, X } from "lucide-react";
import { useActionState } from "react";

import {
  type AttentionActionState,
  closeAttentionItemAction,
} from "@/app/app/attention/actions";

const initialState: AttentionActionState = {};

export function AttentionItemActions({ attentionId }: { attentionId: string }) {
  const [state, formAction, pending] = useActionState(closeAttentionItemAction, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="attentionId" value={attentionId} />
      <button
        type="submit"
        name="intent"
        value="RESOLVED"
        disabled={pending}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
        Résoudre
      </button>
      <button
        type="submit"
        name="intent"
        value="DISMISSED"
        disabled={pending}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:text-white disabled:cursor-wait disabled:opacity-60"
      >
        <X className="size-4" />
        Ignorer
      </button>
      <span className="basis-full" aria-live="polite">
        {state.error ? <span role="alert" className="text-sm text-rose-300">{state.error}</span> : null}
        {state.success ? <span role="status" className="text-sm text-emerald-300">{state.success}</span> : null}
      </span>
    </form>
  );
}
