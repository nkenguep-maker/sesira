import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FilePenLine,
  Plus,
  ReceiptText,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/sesira/empty-state";
import { FilterBar, filterSelectClassName, SearchField } from "@/components/sesira/filter-bar";
import { MetricCard } from "@/components/sesira/metric-card";
import { PageHeader } from "@/components/sesira/page-header";
import { StatusBadge, type StatusTone } from "@/components/sesira/status-badge";
import { formatQuoteAmount, formatQuoteDate, quoteStatusLabel, quoteStatusLabels } from "@/lib/quotes/format";
import { QUOTE_STATUSES, type QuoteDateFilter, type QuoteStatus } from "@/lib/quotes/schema";

export type QuoteListItem = {
  id: string;
  title: string;
  reference: string | null;
  amount: number | null;
  currency: string;
  status: string;
  owner_user_id: string | null;
  owner_name: string | null;
  sent_at: string | null;
  expires_at: string | null;
  next_action_at: string | null;
  created_at: string;
  customers: { id: string; display_name: string; company_name: string | null } | null;
  requests: { id: string; title: string } | null;
};

type QuoteStats = { total: number; drafts: number; following: number; won: number };

const dateFilterLabels: Record<QuoteDateFilter, string> = {
  ALL: "Toutes les dates",
  DUE: "À traiter maintenant",
  NEXT_7_DAYS: "7 prochains jours",
  EXPIRING_30_DAYS: "Expire sous 30 jours",
};

export function QuoteListScreen({
  quotes,
  stats,
  query = "",
  status = "ALL",
  date = "ALL",
  nextCursor,
}: {
  quotes: QuoteListItem[];
  stats: QuoteStats;
  query?: string;
  status?: "ALL" | QuoteStatus;
  date?: QuoteDateFilter;
  nextCursor?: string;
}) {
  const hasFilters = Boolean(query) || status !== "ALL" || date !== "ALL";
  const nextPageUrl = nextCursor
    ? `/app/quotes?${new URLSearchParams({
        ...(query ? { q: query } : {}),
        ...(status !== "ALL" ? { status } : {}),
        ...(date !== "ALL" ? { date } : {}),
        cursor: nextCursor,
      }).toString()}`
    : null;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Suivi commercial"
        title="Devis"
        description="Retrouvez les montants, les réponses reçues et les prochaines dates importantes."
        actions={
          <Link href="/app/quotes/new" className="sesira-primary-action px-5">
            <Plus className="size-4" />
            Nouveau devis
          </Link>
        }
      />

      <section className="sesira-metric-grid mt-6 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={ReceiptText} label="Devis" value={stats.total} tone="violet" />
        <MetricCard icon={FilePenLine} label="Brouillons" value={stats.drafts} tone="cyan" />
        <MetricCard icon={Clock3} label="À suivre" value={stats.following} tone="amber" />
        <MetricCard icon={CheckCircle2} label="Gagnés" value={stats.won} tone="emerald" />
      </section>

      <section className="mt-6 overflow-hidden  border border-[var(--border)] bg-[var(--panel)]">
        <FilterBar action="/app/quotes" layoutClassName="md:grid-cols-[minmax(220px,1fr)_190px_210px_auto]">
          <SearchField label="Rechercher un devis ou un client" defaultValue={query} placeholder="Devis, référence ou client…" />
          <label>
            <span className="sr-only">Filtrer par statut</span>
            <select
              name="status"
              defaultValue={status}
              className={filterSelectClassName}
            >
              <option value="ALL">Tous les statuts</option>
              {QUOTE_STATUSES.map((quoteStatus) => (
                <option key={quoteStatus} value={quoteStatus}>{quoteStatusLabels[quoteStatus]}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Filtrer par date</span>
            <select
              name="date"
              defaultValue={date}
              className={filterSelectClassName}
            >
              {Object.entries(dateFilterLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <button className="sesira-secondary-action bg-[var(--panel-soft)] px-5">Filtrer</button>
        </FilterBar>

        {quotes.length ? (
          <div>
            <div className="hidden grid-cols-[minmax(210px,1.2fr)_130px_minmax(140px,1fr)_minmax(110px,.8fr)_120px_115px_135px_32px] gap-4 border-b border-[var(--line)] px-[1.375rem] py-3 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--ink-mute)] xl:grid">
              <span>Devis</span><span>Montant</span><span>Client</span><span>Demande</span><span>Statut</span><span>Envoyé le</span><span>Prochaine date</span><span />
            </div>
            <div className="divide-y divide-[var(--line-soft)]">
              {quotes.map((quote) => {
                const relevantDate = quote.next_action_at ?? quote.expires_at;
                const relevantLabel = quote.next_action_at ? "Prochaine étape" : quote.expires_at ? "Expiration" : "Date à préciser";

                return (
                  <Link
                    key={quote.id}
                    href={`/app/quotes/${quote.id}`}
                    className="group grid gap-4 px-[1.375rem] py-[0.9375rem] transition hover:bg-[#f7f9fa] xl:grid-cols-[minmax(210px,1.2fr)_130px_minmax(140px,1fr)_minmax(110px,.8fr)_120px_115px_135px_32px] xl:items-center"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-[var(--ink)]">{quote.title}</span>
                      <span className="mt-1 block truncate text-xs text-[var(--muted)]">{quote.reference ?? "Sans référence"} · {quote.owner_name ?? "Non attribué"}</span>
                    </span>
                    <span>
                      <MobileLabel>Montant</MobileLabel>
                      <span className="block whitespace-nowrap font-[family-name:var(--font-display)] text-base font-semibold tracking-[-0.02em] tabular-nums text-[var(--ink)]">{formatQuoteAmount(quote.amount, quote.currency)}</span>
                    </span>
                    <ListValue label="Client" value={quote.customers?.display_name ?? "Client à retrouver"} />
                    <span className="hidden sm:block">
                      <ListValue label="Demande" value={quote.requests?.title ?? "Aucune"} />
                    </span>
                    <span>
                      <MobileLabel>Statut</MobileLabel>
                      <QuoteStatusBadge status={quote.status} />
                    </span>
                    <span className="hidden text-sm text-[var(--ink)] sm:block">
                      <MobileLabel>Envoyé le</MobileLabel>
                      {formatQuoteDate(quote.sent_at)}
                    </span>
                    <span className="text-sm text-[var(--muted)]">
                      <MobileLabel>Prochaine date</MobileLabel>
                      <span className="block text-[var(--ink)]">{formatQuoteDate(relevantDate)}</span>
                      <span className="mt-1 block text-xs">{relevantLabel}</span>
                    </span>
                    <ChevronRight className="hidden size-4 text-[var(--ink-mute)] transition group-hover:translate-x-0.5 group-hover:text-[var(--blue)] xl:block" />
                  </Link>
                );
              })}
            </div>
          </div>
        ) : (
          <EmptyState
            contained={false}
            icon={Sparkles}
            title={hasFilters ? "Aucun devis ne correspond à ces filtres." : "Aucun devis pour le moment."}
            description={
              hasFilters
                ? "Modifiez la recherche ou réinitialisez les filtres."
                : "Créez un premier devis pour suivre son montant et son avancement."
            }
            action={
              <Link href={hasFilters ? "/app/quotes" : "/app/quotes/new"} className="sesira-secondary-action">
                {hasFilters ? "Réinitialiser" : "Créer un devis"}
                <ArrowRight className="size-4" />
              </Link>
            }
          />
        )}

        {quotes.length ? (
          <footer className="flex items-center justify-between border-t border-[var(--line)] px-[1.375rem] py-4 text-[0.8125rem]">
            <span className="text-[var(--ink-mute)]">1 – {quotes.length} sur {stats.total}</span>
            <div className="flex items-center gap-5">
              <Link href="/app/quotes" className="text-[var(--ink-soft)] transition hover:text-[var(--blue)]">Précédent</Link>
              {nextPageUrl ? <Link href={nextPageUrl} className="font-semibold text-[var(--blue)]">Suivant</Link> : <span className="text-[var(--ink-mute)]">Suivant</span>}
            </div>
          </footer>
        ) : null}
      </section>
    </div>
  );
}

export function QuoteStatusBadge({ status }: { status: string }) {
  const tones: Record<string, StatusTone> = {
    DRAFT: "neutral",
    SENT: "cyan",
    FOLLOWING_UP: "amber",
    REPLIED: "blue",
    NEEDS_HUMAN: "violet",
    WON: "emerald",
    LOST: "rose",
    EXPIRED: "neutral",
  };

  return <StatusBadge tone={tones[status] ?? "neutral"}>{quoteStatusLabel(status)}</StatusBadge>;
}

function MobileLabel({ children }: { children: string }) {
  return <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.1em] text-[var(--ink-mute)] xl:hidden">{children}</span>;
}

function ListValue({ label, value }: { label: string; value: string }) {
  return <span className="min-w-0 text-sm text-[var(--ink)]"><MobileLabel>{label}</MobileLabel><span className="block truncate">{value}</span></span>;
}
