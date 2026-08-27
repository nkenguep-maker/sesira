import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock3,
  FileText,
  Mail,
  MessageSquareText,
  Phone,
  Plus,
  ReceiptText,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { CustomerTypeBadge } from "@/components/customers/customer-list-screen";
import { BusinessTimeline } from "@/components/sesira/business-timeline";
import { getViewerContext } from "@/lib/auth/viewer";
import { customerInitials, formatCustomerDate } from "@/lib/customers/format";
import { loadBusinessTimeline } from "@/lib/events/load-business-timeline";
import { formatQuoteAmount, quoteStatusLabel } from "@/lib/quotes/format";
import { requestStatusLabel } from "@/lib/requests/format";
import { createClient } from "@/lib/supabase/server";

type CustomerPageProps = {
  params: Promise<{ customerId: string }>;
  searchParams: Promise<{ created?: string }>;
};

export default async function CustomerPage({ params, searchParams }: CustomerPageProps) {
  const [viewer, { customerId }, query] = await Promise.all([getViewerContext(), params, searchParams]);

  if (!viewer) return null;
  if (!z.uuid().safeParse(customerId).success) notFound();

  const supabase = await createClient();
  const organizationId = viewer.organization.id;
  const [customerResult, requestsResult, quotesResult, messagesResult] = await Promise.all([
    supabase
      .from("customers")
      .select("id, type, display_name, company_name, email, phone, created_at")
      .eq("organization_id", organizationId)
      .eq("id", customerId)
      .maybeSingle(),
    supabase
      .from("requests")
      .select("id, title, status, created_at")
      .eq("organization_id", organizationId)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false }),
    supabase
      .from("quotes")
      .select("id, title, reference, amount, currency, status, created_at")
      .eq("organization_id", organizationId)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false }),
    supabase
      .from("messages")
      .select("id, subject, direction, status, created_at")
      .eq("organization_id", organizationId)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  if (customerResult.error || requestsResult.error || quotesResult.error || messagesResult.error) {
    throw new Error("Impossible de charger ce client.");
  }
  if (!customerResult.data) notFound();

  const customer = customerResult.data;
  const requests = requestsResult.data ?? [];
  const quotes = quotesResult.data ?? [];
  const messages = messagesResult.data ?? [];
  const timelineScopes = [
    { entityType: "customer", entityIds: [customer.id] },
    { entityType: "request", entityIds: requests.map((request) => request.id) },
    { entityType: "quote", entityIds: quotes.map((quote) => quote.id) },
  ];
  const timeline = await loadBusinessTimeline(supabase, organizationId, timelineScopes);
  const timelineEntities = [
    { type: "customer", id: customer.id, label: `Client · ${customer.display_name}` },
    ...requests.map((request) => ({
      type: "request",
      id: request.id,
      label: `Demande · ${request.title}`,
      href: `/app/requests/${request.id}`,
    })),
    ...quotes.map((quote) => ({
      type: "quote",
      id: quote.id,
      label: `Devis · ${quote.title}`,
      href: `/app/quotes/${quote.id}`,
    })),
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <Link href="/app/customers" className="inline-flex items-center gap-2 text-sm text-[var(--muted)] transition hover:text-[var(--blue)]">
        <ArrowLeft className="size-4" />
        Tous les clients
      </Link>

      {query.created === "1" ? (
        <div className="mt-6 flex items-center gap-3  border border-[var(--blue)] bg-[var(--blue-soft)] px-4 py-3 text-sm text-[var(--blue)]">
          <CheckCircle2 className="size-4 shrink-0 text-[var(--blue)]" />
          Client créé et événement journalisé.
        </div>
      ) : null}

      <header className="mt-6 flex flex-col gap-5 border border-[var(--line)] bg-[var(--surface)] p-6 md:flex-row md:items-center md:p-7">
        <span className="sesira-avatar grid size-14 shrink-0 place-items-center bg-[var(--blue-soft)] text-lg font-semibold text-[var(--blue)]">
          {customerInitials(customer.display_name)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="[overflow-wrap:anywhere] font-[family-name:var(--font-display)] text-[1.375rem] font-semibold tracking-[-0.02em]">{customer.display_name}</h1>
            <CustomerTypeBadge type={customer.type} />
          </div>
          <p className="mt-2 text-[var(--muted)]">
            {customer.company_name ?? "Client indépendant"} · créé le {formatCustomerDate(customer.created_at)}
          </p>
        </div>
        <Link
          href={`/app/requests/new?customerId=${customer.id}`}
          className="inline-flex shrink-0 items-center justify-center gap-2  bg-[var(--brand)] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
        >
          <Plus className="size-4" />
          Nouvelle demande
        </Link>
      </header>

      <section className="sesira-metric-grid mt-6 sm:grid-cols-3">
        <Metric icon={FileText} label="Demandes" value={requests.length} />
        <Metric icon={ReceiptText} label="Devis" value={quotes.length} />
        <Metric icon={MessageSquareText} label="Messages" value={messages.length} />
      </section>

      <section className="mt-6  border border-[var(--border)] bg-[var(--panel)] px-5 py-4" aria-label="Parcours client">
        <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:gap-2">
          <JourneyStep label="Client" value={customer.display_name} />
          <JourneyArrow />
          <JourneyStep label="Demandes" value={`${requests.length}`} />
          <JourneyArrow />
          <JourneyStep label="Devis" value={`${quotes.length}`} />
          <JourneyArrow />
          <JourneyStep label="Activité" value={`${timeline.events.length}`} />
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] min-[1360px]:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <RelatedPanel
            empty="Aucune demande liée à ce client."
            icon={FileText}
            items={requests.slice(0, 5).map((request) => ({
              id: request.id,
              title: request.title,
              detail: requestStatusLabel(request.status),
              date: request.created_at,
              href: `/app/requests/${request.id}`,
            }))}
            title="Demandes récentes"
          />
          <RelatedPanel
            empty="Aucun devis lié à ce client."
            icon={ReceiptText}
            items={quotes.slice(0, 5).map((quote) => ({
              id: quote.id,
              title: quote.title,
              detail: `${quoteStatusLabel(quote.status)} · ${formatQuoteAmount(quote.amount, quote.currency)}`,
              date: quote.created_at,
              href: `/app/quotes/${quote.id}`,
            }))}
            title="Devis récents"
          />
        </div>

        <aside className="space-y-6">
          <section className=" border border-[var(--border)] bg-[var(--panel)] p-5">
            <h2 className="font-semibold">Coordonnées</h2>
            <div className="mt-5 space-y-4 text-sm">
              <ContactLine icon={Mail} label="Email" value={customer.email} />
              <ContactLine icon={Phone} label="Téléphone" value={customer.phone} />
              <ContactLine icon={Building2} label="Entreprise" value={customer.company_name} />
            </div>
          </section>
        </aside>
      </div>

      <section className="mt-6  border border-[var(--border)] bg-[var(--panel)] p-5 md:p-6">
        <h2 className="font-semibold">Activité</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">Les moments importants de ce client, de ses demandes et de ses devis.</p>
        <BusinessTimeline
          className="mt-6"
          empty="L’activité de ce client apparaîtra ici."
          events={timeline.events}
          organizationId={organizationId}
          scopes={timelineScopes}
          entities={timelineEntities}
          actorNames={timeline.actorNames}
          viewerUserId={viewer.userId}
        />
      </section>
    </div>
  );
}

function JourneyStep({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-1 items-center justify-between gap-3  bg-[var(--background)] px-3 py-2.5 sm:block">
      <span className="text-[var(--muted)]">{label}</span>
      <span className="truncate font-medium text-[var(--ink)] sm:mt-1 sm:block">{value}</span>
    </div>
  );
}

function JourneyArrow() {
  return <span className="hidden text-[var(--ink-mute)] sm:block" aria-hidden="true">→</span>;
}

function Metric({ icon: Icon, label, value }: { icon: typeof FileText; label: string; value: number }) {
  return (
    <article className="bg-[var(--surface)] p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--muted)]">{label}</p>
        <Icon className="size-4 text-[var(--blue)]" />
      </div>
      <p className="mt-3 font-[family-name:var(--font-display)] text-[2rem] font-semibold tracking-[-0.03em]">{value}</p>
    </article>
  );
}

function ContactLine({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string | null }) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-[var(--ink-mute)]" />
      <div className="min-w-0">
        <p className="text-xs text-[var(--muted)]">{label}</p>
        <p className="mt-1 truncate text-[var(--ink)]">{value ?? "À compléter"}</p>
      </div>
    </div>
  );
}

function RelatedPanel({ title, icon: Icon, items, empty }: {
  title: string;
  icon: typeof FileText;
  items: Array<{ id: string; title: string; detail: string; date: string; href?: string }>;
  empty: string;
}) {
  return (
    <section className="overflow-hidden  border border-[var(--border)] bg-[var(--panel)]">
      <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-4">
        <Icon className="size-4 text-[var(--blue)]" />
        <h2 className="font-semibold">{title}</h2>
      </div>
      {items.length ? (
        <div className="divide-y divide-[var(--border)]">
          {items.map((item) => <RelatedPanelItem key={item.id} item={item} />)}
        </div>
      ) : (
        <div className="flex gap-3 px-5 py-8 text-sm text-[var(--muted)]">
          <Clock3 className="size-4 shrink-0" />
          {empty}
        </div>
      )}
    </section>
  );
}

function RelatedPanelItem({ item }: { item: { id: string; title: string; detail: string; date: string; href?: string } }) {
  const content = (
    <>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-[var(--ink)]">{item.title}</p>
        <p className="mt-1 text-xs text-[var(--muted)]">{item.detail}</p>
      </div>
      <span className="shrink-0 text-xs text-[var(--ink-mute)]">{formatCustomerDate(item.date)}</span>
    </>
  );

  return item.href ? (
    <Link href={item.href} className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-[var(--panel-soft)]">
      {content}
    </Link>
  ) : (
    <div className="flex items-center justify-between gap-4 px-5 py-4">{content}</div>
  );
}
