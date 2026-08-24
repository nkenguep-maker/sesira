import { ArrowLeft, UserRoundX } from "lucide-react";
import Link from "next/link";

export default function CustomerNotFound() {
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-6 py-14 text-center">
      <UserRoundX className="mx-auto size-9 text-violet-300" aria-hidden="true" />
      <h1 className="mt-5 text-2xl font-semibold">Client introuvable</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
        Ce client n’existe pas ou n’est pas disponible dans votre organisation.
      </p>
      <Link href="/app/customers" className="sesira-secondary-action mt-6">
        <ArrowLeft className="size-4" />
        Retour aux clients
      </Link>
    </div>
  );
}
