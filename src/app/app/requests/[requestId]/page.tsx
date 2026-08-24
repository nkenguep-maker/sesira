import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleHelp,
  ClipboardCheck,
  Mail,
  MessageSquareText,
  Phone,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { RequestStatusBadge } from "@/components/requests/request-list-screen";
import { RequestStatusForm } from "@/components/requests/request-status-form";
import { BusinessTimeline } from "@/components/sesira/business-timeline";
import { getViewerContext } from "@/lib/auth/viewer";
import { loadBusinessTimeline } from "@/lib/events/load-business-timeline";
import { formatRequestDate, formatRequestDateTime, requestSourceLabel } from "@/lib/requests/format";
import { getAllowedRequestStatuses, isRequestStatus, readRequestDescription } from "@/lib/requests/schema";
import { createClient } from "@/lib/supabase/server";

type RequestPageProps = {
  params: Promise<{ requestId: string }>;
  searchParams: Promise<{ created?: string }>;
};

export default async function RequestPage({ params, searchParams }: RequestPageProps) {
  const [viewer, { requestId }, query] = await Promise.all([getViewerContext(), params, searchParams]);
  if (!viewer) return null;
  if (!z.uuid().safeParse(requestId).success) notFound();

  const supabase = await createClient();
  const organizationId = viewer.organization.id;
  const [requestResult, messagesResult, quotesResult] = await Promise.all([
    supabase
      .from("requests")
      .select("id, title, source, status, qualification_score, assigned_user_id, data, created_at, updated_at, customers(id, display_name, company_name, email, phone), service_catalog_items(id, name)")
      .eq("organization_id", organizationId)
      .eq("id", requestId)
      .maybeSingle(),
    supabase
      .from("messages")
      .select("id, direction, channel, status, subject, body_text, intent, confidence, created_at")
      .eq("organization_id", organizationId)
      .eq("request_id", requestId)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("quotes")
      .select("id, title")
      .eq("organization_id", organizationId)
      .eq("request_id", requestId),
  ]);

  if (requestResult.error || messagesResult.error || quotesResult.error) {
    throw new Error("Impossible de charger cette demande.");
  }
  if (!requestResult.data) notFound();

  const request = requestResult.data;
  const requestStatus = request.status;
  if (!isRequestStatus(requestStatus)) notFound();

  const assignedProfileResult = request.assigned_user_id
    ? await supabase.from("profiles").select("full_name").eq("id", request.assigned_user_id).maybeSingle()
    : null;
  if (assignedProfileResult?.error) throw new Error("Impossible de charger le membre assigné.");

  const description = readRequestDescription(request.data);
  const messages = messagesResult.data ?? [];
  const quotes = quotesResult.data ?? [];
  const timelineScopes = [
    { entityType: "request", entityIds: [request.id] },
    { entityType: "quote", entityIds: quotes.map((quote) => quote.id) },
  ];
  const timeline = await loadBusinessTimeline(supabase, organizationId, timelineScopes);
  const timelineEntities = [
    { type: "request", id: request.id, label: `Demande · ${request.title}` },
    ...quotes.map((quote) => ({
      type: "quote",
      id: quote.id,
      label: `Devis · ${quote.title}`,
      href: `/app/quotes/${quote.id}`,
    })),
  ];
  const assignedName = request.assigned_user_id
    ? request.assigned_user_id === viewer.userId
      ? "Vous"
      : assignedProfileResult?.data?.full_name ?? "Membre de votre équipe"
    : "Non attribuée";

  return (
    <div className="mx-auto max-w-7xl">
      <Link href="/app/requests" className="inline-flex items-center gap-2 text-sm text-[var(--muted)] transition hover:text-white">
        <ArrowLeft className="size-4" />
        Toutes les demandes
      </Link>

      {query.created === "1" ? (
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          <CheckCircle2 className="size-4 shrink-0 text-emerald-300" />
          Demande créée et ajoutée au journal d’activité.
        </div>
      ) : null}

      <header className="mt-8 rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-6 md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <RequestStatusBadge status={request.status} />
              <span className="text-sm text-[var(--muted)]">{requestSourceLabel(request.source)}</span>
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">{request.title}</h1>
            <p className="mt-3 text-[var(--muted)]">
              {request.service_catalog_items?.name ?? "Type à préciser"} · créée le {formatRequestDate(request.created_at)}
            </p>
          </div>
          {request.customers ? (
            <Link href={`/app/customers/${request.customers.id}`} className="flex min-w-0 items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 transition hover:border-violet-400/50">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-400/10 text-violet-200">
                <UserRound className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{request.customers.display_name}</span>
                <span className="mt-1 block truncate text-xs text-[var(--muted)]">{request.customers.company_name ?? "Voir le client"}</span>
              </span>
            </Link>
          ) : null}
        </div>
      </header>

      <div className="mt-4 flex justify-end">
        <Link href={`/app/quotes/new?requestId=${request.id}`} className="inline-flex items-center gap-2 rounded-xl border border-violet-400/25 bg-violet-400/10 px-4 py-2.5 text-sm font-medium text-violet-100 transition hover:border-violet-400/50">
          Créer un devis lié
        </Link>
      </div>

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <Metric icon={ClipboardCheck} label="Qualification" value={request.qualification_score === null ? "À qualifier" : `${Math.round(request.qualification_score)} / 100`} />
        <Metric icon={UserRound} label="Attribution" value={assignedName} />
        <Metric icon={CalendarDays} label="Dernière mise à jour" value={formatRequestDate(request.updated_at)} />
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-6">
            <h2 className="text-lg font-semibold">Description</h2>
            {description ? (
              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-300">{description}</p>
            ) : (
              <div className="mt-4 flex gap-3 rounded-xl border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted)]">
                <CircleHelp className="mt-0.5 size-4 shrink-0" />
                Aucune description n’a encore été ajoutée.
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)]">
            <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-4">
              <MessageSquareText className="size-4 text-violet-300" />
              <h2 className="font-semibold">Messages récents</h2>
            </div>
            {messages.length ? (
              <div className="divide-y divide-[var(--border)]">
                {messages.map((message) => (
                  <article key={message.id} className="px-5 py-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-200">{message.subject ?? (message.direction === "INBOUND" ? "Message reçu" : "Message envoyé")}</p>
                      <span className="text-xs text-[var(--muted)]">{formatRequestDateTime(message.created_at)}</span>
                    </div>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--muted)]">{message.body_text ?? "Contenu non disponible."}</p>
                    <p className="mt-3 text-xs text-slate-500">{message.direction === "INBOUND" ? "Reçu" : "Envoyé"} · {message.channel}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="px-5 py-8 text-sm leading-6 text-[var(--muted)]">Aucun message n’est encore lié à cette demande.</p>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5">
            <h2 className="font-semibold">Mettre à jour</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Choisissez uniquement la prochaine étape connue.</p>
            <div className="mt-5"><RequestStatusForm requestId={request.id} options={getAllowedRequestStatuses(requestStatus)} /></div>
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5">
            <h2 className="font-semibold">Client</h2>
            {request.customers ? (
              <div className="mt-5 space-y-4 text-sm">
                <ContactLine icon={UserRound} label="Nom" value={request.customers.display_name} />
                <ContactLine icon={Mail} label="Email" value={request.customers.email} />
                <ContactLine icon={Phone} label="Téléphone" value={request.customers.phone} />
              </div>
            ) : <p className="mt-4 text-sm text-[var(--muted)]">Client à retrouver.</p>}
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5">
            <h2 className="font-semibold">Journal d’activité</h2>
            <BusinessTimeline
              className="mt-5"
              empty="L’activité de cette demande apparaîtra ici."
              events={timeline.events}
              organizationId={organizationId}
              scopes={timelineScopes}
              entities={timelineEntities}
              actorNames={timeline.actorNames}
              viewerUserId={viewer.userId}
            />
          </section>
        </aside>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof ClipboardCheck; label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-[var(--muted)]">{label}</p>
        <Icon className="size-4 shrink-0 text-violet-300" />
      </div>
      <p className="mt-5 truncate text-xl font-semibold">{value}</p>
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
