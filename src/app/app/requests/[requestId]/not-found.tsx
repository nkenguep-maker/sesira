import { ArrowLeft, FileQuestion } from "lucide-react";
import Link from "next/link";

export default function RequestNotFound() {
  return (
    <div className="mx-auto max-w-xl  border border-[var(--border)] bg-[var(--panel)] px-6 py-14 text-center">
      <FileQuestion className="mx-auto size-9 text-[var(--blue)]" />
      <h1 className="mt-5 text-2xl font-semibold">Demande introuvable</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
        Cette demande n’existe pas ou n’est pas disponible dans votre organisation.
      </p>
      <Link
        href="/app/requests"
        className="mt-6 inline-flex items-center gap-2  border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--ink)] transition hover:bg-[var(--panel-soft)]"
      >
        <ArrowLeft className="size-4" />
        Retour aux demandes
      </Link>
    </div>
  );
}
