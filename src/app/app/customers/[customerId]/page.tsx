import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock3,
  FileText,
  Mail,
  MessageSquareText,
  Phone,
  ReceiptText,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { CustomerTypeBadge } from "@/components/customers/customer-list-screen";
import { getViewerContext } from "@/lib/auth/viewer";
import { customerInitials, formatCustomerDate, formatCustomerDateTime } from "@/lib/customers/format";
import { createClient } from "@/lib/supabase/server";

type CustomerPageProps = {
  params: Promise<{ customerId: string }>;
  searchParams: Promise<{ created?: string }>;
};

export default async function CustomerPage({ params, searchParams }: CustomerPageProps) {
  const [viewer, { customerId }, query] = await Promise.all([getViewerContext(), params, searchParams]);

  if (!viewer) {
    return null;
  }

  if (!z.uuid().safeParse(customerId).success) {
    notFound();
  }

  const supabase = await createClient();
  const organizationId = viewer.organization.id;
  const [customerResult, requestsResult, quotesResult, messagesResult, eventsResult] = await Promise.all([
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
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("quotes")
      .select("id, title, reference, amount, currency, status, created_at")
      .eq("organization_id", organizationId)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("messages")
      .select("id, subject, direction, status, created_at")
      .eq("organization_id", organizationId)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("events")
      .select("id, type, source, created_at")
      .eq("organization_id", organizationId)
      .eq("entity_type", "customer")
      .eq("entity_id", customerId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  if (
    customerResult.error ||
    requestsResult.error ||
    quotesResult.error ||
    messagesResult.error ||
    eventsResult.error
  ) {
    throw new Error("Impossible de charger ce client.");
  }

  if (!customerResult.data) {
    notFound();
  }

  const customer = customerResult.data;
  const requests = requestsResult.data ?? [];
  const quotes = quotesResult.data ?? [];
  const messages = messagesResult.data ?? [];
  const events = eventsResult.data ?? [];

  return (
    <div className="mx-auto max-w-7xl">
      <Link
        href="/app/customers"
        className="inline-flex items-center gap-2 text-sm text-[var(--muted)] transition hover:text-white"
      >
        <ArrowLeft className="size-4" />
        Tous les clients
      </Link>

      {query.created === "1" ? (
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          <CheckCircle2 className="size-4 shrink-0 text-emerald-300" />
          Client créé et événement journalisé.
        </div>
      ) : null}

      <header className="mt-8 flex flex-col gap-5 rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-6 md:flex-row md:items-center md:p-8">
        <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-violet-400/10 text-xl font-semibold text-violet-200">
          {customerInitials(customer.display_name)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="truncate text-3xl font-semibold tracking-tight">{customer.display_name}</h1>
            <CustomerTypeBadge type={customer.type} />
          </div>
          <p className="mt-2 text-[var(--muted)]">
            {customer.company_name ?? "Client indépendant"} · créé le {formatCustomerDate(customer.created_at)}
          </p>
        </div>
      </header>

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <Metric icon={FileText} label="Demandes" value={requests.length} />
        <Metric icon={ReceiptText} label="Devis" value={quotes.length} />
        <Metric icon={MessageSquareText} label="Messages" value={messages.length} />
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <RelatedPanel
            empty="Aucune demande liée à ce client."
            icon={FileText}
            items={requests.map((request) => ({
              id: request.id,
              title: request.title,
              detail: request.status,
              date: request.created_at,
            }))}
            title="Demandes récentes"
          />
          <RelatedPanel
            empty="Aucun devis lié à ce client."
            icon={ReceiptText}
            items={quotes.map((quote) => ({
              id: quote.id,
              title: quote.title,
              detail: `${quote.status}${quote.amount === null ? "" : ` · ${quote.amount} ${quote.currency}`}`,
              date: quote.created_at,
            }))}
            title="Devis récents"
          />
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5">
            <h2 className="font-semibold">Coordonnées</h2>
            <div className="mt-5 space-y-4 text-sm">
              <ContactLine icon={Mail} label="Email" value={customer.email} />
              <ContactLine icon={Phone} label="Téléphone" value={customer.phone} />
              <ContactLine icon={Building2} label="Entreprise" value={customer.company_name} />
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5">
            <h2 className="font-semibold">Journal d’activité</h2>
            {events.length ? (
              <div className="mt-5 space-y-5">
                {events.map((event) => (
                  <div key={event.id} className="flex gap-3">
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-violet-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-200">{eventLabel(event.type)}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {formatCustomerDateTime(event.created_at)} · {event.source}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm leading-6 text-[var(--muted)]">L’activité métier apparaîtra ici.</p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof FileText; label: string; value: number }) {
  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--muted)]">{label}</p>
        <Icon className="size-4 text-violet-300" />
      </div>
      <p className="mt-5 text-3xl font-semibold">{value}</p>
    </article>
  );
}

function ContactLine({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string | null }) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-slate-500" />
      <div className="min-w-0">
        <p className="text-xs text-[var(--muted)]">{label}</p>
        <p className="mt-1 truncate text-slate-200">{value ?? "À compléter"}</p>
      </div>
    </div>
  );
}

function RelatedPanel({
  title,
  icon: Icon,
  items,
  empty,
}: {
  title: string;
  icon: typeof FileText;
  items: Array<{ id: string; title: string; detail: string; date: string }>;
  empty: string;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)]">
      <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-4">
        <Icon className="size-4 text-violet-300" />
        <h2 className="font-semibold">{title}</h2>
      </div>
      {items.length ? (
        <div className="divide-y divide-[var(--border)]">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-200">{item.title}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">{item.detail}</p>
              </div>
              <span className="shrink-0 text-xs text-slate-500">{formatCustomerDate(item.date)}</span>
            </div>
          ))}
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

function eventLabel(type: string): string {
  if (type === "customer.created") {
    return "Client créé";
  }

  return type.replaceAll(".", " · ");
}
