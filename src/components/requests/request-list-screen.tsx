import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Inbox,
  Plus,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/sesira/empty-state";
import { FilterBar, filterSelectClassName, SearchField } from "@/components/sesira/filter-bar";
import { MetricCard } from "@/components/sesira/metric-card";
import { PageHeader } from "@/components/sesira/page-header";
import { StatusBadge, type StatusTone } from "@/components/sesira/status-badge";
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
      <PageHeader
        eyebrow="Demandes clients"
        title="Nouvelles demandes"
        description="Retrouvez les besoins reçus, les informations à compléter et les demandes prêtes pour votre équipe."
        actions={
          <Link href="/app/requests/new" className="sesira-primary-action px-5">
            <Plus className="size-4" />
            Nouvelle demande
          </Link>
        }
      />

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={ClipboardList} label="Demandes" value={stats.total} tone="violet" />
        <MetricCard icon={Inbox} label="Nouvelles demandes" value={stats.new} tone="cyan" />
        <MetricCard icon={CircleHelp} label="Informations manquantes" value={stats.needsInfo} tone="amber" />
        <MetricCard icon={CheckCircle2} label="Prêt pour votre équipe" value={stats.ready} tone="emerald" />
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)]">
        <FilterBar action="/app/requests" layoutClassName="md:grid-cols-[minmax(220px,1fr)_190px_190px_auto]">
          <SearchField label="Rechercher une demande" defaultValue={query} placeholder="Rechercher par titre…" />
          <label>
            <span className="sr-only">Filtrer par statut</span>
            <select
              name="status"
              defaultValue={status}
              className={filterSelectClassName}
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
              className={filterSelectClassName}
            >
              <option value="ALL">Toutes les sources</option>
              {REQUEST_SOURCES.map((requestSource) => (
                <option key={requestSource} value={requestSource}>
                  {requestSourceLabels[requestSource]}
                </option>
              ))}
            </select>
          </label>
          <button className="sesira-secondary-action bg-[var(--panel-soft)] px-5">
            Filtrer
          </button>
        </FilterBar>

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
          <EmptyState
            contained={false}
            icon={Sparkles}
            title={hasFilters ? "Aucune demande ne correspond à ces filtres." : "Aucune demande pour le moment."}
            description={
              hasFilters
                ? "Modifiez la recherche ou réinitialisez les filtres."
                : "Créez une première demande pour la relier à un client et suivre son avancement."
            }
            action={
              <Link href={hasFilters ? "/app/requests" : "/app/requests/new"} className="sesira-secondary-action">
                {hasFilters ? "Réinitialiser" : "Créer une demande"}
                <ArrowRight className="size-4" />
              </Link>
            }
          />
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
  const tones: Record<string, StatusTone> = {
    NEW: "cyan",
    PROCESSING: "violet",
    NEEDS_INFO: "amber",
    QUALIFIED: "emerald",
    READY: "emerald",
    ASSIGNED: "blue",
    CLOSED: "neutral",
    SPAM: "rose",
    LOST: "rose",
  };

  return <StatusBadge tone={tones[status] ?? "neutral"}>{requestStatusLabel(status)}</StatusBadge>;
}
