import { ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";

import { CustomerForm } from "@/components/customers/customer-form";
import { PageHeader } from "@/components/sesira/page-header";

export default function NewCustomerPage() {
  return (
    <div className="mx-auto max-w-[704px]">
      <Link
        href="/app/customers"
        className="inline-flex items-center gap-2 text-sm text-[var(--muted)] transition hover:text-[var(--blue)]"
      >
        <ArrowLeft className="size-4" />
        Retour aux clients
      </Link>

      <div className="mt-8">
        <PageHeader
          eyebrow="Nouveau dossier"
          title="Créer un client"
          description="Commencez par l’identité et les coordonnées essentielles. Les demandes et devis seront reliés ensuite."
        />
      </div>

      <section className="mt-8  border border-[var(--border)] bg-[var(--panel)] p-6 md:p-8">
        <div className="mb-8 flex gap-3 border-l-2 border-[var(--blue)] bg-[var(--blue-soft)] p-4 text-sm text-[var(--ink-soft)]">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-[var(--blue)]" />
          <p className="leading-6">
            Le client sera créé uniquement dans votre organisation et son événement d’origine sera journalisé automatiquement.
          </p>
        </div>
        <CustomerForm />
      </section>
    </div>
  );
}
