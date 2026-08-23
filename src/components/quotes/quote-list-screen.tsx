import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FilePenLine,
  Plus,
  ReceiptText,
  Search,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

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
      <header className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-[var(--accent)]">Suivi commercial</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Devis</h1>
          <p className="mt-3 max-w-2xl text-[var(--muted)]">
            Retrouvez les montants, les réponses reçues et les prochaines dates importantes.
          </p>
        </div>
        <Link
          href="/app/quotes/new"
          className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 lg:self-auto"
        >
          <Plus className="size-4" />
          Nouveau devis
        </Link>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={ReceiptText} label="Devis" value={stats.total} tone="violet" />
        <StatCard icon={FilePenLine} label="Brouillons" value={stats.drafts} tone="cyan" />
        <StatCard icon={Clock3} label="À suivre" value={stats.following} tone="amber" />
        <StatCard icon={CheckCircle2} label="Gagnés" value={stats.won} tone="emerald" />
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)]">
        <form
          className="grid gap-3 border-b border-[var(--border)] p-4 md:grid-cols-[minmax(220px,1fr)_190px_210px_auto]"
          action="/app/quotes"
        >
          <label className="relative min-w-0">
            <span className="sr-only">Rechercher un devis ou un client</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
            <input
              name="q"
              defaultValue={query}
              placeholder="Devis, référence ou client…"
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
              className="w-full rounded-xl border border-[var(--border)] bg-[#0a0e18] px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-violet-400"
            >
              {Object.entries(dateFilterLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <button className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-5 py-2.5 text-sm font-medium text-white transition hover:border-slate-500">Filtrer</button>
        </form>

        {quotes.length ? (
          <div>
            <div className="hidden grid-cols-[minmax(210px,1.2fr)_minmax(140px,1fr)_minmax(110px,.8fr)_130px_120px_115px_135px_32px] gap-4 border-b border-[var(--border)] px-5 py-3 text-xs font-medium uppercase tracking-[0.12em] text-slate-500 xl:grid">
              <span>Devis</span><span>Client</span><span>Demande</span><span>Montant</span><span>Statut</span><span>Envoyé le</span><span>Prochaine date</span><span />
            </div>
            <div className="divide-y divide-[var(--border)]">
              {quotes.map((quote) => {
                const relevantDate = quote.next_action_at ?? quote.expires_at;
                const relevantLabel = quote.next_action_at ? "Prochaine étape" : quote.expires_at ? "Expiration" : "Date à préciser";

                return (
                  <Link
                    key={quote.id}
                    href={`/app/quotes/${quote.id}`}
                    className="group grid gap-4 px-5 py-5 transition hover:bg-[var(--panel-soft)] xl:grid-cols-[minmax(210px,1.2fr)_minmax(140px,1fr)_minmax(110px,.8fr)_130px_120px_115px_135px_32px] xl:items-center"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-white">{quote.title}</span>
                      <span className="mt-1 block truncate text-xs text-[var(--muted)]">{quote.reference ?? "Sans référence"} · {quote.owner_name ?? "Non attribué"}</span>
                    </span>
                    <ListValue label="Client" value={quote.customers?.display_name ?? "Client à retrouver"} />
                    <ListValue label="Demande" value={quote.requests?.title ?? "Aucune"} />
                    <span>
                      <MobileLabel>Montant</MobileLabel>
                      <span className="text-base font-semibold text-white">{formatQuoteAmount(quote.amount, quote.currency)}</span>
                    </span>
                    <span>
                      <MobileLabel>Statut</MobileLabel>
                      <QuoteStatusBadge status={quote.status} />
                    </span>
                    <span className="text-sm text-slate-300">
                      <MobileLabel>Envoyé le</MobileLabel>
                      {formatQuoteDate(quote.sent_at)}
                    </span>
                    <span className="text-sm text-[var(--muted)]">
                      <MobileLabel>Prochaine date</MobileLabel>
                      <span className="block text-slate-300">{formatQuoteDate(relevantDate)}</span>
                      <span className="mt-1 block text-xs">{relevantLabel}</span>
                    </span>
                    <ChevronRight className="hidden size-4 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-violet-300 xl:block" />
                  </Link>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="px-6 py-16 text-center">
            <Sparkles className="mx-auto size-9 text-violet-300" />
            <p className="mt-5 font-medium">{hasFilters ? "Aucun devis ne correspond à ces filtres." : "Aucun devis pour le moment."}</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
              {hasFilters ? "Modifiez la recherche ou réinitialisez les filtres." : "Créez un premier devis pour suivre son montant et son avancement."}
            </p>
            <Link
              href={hasFilters ? "/app/quotes" : "/app/quotes/new"}
              className="mt-6 inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--panel-soft)]"
            >
              {hasFilters ? "Réinitialiser" : "Créer un devis"}<ArrowRight className="size-4" />
            </Link>
          </div>
        )}

        {quotes.length ? (
          <footer className="flex items-center justify-between border-t border-[var(--border)] px-5 py-4 text-sm">
            <Link href="/app/quotes" className="text-[var(--muted)] transition hover:text-white">Retour au début</Link>
            {nextPageUrl ? (
              <Link href={nextPageUrl} className="inline-flex items-center gap-2 font-medium text-violet-300 hover:text-violet-200">Page suivante <ArrowRight className="size-4" /></Link>
            ) : <span className="text-slate-600">Fin de la liste</span>}
          </footer>
        ) : null}
      </section>
    </div>
  );
}

export function QuoteStatusBadge({ status }: { status: string }) {
  const tones: Record<string, string> = {
    DRAFT: "border-slate-400/20 bg-slate-400/10 text-slate-300",
    SENT: "border-cyan-400/20 bg-cyan-400/10 text-cyan-200",
    FOLLOWING_UP: "border-amber-400/20 bg-amber-400/10 text-amber-200",
    REPLIED: "border-blue-400/20 bg-blue-400/10 text-blue-200",
    NEEDS_HUMAN: "border-violet-400/20 bg-violet-400/10 text-violet-200",
    WON: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
    LOST: "border-rose-400/20 bg-rose-400/10 text-rose-200",
    EXPIRED: "border-slate-400/20 bg-slate-400/10 text-slate-400",
  };

  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${tones[status] ?? tones.EXPIRED}`}>{quoteStatusLabel(status)}</span>;
}

function MobileLabel({ children }: { children: string }) {
  return <span className="mb-1 block text-[0.65rem] font-medium uppercase tracking-[0.12em] text-slate-600 xl:hidden">{children}</span>;
}

function ListValue({ label, value }: { label: string; value: string }) {
  return <span className="min-w-0 text-sm text-slate-200"><MobileLabel>{label}</MobileLabel><span className="block truncate">{value}</span></span>;
}

function StatCard({ icon: Icon, label, value, tone }: { icon: typeof ReceiptText; label: string; value: number; tone: "violet" | "cyan" | "amber" | "emerald" }) {
  const tones = { violet: "bg-violet-400/10 text-violet-200", cyan: "bg-cyan-400/10 text-cyan-200", amber: "bg-amber-400/10 text-amber-200", emerald: "bg-emerald-400/10 text-emerald-200" };
  return (
    <article className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5">
      <span className={`grid size-11 place-items-center rounded-xl ${tones[tone]}`}><Icon className="size-5" /></span>
      <span><span className="block text-2xl font-semibold tracking-tight">{value}</span><span className="mt-0.5 block text-xs text-[var(--muted)]">{label}</span></span>
    </article>
  );
}
