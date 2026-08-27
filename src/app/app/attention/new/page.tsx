import { ArrowLeft, CircleAlert } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { AttentionForm } from "@/components/attention/attention-form";
import { PageHeader } from "@/components/sesira/page-header";
import { getViewerContext } from "@/lib/auth/viewer";
import { formatQuoteAmount } from "@/lib/quotes/format";
import { createClient } from "@/lib/supabase/server";

type NewAttentionSearchParams = Promise<{ quoteId?: string }>;

export default async function NewAttentionPage({ searchParams }: { searchParams: NewAttentionSearchParams }) {
  const [viewer, params] = await Promise.all([getViewerContext(), searchParams]);
  if (!viewer) return null;
  if (!params.quoteId || !z.uuid().safeParse(params.quoteId).success) notFound();

  const supabase = await createClient();
  const { data: quote, error } = await supabase
    .from("quotes")
    .select("id, title, amount, currency, customers(display_name)")
    .eq("organization_id", viewer.organization.id)
    .eq("id", params.quoteId)
    .maybeSingle();

  if (error) throw new Error("Impossible de préparer cet élément à traiter.");
  if (!quote) notFound();

  return (
    <div className="mx-auto max-w-[704px]">
      <Link href={`/app/quotes/${quote.id}`} className="inline-flex items-center gap-2 text-sm text-[var(--muted)] transition hover:text-[var(--blue)]">
        <ArrowLeft className="size-4" />Retour au devis
      </Link>

      <div className="mt-8">
        <PageHeader
          eyebrow="Décision manuelle"
          title="Ajouter à traiter"
          description="Ajoutez uniquement le contexte nécessaire pour que votre équipe puisse décider."
        />
      </div>

      <section className="mt-8  border border-[var(--border)] bg-[var(--panel)] p-6 md:p-8">
        <div className="mb-8 flex gap-4 border-l-2 border-[var(--blue)] bg-[var(--blue-soft)] p-4">
          <CircleAlert className="mt-0.5 size-5 shrink-0 text-[var(--blue)]" />
          <div>
            <p className="font-medium text-[var(--ink)]">{quote.title}</p>
            <p className="mt-1 text-sm text-[var(--blue)]">{formatQuoteAmount(quote.amount, quote.currency)} · {quote.customers?.display_name ?? "Client"}</p>
            <p className="mt-2 text-xs text-[var(--blue)]">Création manuelle. Aucune automatisation ni communication externe.</p>
          </div>
        </div>
        <AttentionForm quoteId={quote.id} />
      </section>
    </div>
  );
}
