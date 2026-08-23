import { ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";

import { CustomerForm } from "@/components/customers/customer-form";

export default function NewCustomerPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/app/customers"
        className="inline-flex items-center gap-2 text-sm text-[var(--muted)] transition hover:text-white"
      >
        <ArrowLeft className="size-4" />
        Retour aux clients
      </Link>

      <header className="mt-8">
        <p className="text-sm font-medium text-[var(--accent)]">Nouveau dossier</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Créer un client</h1>
        <p className="mt-3 max-w-2xl text-[var(--muted)]">
          Commencez par l’identité et les coordonnées essentielles. Les demandes et devis seront reliés ensuite.
        </p>
      </header>

      <section className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-6 md:p-8">
        <div className="mb-8 flex gap-3 rounded-2xl border border-cyan-400/15 bg-cyan-400/5 p-4 text-sm text-cyan-100">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-cyan-300" />
          <p className="leading-6">
            Le client sera créé uniquement dans votre organisation et son événement d’origine sera journalisé automatiquement.
          </p>
        </div>
        <CustomerForm />
      </section>
    </div>
  );
}
