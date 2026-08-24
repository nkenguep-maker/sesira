"use client";

import { LoaderCircle } from "lucide-react";
import { useActionState } from "react";

import {
  type RequestActionState,
  updateRequestStatusAction,
} from "@/app/app/requests/actions";
import { requestStatusLabels } from "@/lib/requests/format";
import type { RequestStatus } from "@/lib/requests/schema";

const initialState: RequestActionState = {};

export function RequestStatusForm({
  requestId,
  options,
}: {
  requestId: string;
  options: readonly RequestStatus[];
}) {
  const [state, formAction, pending] = useActionState(updateRequestStatusAction, initialState);

  if (!options.length) {
    return <p className="text-sm leading-6 text-[var(--muted)]">Cette demande ne nécessite plus de changement.</p>;
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="requestId" value={requestId} />
      <label className="block space-y-2 text-sm">
        <span className="font-medium text-slate-200">Prochaine étape</span>
        <select
          name="status"
          defaultValue=""
          required
          disabled={pending}
          className="sesira-field px-4 py-3 disabled:opacity-60"
        >
          <option value="" disabled>
            Choisir un statut
          </option>
          {options.map((status) => (
            <option key={status} value={status}>
              {requestStatusLabels[status]}
            </option>
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
