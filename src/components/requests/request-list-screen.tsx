import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Inbox,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import {
  formatRequestDate,
  requestSourceLabel,
  requestSourceLabels,
  requestStatusLabel,
  requestStatusLabels,
} from "@/lib/requests/format";
import {
  REQUEST_SOURCES,
  REQUEST_STATUSES,
  type RequestSource,
  type RequestStatus,
} from "@/lib/requests/schema";

export type RequestListItem = {
  id: string;
  title: string;
  source: string;
  status: string;
  qualification_score: number | null;
  created_at: string;
  customers: {
    id: string;
    display_name: string;
    company_name: string | null;
  } | null;
  service_catalog_items: {
    id: string;
    name: string;
  } | null;
};

type RequestStats = {
  total: number;
  new: number;
  needsInfo: number;
  ready: number;
};

export function RequestListScreen({
  requests,
  stats,
  query = "",
  status = "ALL",
  source = "ALL",
  nextCursor,
}: {
  requests: RequestListItem[];
  stats: RequestStats;
  query?: string;
  status?: "ALL" | RequestStatus;
  source?: "ALL" | RequestSource;
  nextCursor?: string;
}) {
  const hasFilters = Boolean(query) || status !== "ALL" || source !== "ALL";
  const nextPageUrl = nextCursor
    ? `/app/requests?${new URLSearchParams({
        ...(query ? { q: query } : {}),
        ...(status !== "ALL" ? { status } : {}),
        ...(source !== "ALL" ? { source } : {}),
        cursor: nextCursor,
      }).toString()}`
    : null;

  return (
    <div className="mx-auto max-w-7xl">
      <header className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-[var(--accent)]">Demandes clients</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Nouvelles demandes</h1>
          <p className="mt-3 max-w-2xl text-[var(--muted)]">
            Retrouvez les besoins reçus, les informations à compléter et les demandes prêtes pour votre équipe.
          </p>
        </div>
        <Link
          href="/app/requests/new"
          className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 lg:self-auto"
        >
          <Plus className="size-4" />
          Nouvelle demande
        </Link>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={ClipboardList} label="Demandes" value={stats.total} tone="violet" />
        <StatCard icon={Inbox} label="Nouvelles demandes" value={stats.new} tone="cyan" />
        <StatCard icon={CircleHelp} label="Informations manquantes" value={stats.needsInfo} tone="amber" />
        <StatCard icon={CheckCircle2} label="Prêt pour votre équipe" value={stats.ready} tone="emerald" />
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)]">
        <form
          className="grid gap-3 border-b border-[var(--border)] p-4 md:grid-cols-[minmax(220px,1fr)_190px_190px_auto]"
          action="/app/requests"
        >
          <label className="relative min-w-0">
            <span className="sr-only">Rechercher une demande</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
            <input
              name="q"
              defaultValue={query}
              placeholder="Rechercher par titre…"
              className="w-full rounded-xl border border-[var(--border)] bg-[#0a0e18] py-2.5 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400"
            />
          </label>
          <label>
            <span className="sr-only">Filtrer par statut</span>
            <select
              name="status"
              defaultValue={status}
              className="w-full rounded-xl border border-[var(--border)] bg-[#0a0e18] px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-violet-400"
            >
              <option value="ALL">Tous les statuts</option>
              {REQUEST_STATUSES.map((requestStatus) => (
                <option key={requestStatus} value={requestStatus}>
                  {requestStatusLabels[requestStatus]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Filtrer par source</span>
            <select
              name="source"
              defaultValue={source}
              className="w-full rounded-xl border border-[var(--border)] bg-[#0a0e18] px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-violet-400"
            >
              <option value="ALL">Toutes les sources</option>
              {REQUEST_SOURCES.map((requestSource) => (
                <option key={requestSource} value={requestSource}>
                  {requestSourceLabels[requestSource]}
                </option>
              ))}
            </select>
          </label>
          <button className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-5 py-2.5 text-sm font-medium text-white transition hover:border-slate-500">
            Filtrer
          </button>
        </form>

        {requests.length ? (
          <div>
            <div className="hidden grid-cols-[minmax(260px,1.5fr)_minmax(170px,1fr)_150px_140px_130px_32px] gap-4 border-b border-[var(--border)] px-5 py-3 text-xs font-medium uppercase tracking-[0.12em] text-slate-500 lg:grid">
              <span>Demande</span>
              <span>Client</span>
              <span>Source</span>
              <span>Statut</span>
              <span>Créée le</span>
              <span />
            </div>
            <div className="divide-y divide-[var(--border)]">
              {requests.map((request) => (
                <Link
                  key={request.id}
                  href={`/app/requests/${request.id}`}
                  className="group grid gap-4 px-5 py-5 transition hover:bg-[var(--panel-soft)] lg:grid-cols-[minmax(260px,1.5fr)_minmax(170px,1fr)_150px_140px_130px_32px] lg:items-center"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-white">{request.title}</span>
                    <span className="mt-1 block truncate text-xs text-[var(--muted)]">
                      {request.service_catalog_items?.name ?? "Type à préciser"}
                      {request.qualification_score === null ? "" : ` · ${Math.round(request.qualification_score)} / 100`}
                    </span>
                  </span>
                  <span className="min-w-0">
                    <span className="mb-1 block text-[0.65rem] font-medium uppercase tracking-[0.12em] text-slate-600 lg:hidden">
                      Client
                    </span>
                    <span className="block truncate text-sm text-slate-200">
                      {request.customers?.display_name ?? "Client à retrouver"}
                    </span>
                    {request.customers?.company_name ? (
                      <span className="mt-1 block truncate text-xs text-[var(--muted)]">
                        {request.customers.company_name}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-sm text-[var(--muted)]">
                    <span className="mb-1 block text-[0.65rem] font-medium uppercase tracking-[0.12em] text-slate-600 lg:hidden">
                      Source
                    </span>
                    {requestSourceLabel(request.source)}
                  </span>
                  <span>
                    <span className="mb-1 block text-[0.65rem] font-medium uppercase tracking-[0.12em] text-slate-600 lg:hidden">
                      Statut
                    </span>
                    <RequestStatusBadge status={request.status} />
                  </span>
                  <span className="text-sm text-[var(--muted)]">
                    <span className="mb-1 block text-[0.65rem] font-medium uppercase tracking-[0.12em] text-slate-600 lg:hidden">
                      Créée le
                    </span>
                    {formatRequestDate(request.created_at)}
                  </span>
                  <ChevronRight className="hidden size-4 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-violet-300 lg:block" />
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="px-6 py-16 text-center">
            <Sparkles className="mx-auto size-9 text-violet-300" />
            <p className="mt-5 font-medium">
              {hasFilters ? "Aucune demande ne correspond à ces filtres." : "Aucune demande pour le moment."}
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
              {hasFilters
                ? "Modifiez la recherche ou réinitialisez les filtres."
                : "Créez une première demande pour la relier à un client et suivre son avancement."}
            </p>
            <Link
              href={hasFilters ? "/app/requests" : "/app/requests/new"}
              className="mt-6 inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--panel-soft)]"
            >
              {hasFilters ? "Réinitialiser" : "Créer une demande"}
              <ArrowRight className="size-4" />
            </Link>
          </div>
        )}

        {requests.length ? (
          <footer className="flex items-center justify-between border-t border-[var(--border)] px-5 py-4 text-sm">
            <Link href="/app/requests" className="text-[var(--muted)] transition hover:text-white">
              Retour au début
            </Link>
            {nextPageUrl ? (
              <Link href={nextPageUrl} className="inline-flex items-center gap-2 font-medium text-violet-300 hover:text-violet-200">
                Page suivante <ArrowRight className="size-4" />
              </Link>
            ) : (
              <span className="text-slate-600">Fin de la liste</span>
            )}
          </footer>
        ) : null}
      </section>
    </div>
  );
}

export function RequestStatusBadge({ status }: { status: string }) {
  const tones: Record<string, string> = {
    NEW: "border-cyan-400/20 bg-cyan-400/10 text-cyan-200",
    PROCESSING: "border-violet-400/20 bg-violet-400/10 text-violet-200",
    NEEDS_INFO: "border-amber-400/20 bg-amber-400/10 text-amber-200",
    QUALIFIED: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
    READY: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
    ASSIGNED: "border-blue-400/20 bg-blue-400/10 text-blue-200",
    CLOSED: "border-slate-400/20 bg-slate-400/10 text-slate-300",
    SPAM: "border-rose-400/20 bg-rose-400/10 text-rose-200",
    LOST: "border-rose-400/20 bg-rose-400/10 text-rose-200",
  };

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${tones[status] ?? tones.CLOSED}`}>
      {requestStatusLabel(status)}
    </span>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Inbox;
  label: string;
  value: number;
  tone: "violet" | "cyan" | "amber" | "emerald";
}) {
  const tones = {
    violet: "bg-violet-400/10 text-violet-200",
    cyan: "bg-cyan-400/10 text-cyan-200",
    amber: "bg-amber-400/10 text-amber-200",
    emerald: "bg-emerald-400/10 text-emerald-200",
  };

  return (
    <article className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5">
      <span className={`grid size-11 place-items-center rounded-xl ${tones[tone]}`}>
        <Icon className="size-5" />
      </span>
      <span>
        <span className="block text-2xl font-semibold tracking-tight">{value}</span>
        <span className="mt-0.5 block text-xs text-[var(--muted)]">{label}</span>
      </span>
    </article>
  );
}
