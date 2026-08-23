import { ArrowLeft, CircleAlert } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { AttentionForm } from "@/components/attention/attention-form";
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
    <div className="mx-auto max-w-3xl">
      <Link href={`/app/quotes/${quote.id}`} className="inline-flex items-center gap-2 text-sm text-[var(--muted)] transition hover:text-white">
        <ArrowLeft className="size-4" />Retour au devis
      </Link>

      <header className="mt-8">
        <p className="text-sm font-medium text-[var(--accent)]">Décision manuelle</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Ajouter à traiter</h1>
        <p className="mt-3 max-w-2xl text-[var(--muted)]">Ajoutez uniquement le contexte nécessaire pour que votre équipe puisse décider.</p>
      </header>

      <section className="mt-8 rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-6 md:p-8">
        <div className="mb-8 flex gap-4 rounded-2xl border border-violet-400/20 bg-violet-400/10 p-4">
          <CircleAlert className="mt-0.5 size-5 shrink-0 text-violet-200" />
          <div>
            <p className="font-medium text-white">{quote.title}</p>
            <p className="mt-1 text-sm text-violet-100/70">{formatQuoteAmount(quote.amount, quote.currency)} · {quote.customers?.display_name ?? "Client"}</p>
            <p className="mt-2 text-xs text-violet-100/60">Création manuelle. Aucune automatisation ni communication externe.</p>
          </div>
        </div>
        <AttentionForm quoteId={quote.id} />
      </section>
    </div>
  );
}
