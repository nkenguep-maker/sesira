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
        className="inline-flex min-h-11 items-center justify-center gap-2  bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
        Résoudre
      </button>
      <button
        type="submit"
        name="intent"
        value="DISMISSED"
        disabled={pending}
        className="inline-flex min-h-11 items-center justify-center gap-2 border border-[var(--border)] bg-[var(--panel-soft)] px-4 py-2.5 text-sm font-medium text-[var(--ink)] transition hover:border-[var(--ink-mute)] hover:text-[var(--blue)] disabled:cursor-wait disabled:opacity-60"
      >
        <X className="size-4" />
        Ignorer
      </button>
      <span className="basis-full" aria-live="polite">
        {state.error ? <span role="alert" className="text-sm text-[var(--danger)]">{state.error}</span> : null}
        {state.success ? <span role="status" className="text-sm text-[var(--blue)]">{state.success}</span> : null}
      </span>
    </form>
  );
}
