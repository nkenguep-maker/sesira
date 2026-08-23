import { ReceiptText } from "lucide-react";
import Link from "next/link";

export default function QuoteNotFound() {
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-8 text-center">
      <ReceiptText className="mx-auto size-8 text-slate-500" />
      <h1 className="mt-5 text-xl font-semibold">Devis introuvable</h1>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Ce devis n’existe pas ou n’est pas disponible dans votre organisation.</p>
      <Link href="/app/quotes" className="mt-6 inline-flex rounded-xl bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white">Voir tous les devis</Link>
    </div>
  );
}
