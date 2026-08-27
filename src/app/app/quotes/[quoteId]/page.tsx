import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Clock3,
  FileText,
  Mail,
  MessageSquareText,
  ReceiptText,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { QuoteStatusBadge } from "@/components/quotes/quote-list-screen";
import { QuoteStatusForm } from "@/components/quotes/quote-status-form";
import { BusinessTimeline } from "@/components/sesira/business-timeline";
import { getViewerContext } from "@/lib/auth/viewer";
import { loadBusinessTimeline } from "@/lib/events/load-business-timeline";
import { messageChannelLabel } from "@/lib/messages/format";
import { formatQuoteAmount, formatQuoteDate, formatQuoteDateTime } from "@/lib/quotes/format";
import { getAllowedQuoteStatuses, isQuoteStatus } from "@/lib/quotes/schema";
import { requestStatusLabel } from "@/lib/requests/format";
import { createClient } from "@/lib/supabase/server";

type QuotePageProps = {
  params: Promise<{ quoteId: string }>;
  searchParams: Promise<{ created?: string }>;
};

export default async function QuotePage({ params, searchParams }: QuotePageProps) {
  const [viewer, { quoteId }, query] = await Promise.all([getViewerContext(), params, searchParams]);
  if (!viewer) return null;
  if (!z.uuid().safeParse(quoteId).success) notFound();

  const supabase = await createClient();
  const organizationId = viewer.organization.id;
  const [quoteResult, messagesResult, attentionResult] = await Promise.all([
    supabase
      .from("quotes")
      .select("id, title, reference, amount, currency, status, owner_user_id, sent_at, expires_at, next_action_at, created_at, updated_at, customers(id, display_name, company_name, email, phone), requests(id, title, status)")
      .eq("organization_id", organizationId)
      .eq("id", quoteId)
      .maybeSingle(),
    supabase
      .from("messages")
      .select("id, direction, channel, status, subject, body_text, sent_at, received_at, created_at")
      .eq("organization_id", organizationId)
      .eq("quote_id", quoteId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("attention_items")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("entity_type", "quote")
      .eq("entity_id", quoteId)
      .in("status", ["OPEN", "IN_PROGRESS"])
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  if (quoteResult.error || messagesResult.error || attentionResult.error) throw new Error("Impossible de charger ce devis.");
  if (!quoteResult.data) notFound();

  const quote = quoteResult.data;
  const quoteStatus = quote.status;
  if (!isQuoteStatus(quoteStatus)) notFound();

  const ownerResult = quote.owner_user_id
    ? await supabase.from("profiles").select("full_name").eq("id", quote.owner_user_id).maybeSingle()
    : null;
  if (ownerResult?.error) throw new Error("Impossible de charger le propriétaire du devis.");

  const ownerName = quote.owner_user_id
    ? quote.owner_user_id === viewer.userId
      ? "Vous"
      : ownerResult?.data?.full_name ?? "Membre de votre équipe"
    : "Non attribué";
  const messages = messagesResult.data ?? [];
  const latestInboundMessage = messages.find((message) => message.direction === "INBOUND");
  const timelineScopes = [{ entityType: "quote", entityIds: [quote.id] }];
  const timeline = await loadBusinessTimeline(supabase, organizationId, timelineScopes);
  const timelineEntities = [{ type: "quote", id: quote.id, label: `Devis · ${quote.title}` }];
  const latestActivity = timeline.events.at(0);
  const openAttentionId = attentionResult.data?.[0]?.id;

  return (
    <div className="mx-auto max-w-7xl">
      <Link href="/app/quotes" className="inline-flex items-center gap-2 text-sm text-[var(--muted)] transition hover:text-[var(--blue)]">
        <ArrowLeft className="size-4" />Tous les devis
      </Link>

      {query.created === "1" ? (
        <div className="mt-6 flex items-center gap-3  border border-[var(--blue)] bg-[var(--blue-soft)] px-4 py-3 text-sm text-[var(--blue)]">
          <CheckCircle2 className="size-4 shrink-0 text-[var(--blue)]" />Devis créé et ajouté au journal d’activité.
        </div>
      ) : null}

      <header className="mt-6 overflow-hidden border border-[var(--line)] bg-[var(--surface)]">
        <div className="grid gap-8 p-6 md:p-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="[overflow-wrap:anywhere] font-[family-name:var(--font-display)] text-[1.375rem] font-semibold tracking-[-0.02em]">{quote.title}</h1>
              <QuoteStatusBadge status={quote.status} />
              <span className="text-sm text-[var(--muted)]">{quote.reference ?? "Sans référence"}</span>
            </div>
            <p className="mt-3 text-sm text-[var(--muted)]">Créé le {formatQuoteDate(quote.created_at)} · propriétaire : {ownerName}</p>
          </div>
          <div className="border-l border-[var(--line)] px-6 py-3 lg:min-w-72 lg:text-right">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--blue)]">Montant du devis</p>
            <p className="mt-2 whitespace-nowrap font-[family-name:var(--font-display)] text-[2rem] font-semibold tracking-[-0.03em] tabular-nums text-[var(--ink)]">{formatQuoteAmount(quote.amount, quote.currency)}</p>
          </div>
        </div>
      </header>

      <div className="mt-4 flex flex-wrap justify-end gap-3">
        {quote.customers ? (
          <Link href={`/app/customers/${quote.customers.id}`} className="inline-flex items-center gap-2  border border-[var(--border)] bg-[var(--panel)] px-4 py-2.5 text-sm font-medium text-[var(--ink)] transition hover:border-[var(--blue)]">
            <UserRound className="size-4 text-[var(--blue)]" />Voir le client
          </Link>
        ) : null}
        {quote.requests ? (
          <Link href={`/app/requests/${quote.requests.id}`} className="inline-flex items-center gap-2  border border-[var(--border)] bg-[var(--panel)] px-4 py-2.5 text-sm font-medium text-[var(--ink)] transition hover:border-[var(--blue)]">
            <FileText className="size-4 text-[var(--blue)]" />Voir la demande
          </Link>
        ) : null}
        <Link
          href={openAttentionId ? `/app/attention#attention-${openAttentionId}` : `/app/attention/new?quoteId=${quote.id}`}
          className="inline-flex items-center gap-2  bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          <CircleAlert className="size-4" />
          {openAttentionId ? "Voir à traiter" : "Ajouter à traiter"}
        </Link>
      </div>

      <section className="sesira-metric-grid mt-6 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={CalendarDays} label="Envoyé le" value={formatQuoteDate(quote.sent_at)} />
        <Metric icon={Clock3} label="Expiration" value={formatQuoteDate(quote.expires_at)} />
        <Metric icon={UserRound} label="Propriétaire" value={ownerName} />
        <Metric icon={ReceiptText} label="Dernière activité" value={latestActivity ? formatQuoteDateTime(latestActivity.created_at) : "Aucune activité"} />
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] min-[1360px]:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <section className=" border border-[var(--border)] bg-[var(--panel)] p-6">
            <div className="flex items-center justify-between gap-4">
              <div><p className="text-sm text-[var(--muted)]">Prochaine date utile</p><p className="mt-2 text-xl font-semibold">{formatQuoteDate(quote.next_action_at)}</p></div>
              <CalendarDays className="size-5 text-[var(--blue)]" />
            </div>
            <p className="mt-4 text-sm leading-6 text-[var(--muted)]">Cette date reste informative. Aucun suivi automatique n’est activé.</p>
          </section>

          <section className="overflow-hidden  border border-[var(--border)] bg-[var(--panel)]">
            <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-4"><MessageSquareText className="size-4 text-[var(--blue)]" /><h2 className="font-semibold">Messages liés</h2></div>
            {messages.length ? (
              <div className="divide-y divide-[var(--border)]">
                {messages.map((message) => (
                  <article key={message.id} className="px-5 py-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-[var(--ink)]">{message.subject ?? (message.direction === "INBOUND" ? "Message reçu" : "Message envoyé")}</p>
                      <span className="text-xs text-[var(--muted)]">{formatQuoteDateTime(message.created_at)}</span>
                    </div>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--muted)]">{message.body_text ?? "Contenu non disponible."}</p>
                    <p className="mt-3 text-xs text-[var(--muted)]">{message.direction === "INBOUND" ? "Reçu" : "Envoyé"} · {messageChannelLabel(message.channel)}</p>
                  </article>
                ))}
              </div>
            ) : <p className="px-5 py-8 text-sm leading-6 text-[var(--muted)]">Aucun message n’est encore lié à ce devis.</p>}
          </section>

          <section className=" border border-[var(--border)] bg-[var(--panel)] p-6">
            <h2 className="font-semibold">Historique</h2>
            <BusinessTimeline
              events={timeline.events}
              organizationId={organizationId}
              scopes={timelineScopes}
              entities={timelineEntities}
              actorNames={timeline.actorNames}
              viewerUserId={viewer.userId}
              empty="L’activité de ce devis apparaîtra ici."
              className="mt-6"
            />
          </section>
        </div>

        <aside className="space-y-6">
          <section className="border border-[var(--ink)] bg-[var(--ink)] p-5 text-white">
            <p className="sesira-eyebrow !text-[var(--blue-light)]">POURQUOI VOUS VOYEZ CE DOSSIER</p>
            <blockquote className="mt-4 border-l-2 border-[var(--blue-light)] pl-4 text-sm leading-6 text-white/80">
              {latestInboundMessage?.body_text ?? "Aucun message client n’est encore associé à ce devis."}
            </blockquote>
            <Link href={openAttentionId ? `/app/attention#attention-${openAttentionId}` : `/app/attention/new?quoteId=${quote.id}`} className="mt-5 inline-flex min-h-11 items-center bg-[var(--blue)] px-4 py-2.5 text-sm font-semibold text-white">
              {openAttentionId ? "Voir la décision" : "Ajouter à traiter"}
            </Link>
          </section>
          <section className=" border border-[var(--border)] bg-[var(--panel)] p-5">
            <h2 className="font-semibold">Mettre à jour</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Choisissez uniquement l’état réellement atteint par ce devis.</p>
            <div className="mt-5"><QuoteStatusForm quoteId={quote.id} options={getAllowedQuoteStatuses(quoteStatus)} /></div>
          </section>

          <section className=" border border-[var(--border)] bg-[var(--panel)] p-5">
            <h2 className="font-semibold">Client</h2>
            {quote.customers ? (
              <div className="mt-5 space-y-4 text-sm">
                <ContactLine icon={UserRound} label="Nom" value={quote.customers.display_name} />
                <ContactLine icon={Mail} label="Email" value={quote.customers.email} />
                <Link href={`/app/customers/${quote.customers.id}`} className="inline-flex text-sm font-medium text-[var(--blue)] hover:text-[var(--blue)]">Voir le client</Link>
              </div>
            ) : <p className="mt-4 text-sm text-[var(--muted)]">Client à retrouver.</p>}
          </section>

          <section className=" border border-[var(--border)] bg-[var(--panel)] p-5">
            <h2 className="font-semibold">Demande liée</h2>
            {quote.requests ? (
              <Link href={`/app/requests/${quote.requests.id}`} className="mt-4 flex items-start gap-3  border border-[var(--border)] bg-[var(--background)] p-4 transition hover:border-[var(--blue)]">
                <FileText className="mt-0.5 size-4 shrink-0 text-[var(--blue)]" />
                <span className="min-w-0"><span className="block truncate text-sm font-medium">{quote.requests.title}</span><span className="mt-1 block text-xs text-[var(--muted)]">{requestStatusLabel(quote.requests.status)}</span></span>
              </Link>
            ) : <p className="mt-4 text-sm leading-6 text-[var(--muted)]">Ce devis n’est lié à aucune demande.</p>}
          </section>
        </aside>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string }) {
  return <article className="bg-[var(--surface)] p-5"><div className="flex items-center justify-between gap-3"><p className="text-sm text-[var(--muted)]">{label}</p><Icon className="size-4 shrink-0 text-[var(--blue)]" /></div><p className="mt-3 truncate font-[family-name:var(--font-display)] text-lg font-semibold tracking-[-0.02em]">{value}</p></article>;
}

function ContactLine({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string | null }) {
  return <div className="flex gap-3"><Icon className="mt-0.5 size-4 shrink-0 text-[var(--ink-mute)]" /><div className="min-w-0"><p className="text-xs text-[var(--muted)]">{label}</p><p className="mt-1 truncate text-[var(--ink)]">{value ?? "À compléter"}</p></div></div>;
}
